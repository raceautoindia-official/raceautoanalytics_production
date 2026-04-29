import { NextResponse } from "next/server";
import db from "@/lib/db";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
  OTP_MAX_ATTEMPTS,
  getPendingVerificationSteps,
  normalizeEmail,
  verifySecret,
} from "@/lib/authVerification";

type VerifyUserRow = {
  id: number;
  verification_mode: string | null;
  email_verified: number | boolean;
  phone_verified: number | boolean;
  email_verification_token_hash: string | null;
  email_verification_expires_at: string | Date | null;
  otp_attempt_count: number | null;
};

type VerifyMeta = {
  userId: number;
  email: string;
  pending: {
    completed: boolean;
  };
};

async function verifyEmailByToken(email: string, tokenOrCode: string) {
  const [rows] = await db.execute(
    `SELECT id, verification_mode, email_verified, phone_verified,
            email_verification_token_hash, email_verification_expires_at,
            otp_attempt_count
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email],
  );

  const user = (rows as VerifyUserRow[])[0];

  if (!user) {
    return { status: 404, body: { message: "Account not found" } };
  }

  if (user.verification_mode !== "email" && user.verification_mode !== "both") {
    return {
      status: 400,
      body: { message: "Email verification is not enabled for this account" },
    };
  }

  if (user.email_verified) {
    const pending = getPendingVerificationSteps(user);
    return {
      status: 200,
      body: {
        message: "Email already verified",
        pending,
      },
      meta: { userId: user.id, email, pending },
    };
  }

  if ((user.otp_attempt_count || 0) >= OTP_MAX_ATTEMPTS) {
    return {
      status: 429,
      body: {
        message: "Maximum verification attempts reached. Please request a new email verification.",
      },
    };
  }

  if (
    !user.email_verification_token_hash ||
    !user.email_verification_expires_at ||
    new Date(user.email_verification_expires_at) < new Date()
  ) {
    return {
      status: 400,
      body: { message: "Verification code is invalid or expired. Please resend." },
    };
  }

  const isValid = verifySecret(tokenOrCode, user.email_verification_token_hash);

  if (!isValid) {
    await db.execute(
      "UPDATE users SET otp_attempt_count = COALESCE(otp_attempt_count, 0) + 1 WHERE id = ?",
      [user.id],
    );

    return {
      status: 400,
      body: { message: "Invalid verification code. Please try again." },
    };
  }

  await db.execute(
    `UPDATE users
     SET email_verified = 1,
         email_verification_token_hash = NULL,
         email_verification_expires_at = NULL,
         otp_attempt_count = 0,
         verified_at = CASE
            WHEN verification_mode = 'email' OR (verification_mode = 'both' AND phone_verified = 1)
            THEN NOW()
            ELSE verified_at
         END
     WHERE id = ?`,
    [user.id],
  );

  const [updatedRows] = await db.execute(
    "SELECT verification_mode, email_verified, phone_verified FROM users WHERE id = ? LIMIT 1",
    [user.id],
  );

  const updated = (updatedRows as VerifyUserRow[])[0];
  const pending = getPendingVerificationSteps(updated);

  return {
    status: 200,
    body: {
      message: "Email verified successfully",
      pending,
    },
    meta: { userId: user.id, email, pending },
  };
}

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
    const tokenOrCode =
      typeof body.token === "string"
        ? body.token.trim()
        : typeof body.code === "string"
          ? body.code.trim()
          : "";

    if (!email || !tokenOrCode) {
      return NextResponse.json(
        { message: "Email and 6-digit verification code are required" },
        { status: 400 },
      );
    }

    if (!/^\d{6}$/.test(tokenOrCode)) {
      return NextResponse.json(
        { message: "Please enter a valid 6-digit verification code." },
        { status: 400 },
      );
    }

    const result = await verifyEmailByToken(email, tokenOrCode);
    const meta = (result as { meta?: VerifyMeta }).meta;
    if (result.status !== 200 || !meta?.pending?.completed) {
      return NextResponse.json(result.body, { status: result.status });
    }

    const trial = await activateTrialIfEligible(meta.userId);
    const token = await createAuthSessionAndToken(meta.userId, meta.email);

    const response = NextResponse.json(
      {
        ...result.body,
        autoLoggedIn: true,
        trialActivated: trial.activated,
        trialExpiresAt: trial.activated ? trial.trialExpiresAt : null,
      },
      { status: result.status },
    );

    response.cookies.set("authToken", token, {
      path: "/",
      // sameSite=lax: see forecast-login/route.js for rationale.
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("POST /api/auth/verify-email error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = normalizeEmail(searchParams.get("email") || "");
    const token = (searchParams.get("token") || "").trim();

    if (!email || !token) {
      return NextResponse.redirect(new URL("/?emailVerification=invalid", req.url));
    }

    const result = await verifyEmailByToken(email, token);

    const redirect = new URL("/", req.url);
    redirect.searchParams.set(
      "emailVerification",
      result.status === 200 ? "success" : "failed",
    );
    redirect.searchParams.set("message", result.body.message);

    return NextResponse.redirect(redirect);
  } catch (error) {
    console.error("GET /api/auth/verify-email error:", error);
    return NextResponse.redirect(new URL("/?emailVerification=failed", req.url));
  }
}
