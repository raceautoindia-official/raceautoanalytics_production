import { NextResponse } from "next/server";
import axios from "axios";
import crypto from "crypto";
import db from "@/lib/db";
import { sendEmail } from "@/lib/sendEmail";
import { userWelcomeEmail } from "@/lib/emailTemplates";
import {
  VERIFICATION_TOKEN_EXPIRY_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
  generateVerificationToken,
  getPendingVerificationSteps,
  hashSecret,
  isVerificationMode,
  maskEmail,
  maskMobileNumber,
  normalizeEmail,
  normalizeMobileNumber,
  getSecondsRemaining,
  buildVerificationEmailHtml,
} from "@/lib/authVerification";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(32).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

function getBaseUrl(req: Request): string {
  const explicit = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (explicit) return explicit;
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const username = typeof body.username === "string" ? body.username.trim() : "";
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";
    const confirmPassword =
      typeof body.confirmPassword === "string" ? body.confirmPassword : "";
    const verificationMode = body.verificationMode;
    const mobileInput = typeof body.mobile === "string" ? body.mobile : "";

    if (!username) {
      return NextResponse.json({ message: "Username is required" }, { status: 400 });
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ message: "A valid email is required" }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ message: "Passwords must match" }, { status: 400 });
    }

    if (!isVerificationMode(verificationMode)) {
      return NextResponse.json(
        { message: "Verification mode must be email, phone, or both" },
        { status: 400 },
      );
    }

    const requiresPhone = verificationMode === "phone" || verificationMode === "both";
    const normalizedMobile = mobileInput ? normalizeMobileNumber(mobileInput) : null;

    if (requiresPhone && !normalizedMobile) {
      return NextResponse.json(
        { message: "A valid mobile number is required for selected verification mode" },
        { status: 400 },
      );
    }

    if (mobileInput && !normalizedMobile) {
      return NextResponse.json({ message: "Invalid mobile number" }, { status: 400 });
    }

    const [existingRows] = await db.execute(
      `SELECT id, email, mobile_number, password_hash, verification_mode, email_verified, phone_verified,
              otp_last_sent_at, email_verification_expires_at
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email],
    );

    const existingUser = (existingRows as any[])[0];

    if (existingUser && existingUser.password_hash) {
      const pending = getPendingVerificationSteps(existingUser);
      if (!pending.completed && existingUser.verification_mode) {
        const emailSentAt = existingUser?.email_verification_expires_at
          ? new Date(
              new Date(existingUser.email_verification_expires_at).getTime() -
                VERIFICATION_TOKEN_EXPIRY_MINUTES * 60 * 1000,
            )
          : null;

        return NextResponse.json(
          {
            message: "Your account is already created. Complete verification to continue.",
            error_code: "VERIFICATION_PENDING",
            verificationMode: existingUser.verification_mode,
            email,
            mobile: existingUser.mobile_number,
            maskedEmail: maskEmail(existingUser.email),
            maskedMobile: maskMobileNumber(existingUser.mobile_number),
            pending,
            cooldowns: {
              emailResendSeconds: getSecondsRemaining(
                emailSentAt,
                OTP_RESEND_COOLDOWN_SECONDS,
              ),
              otpResendSeconds: getSecondsRemaining(
                existingUser?.otp_last_sent_at ? new Date(existingUser.otp_last_sent_at) : null,
                OTP_RESEND_COOLDOWN_SECONDS,
              ),
            },
          },
          { status: 409 },
        );
      }

      return NextResponse.json({ message: "Account already exists." }, { status: 409 });
    }

    try {
      await axios.post("https://raceautoindia.com/api/admin/forecast-auth-register", {
        username,
        email,
        password,
        confirmPassword,
      });
    } catch (externalError: any) {
      const message =
        externalError?.response?.data?.message ||
        externalError?.response?.data?.error ||
        "Unable to register account";
      const status = externalError?.response?.status || 400;
      return NextResponse.json({ message }, { status });
    }

    const now = new Date();
    const passwordHash = hashPassword(password);

    let emailVerificationToken: string | null = null;
    let emailVerificationTokenHash: string | null = null;
    let emailVerificationExpiresAt: Date | null = null;

    if (verificationMode === "email" || verificationMode === "both") {
      emailVerificationToken = generateVerificationToken();
      emailVerificationTokenHash = hashSecret(emailVerificationToken);
      emailVerificationExpiresAt = new Date(
        now.getTime() + VERIFICATION_TOKEN_EXPIRY_MINUTES * 60 * 1000,
      );
    }

    const emailVerified = verificationMode === "phone" ? 1 : 0;
    const phoneVerified = verificationMode === "email" ? 1 : 0;

    let userId = existingUser?.id;

    const createdNewUser = !existingUser;

    if (existingUser) {
      await db.execute(
        `UPDATE users
         SET password_hash = ?,
             mobile_number = ?,
             verification_mode = ?,
             email_verified = ?,
             phone_verified = ?,
             email_verification_token_hash = ?,
             email_verification_expires_at = ?,
             phone_otp_hash = NULL,
             phone_otp_expires_at = NULL,
             otp_last_sent_at = NULL,
             otp_attempt_count = 0,
             verified_at = NULL
         WHERE id = ?`,
        [
          passwordHash,
          normalizedMobile,
          verificationMode,
          emailVerified,
          phoneVerified,
          emailVerificationTokenHash,
          emailVerificationExpiresAt,
          userId,
        ],
      );
    } else {
      const [insertRes] = await db.execute(
        `INSERT INTO users (
          email,
          password_hash,
          mobile_number,
          verification_mode,
          email_verified,
          phone_verified,
          email_verification_token_hash,
          email_verification_expires_at,
          phone_otp_hash,
          phone_otp_expires_at,
          otp_last_sent_at,
          otp_attempt_count,
          verified_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)`,
        [
          email,
          passwordHash,
          normalizedMobile,
          verificationMode,
          emailVerified,
          phoneVerified,
          emailVerificationTokenHash,
          emailVerificationExpiresAt,
          null,
          null,
          null,
        ],
      );

      userId = (insertRes as any).insertId;
    }

    if ((verificationMode === "email" || verificationMode === "both") && emailVerificationToken) {
      const baseUrl = getBaseUrl(req);
      const verifyUrl = `${baseUrl}/api/auth/verify-email?email=${encodeURIComponent(
        email,
      )}&token=${encodeURIComponent(emailVerificationToken)}`;

      await sendEmail({
        to: email,
        subject: "Verify your Race Auto Analytics email",
        html: buildVerificationEmailHtml({
          username,
          verificationToken: emailVerificationToken,
          verifyUrl,
          expiresMinutes: VERIFICATION_TOKEN_EXPIRY_MINUTES,
        }),
        text: `Verification code: ${emailVerificationToken}. It expires in ${VERIFICATION_TOKEN_EXPIRY_MINUTES} minutes.`,
      });
    }

    if (createdNewUser) {
      try {
        const welcomeTemplate = userWelcomeEmail({ email, name: username });
        await sendEmail({
          to: email,
          subject: welcomeTemplate.subject,
          html: welcomeTemplate.html,
          text: welcomeTemplate.text,
        });
        await db.execute(
          "UPDATE users SET welcome_email_sent_at = NOW() WHERE id = ? AND welcome_email_sent_at IS NULL",
          [userId],
        );
      } catch (welcomeError) {
        console.error("Welcome email failed for auth register:", welcomeError);
      }
    }

    const [userRows] = await db.execute(
      "SELECT verification_mode, email_verified, phone_verified, otp_last_sent_at, email_verification_expires_at FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
    const user = (userRows as any[])[0];

    const pending = getPendingVerificationSteps(user);
    const emailSentAt = user?.email_verification_expires_at
      ? new Date(
          new Date(user.email_verification_expires_at).getTime() -
            VERIFICATION_TOKEN_EXPIRY_MINUTES * 60 * 1000,
        )
      : null;

    return NextResponse.json(
      {
        message: "Signup successful. Verification required.",
        email,
        mobile: normalizedMobile,
        verificationMode,
        pending,
        cooldowns: {
          emailResendSeconds: getSecondsRemaining(
            emailSentAt,
            OTP_RESEND_COOLDOWN_SECONDS,
          ),
          otpResendSeconds: getSecondsRemaining(
            user?.otp_last_sent_at ? new Date(user.otp_last_sent_at) : null,
            OTP_RESEND_COOLDOWN_SECONDS,
          ),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
