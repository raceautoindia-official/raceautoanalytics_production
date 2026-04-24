import { NextResponse } from "next/server";
import db from "@/lib/db";
import { sendOtpCode } from "@/lib/otpProvider";
import {
  OTP_EXPIRY_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
  generateOtpCode,
  getSecondsRemaining,
  hashSecret,
  normalizeEmail,
} from "@/lib/authVerification";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const [rows] = await db.execute(
      `SELECT id, mobile_number, verification_mode, phone_verified, otp_last_sent_at
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
        { message: "Phone verification is not required for this account" },
        { status: 400 },
      );
    }

    if (user.phone_verified) {
      return NextResponse.json({ message: "Phone already verified" }, { status: 200 });
    }

    if (!user.mobile_number) {
      return NextResponse.json({ message: "Mobile number not found for account" }, { status: 400 });
    }

    const remaining = getSecondsRemaining(
      user.otp_last_sent_at ? new Date(user.otp_last_sent_at) : null,
      OTP_RESEND_COOLDOWN_SECONDS,
    );

    if (remaining > 0) {
      return NextResponse.json(
        {
          message: `Please wait ${remaining}s before resending OTP.`,
          retryAfterSeconds: remaining,
        },
        { status: 429 },
      );
    }

    const otp = generateOtpCode();
    const otpHash = hashSecret(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await db.execute(
      `UPDATE users
       SET phone_otp_hash = ?,
           phone_otp_expires_at = ?,
           otp_last_sent_at = NOW(),
           otp_attempt_count = 0
       WHERE id = ?`,
      [otpHash, expiresAt, user.id],
    );

    const otpResult = await sendOtpCode({ phoneNumber: user.mobile_number, otpCode: otp });

    if (!otpResult.ok) {
      return NextResponse.json(
        {
          message: otpResult.error || "Unable to resend OTP right now. Please try again shortly.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      message: "OTP resent successfully",
      retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    });
  } catch (error) {
    console.error("POST /api/auth/phone/resend-otp error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
