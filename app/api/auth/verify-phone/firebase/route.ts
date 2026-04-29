import { NextResponse } from "next/server";
import db from "@/lib/db";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getFirebaseAdminAuth } from "@/lib/firebaseAdmin";
import {
  getPendingVerificationSteps,
  normalizeEmail,
  normalizeMobileNumber,
} from "@/lib/authVerification";

type PhoneVerifyUser = {
  id: number;
  verification_mode: string | null;
  email_verified: number | boolean;
  phone_verified: number | boolean;
};

async function activateTrialIfEligible(userId: number) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

  const [result] = await db.execute(
    `UPDATE users
     SET free_trial_started_at = ?,
         free_trial_expires_at = ?,
         last_login_at = NOW()
     WHERE id = ?
       AND free_trial_used = 1
       AND free_trial_started_at IS NULL
       AND free_trial_expires_at IS NULL`,
    [now, expiresAt, userId],
  );

  return {
    activated: Number((result as { affectedRows?: number })?.affectedRows || 0) > 0,
    trialExpiresAt: expiresAt.toISOString(),
  };
}

async function createAuthSessionAndToken(userId: number, email: string) {
  // DB lock TTL is intentionally short (2 hours) so stranded sessions
  // self-heal — see forecast-login/route.js for the full rationale.
  const sessionId = crypto.randomUUID();
  const sessionExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

  await db.execute(
    "UPDATE users SET active_session_id = ?, session_expires_at = ?, last_login_at = NOW() WHERE id = ?",
    [sessionId, sessionExpiresAt, userId],
  );

  const token = jwt.sign(
    { id: userId, email },
    process.env.JWT_KEY as string,
    { expiresIn: "7d" },
  );

  return token;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const idToken = typeof body.idToken === "string" ? body.idToken.trim() : "";

    if (!email || !idToken) {
      return NextResponse.json(
        { message: "Email and Firebase token are required" },
        { status: 400 },
      );
    }

    const adminAuth = getFirebaseAdminAuth();
    const decoded = await adminAuth.verifyIdToken(idToken, true);

    const expectedProject = process.env.FIREBASE_PROJECT_ID;
    if (expectedProject && decoded.aud !== expectedProject) {
      return NextResponse.json({ message: "Invalid Firebase project token" }, { status: 401 });
    }

    if (!decoded.phone_number) {
      return NextResponse.json(
        { message: "Firebase token does not include phone number" },
        { status: 400 },
      );
    }

    const normalizedPhone = normalizeMobileNumber(decoded.phone_number);
    if (!normalizedPhone) {
      return NextResponse.json({ message: "Invalid verified phone number" }, { status: 400 });
    }

    const [userRows] = await db.execute(
      `SELECT id, verification_mode, email_verified, phone_verified
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email],
    );

    const user = (userRows as PhoneVerifyUser[])[0];
    if (!user) {
      return NextResponse.json({ message: "Account not found" }, { status: 404 });
    }

    if (user.verification_mode !== "phone" && user.verification_mode !== "both") {
      return NextResponse.json(
        { message: "Phone verification is not required for this account" },
        { status: 400 },
      );
    }

    const [duplicateRows] = await db.execute(
      `SELECT id FROM users WHERE mobile_number = ? AND id <> ? LIMIT 1`,
      [normalizedPhone, user.id],
    );

    if ((duplicateRows as PhoneVerifyUser[]).length > 0) {
      return NextResponse.json(
        { message: "This mobile number is already linked to another account." },
        { status: 409 },
      );
    }

    await db.execute(
      `UPDATE users
       SET mobile_number = ?,
           phone_verified = 1,
           phone_otp_hash = NULL,
           phone_otp_expires_at = NULL,
           otp_attempt_count = 0,
           verified_at = CASE
             WHEN verification_mode = 'phone' OR (verification_mode = 'both' AND email_verified = 1)
             THEN NOW()
             ELSE verified_at
           END
       WHERE id = ?`,
      [normalizedPhone, user.id],
    );

    const [updatedRows] = await db.execute(
      "SELECT verification_mode, email_verified, phone_verified FROM users WHERE id = ? LIMIT 1",
      [user.id],
    );

    const updated = (updatedRows as PhoneVerifyUser[])[0];

    const pending = getPendingVerificationSteps(updated);
    if (!pending.completed) {
      return NextResponse.json({
        message: "Phone verified successfully",
        mobile: normalizedPhone,
        pending,
      });
    }

    const trial = await activateTrialIfEligible(user.id);
    const token = await createAuthSessionAndToken(user.id, email);

    const response = NextResponse.json({
      message: "Phone verified successfully",
      mobile: normalizedPhone,
      pending,
      autoLoggedIn: true,
      trialActivated: trial.activated,
      trialExpiresAt: trial.activated ? trial.trialExpiresAt : null,
    });

    response.cookies.set("authToken", token, {
      path: "/",
      // sameSite=lax: see forecast-login/route.js for rationale.
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: unknown) {
    console.error("POST /api/auth/verify-phone/firebase error:", error);

    const code = (error as { code?: string } | null)?.code || "";
    if (code.startsWith("auth/")) {
      return NextResponse.json(
        { message: "Unable to verify Firebase token. Please try again." },
        { status: 401 },
      );
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
