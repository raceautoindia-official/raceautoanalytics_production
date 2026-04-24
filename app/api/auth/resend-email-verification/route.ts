import { NextResponse } from "next/server";
import db from "@/lib/db";
import { sendEmail } from "@/lib/sendEmail";
import {
  OTP_RESEND_COOLDOWN_SECONDS,
  VERIFICATION_TOKEN_EXPIRY_MINUTES,
  buildVerificationEmailHtml,
  generateVerificationToken,
  getPendingVerificationSteps,
  getSecondsRemaining,
  hashSecret,
  normalizeEmail,
} from "@/lib/authVerification";

function getBaseUrl(req: Request): string {
  const explicit = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (explicit) return explicit;
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const [rows] = await db.execute(
      `SELECT id, email, verification_mode, email_verified, phone_verified,
              email_verification_expires_at
       FROM users WHERE email = ? LIMIT 1`,
      [email],
    );

    const user = (rows as any[])[0];

    if (!user) {
      return NextResponse.json({ message: "Account not found" }, { status: 404 });
    }

    if (user.verification_mode !== "email" && user.verification_mode !== "both") {
      return NextResponse.json(
        { message: "Email verification is not required for this account" },
        { status: 400 },
      );
    }

    if (user.email_verified) {
      return NextResponse.json(
        {
          message: "Email already verified",
          pending: getPendingVerificationSteps(user),
        },
        { status: 200 },
      );
    }

    const inferredSentAt = user.email_verification_expires_at
      ? new Date(
          new Date(user.email_verification_expires_at).getTime() -
            VERIFICATION_TOKEN_EXPIRY_MINUTES * 60 * 1000,
        )
      : null;

    const remaining = getSecondsRemaining(inferredSentAt, OTP_RESEND_COOLDOWN_SECONDS);
    if (remaining > 0) {
      return NextResponse.json(
        {
          message: `Please wait ${remaining}s before resending email verification.`,
          retryAfterSeconds: remaining,
        },
        { status: 429 },
      );
    }

    const verificationToken = generateVerificationToken();
    const tokenHash = hashSecret(verificationToken);
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await db.execute(
      `UPDATE users
       SET email_verification_token_hash = ?,
           email_verification_expires_at = ?,
           otp_attempt_count = 0
       WHERE id = ?`,
      [tokenHash, expiresAt, user.id],
    );

    const baseUrl = getBaseUrl(req);
    const verifyUrl = `${baseUrl}/api/auth/verify-email?email=${encodeURIComponent(
      email,
    )}&token=${encodeURIComponent(verificationToken)}`;

    await sendEmail({
      to: email,
      subject: "Your new email verification code",
      html: buildVerificationEmailHtml({
        username: "",
        verificationToken,
        verifyUrl,
        expiresMinutes: VERIFICATION_TOKEN_EXPIRY_MINUTES,
      }),
      text: `Verification code: ${verificationToken}. It expires in ${VERIFICATION_TOKEN_EXPIRY_MINUTES} minutes.`,
    });

    return NextResponse.json({
      message: "Verification email sent",
      retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    });
  } catch (error) {
    console.error("POST /api/auth/resend-email-verification error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
