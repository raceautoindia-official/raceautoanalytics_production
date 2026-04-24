import { NextResponse } from "next/server";
import db from "@/lib/db";
import {
  OTP_MAX_ATTEMPTS,
  getPendingVerificationSteps,
  normalizeEmail,
  verifySecret,
} from "@/lib/authVerification";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
    const otp = typeof body?.otp === "string" ? body.otp.trim() : "";

    if (!email || !otp) {
      return NextResponse.json({ message: "Email and OTP are required" }, { status: 400 });
    }

    const [rows] = await db.execute(
      `SELECT id, verification_mode, email_verified, phone_verified,
              phone_otp_hash, phone_otp_expires_at, otp_attempt_count
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email],
    );

    const user = (rows as any[])[0];

    if (!user) {
      return NextResponse.json({ message: "Account not found" }, { status: 404 });
    }

    if (user.verification_mode !== "phone" && user.verification_mode !== "both") {
      return NextResponse.json(
        { message: "Phone verification is not enabled for this account" },
        { status: 400 },
      );
    }

    if (user.phone_verified) {
      return NextResponse.json(
        {
          message: "Phone already verified",
          pending: getPendingVerificationSteps(user),
        },
        { status: 200 },
      );
    }

    if ((user.otp_attempt_count || 0) >= OTP_MAX_ATTEMPTS) {
      return NextResponse.json(
        { message: "Maximum OTP attempts reached. Please request a new OTP." },
        { status: 429 },
      );
    }

    if (!user.phone_otp_hash || !user.phone_otp_expires_at) {
      return NextResponse.json(
        { message: "No active OTP found. Please request a new OTP." },
        { status: 400 },
      );
    }

    if (new Date(user.phone_otp_expires_at) < new Date()) {
      return NextResponse.json(
        { message: "OTP has expired. Please request a new OTP." },
        { status: 400 },
      );
    }

    const valid = verifySecret(otp, user.phone_otp_hash);

    if (!valid) {
      await db.execute(
        "UPDATE users SET otp_attempt_count = COALESCE(otp_attempt_count, 0) + 1 WHERE id = ?",
        [user.id],
      );

      return NextResponse.json({ message: "Invalid OTP. Please try again." }, { status: 400 });
    }

    await db.execute(
      `UPDATE users
       SET phone_verified = 1,
           phone_otp_hash = NULL,
           phone_otp_expires_at = NULL,
           otp_attempt_count = 0,
           verified_at = CASE
              WHEN verification_mode = 'phone' OR (verification_mode = 'both' AND email_verified = 1)
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

    const updated = (updatedRows as any[])[0];

    return NextResponse.json({
      message: "Phone verified successfully",
      pending: getPendingVerificationSteps(updated),
    });
  } catch (error) {
    console.error("POST /api/auth/phone/verify-otp error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
