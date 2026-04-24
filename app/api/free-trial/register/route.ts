import { NextResponse } from "next/server";
import axios from "axios";
import crypto from "crypto";
import db from "@/lib/db";
import { sendEmail } from "@/lib/sendEmail";
import { userWelcomeEmail } from "@/lib/emailTemplates";
import {
  OTP_RESEND_COOLDOWN_SECONDS,
  VERIFICATION_TOKEN_EXPIRY_MINUTES,
  buildVerificationEmailHtml,
  generateVerificationToken,
  getPendingVerificationSteps,
  getSecondsRemaining,
  hashSecret,
  isVerificationMode,
  maskEmail,
  maskMobileNumber,
  normalizeEmail,
  normalizeMobileNumber,
} from "@/lib/authVerification";

export const dynamic = "force-dynamic";

const FREE_TRIAL_SECONDS = 5 * 60;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

type TrialUserRow = {
  id: number;
  email: string;
  mobile_number: string | null;
  password_hash: string | null;
  verification_mode: string | null;
  email_verified: number | boolean;
  phone_verified: number | boolean;
  free_trial_used: number | boolean;
  free_trial_started_at: string | Date | null;
  free_trial_expires_at: string | Date | null;
  otp_last_sent_at: string | Date | null;
  email_verification_expires_at: string | Date | null;
};

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(32).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";
    const phoneInput = typeof body.phone === "string" ? body.phone : "";
    const verificationMode = body.verificationMode;

    if (!name) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 });
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
    if (!isVerificationMode(verificationMode)) {
      return NextResponse.json(
        { message: "Verification mode must be email, phone, or both" },
        { status: 400 },
      );
    }

    const requiresPhone = verificationMode === "phone" || verificationMode === "both";
    const normalizedPhone = phoneInput ? normalizeMobileNumber(phoneInput) : null;

    if (requiresPhone && !normalizedPhone) {
      return NextResponse.json(
        { message: "A valid mobile number is required for selected verification mode" },
        { status: 400 },
      );
    }
    if (phoneInput && !normalizedPhone) {
      return NextResponse.json({ message: "Invalid phone number" }, { status: 400 });
    }

    const [existingRows] = await db.execute(
      `SELECT id, email, mobile_number, password_hash, verification_mode, email_verified, phone_verified,
              free_trial_used, free_trial_started_at, free_trial_expires_at,
              otp_last_sent_at, email_verification_expires_at
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email],
    );

    const existingUser = (existingRows as TrialUserRow[])[0];

    if (existingUser && existingUser.password_hash) {
      const pending = getPendingVerificationSteps(existingUser);
      if (existingUser.free_trial_used && !pending.completed) {
        const emailSentAt = existingUser?.email_verification_expires_at
          ? new Date(
              new Date(existingUser.email_verification_expires_at).getTime() -
                VERIFICATION_TOKEN_EXPIRY_MINUTES * 60 * 1000,
            )
          : null;

        return NextResponse.json(
          {
            message: "Your account is already created. Complete verification to activate trial access.",
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
                existingUser?.otp_last_sent_at
                  ? new Date(existingUser.otp_last_sent_at)
                  : null,
                OTP_RESEND_COOLDOWN_SECONDS,
              ),
            },
          },
          { status: 409 },
        );
      }

      if (existingUser.free_trial_used) {
        return NextResponse.json(
          {
            message: "This email has already availed free access. Please log in.",
            code: "TRIAL_ALREADY_USED",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          message:
            "An account with this email already exists. Please log in to continue.",
          code: "ACCOUNT_EXISTS",
        },
        { status: 409 },
      );
    }

    if (existingUser && existingUser.free_trial_used) {
      return NextResponse.json(
        {
          message: "This email has already availed free access. Please log in.",
          code: "TRIAL_ALREADY_USED",
        },
        { status: 409 },
      );
    }

    try {
      await axios.post("https://raceautoindia.com/api/admin/forecast-auth-register", {
        username: name,
        email,
        password,
        confirmPassword: password,
      });
    } catch (externalError: unknown) {
      const status = (externalError as { response?: { status?: number } } | null)?.response?.status || 400;
      if (status !== 409) {
        const message =
          (externalError as { response?: { data?: { message?: string; error?: string } } } | null)?.response?.data?.message ||
          (externalError as { response?: { data?: { message?: string; error?: string } } } | null)?.response?.data?.error ||
          "Unable to register account";
        return NextResponse.json({ message }, { status });
      }
    }

    const passwordHash = hashPassword(password);
    const now = new Date();

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

    const createdNewUser = !existingUser;
    let userId = existingUser?.id ?? null;
    if (userId) {
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
             verified_at = NULL,
             free_trial_used = 1,
             free_trial_started_at = NULL,
             free_trial_expires_at = NULL,
             free_trial_name = ?,
             free_trial_phone = ?,
             active_session_id = NULL,
             session_expires_at = NULL,
             last_login_at = NULL
         WHERE id = ?`,
        [
          passwordHash,
          normalizedPhone,
          verificationMode,
          emailVerified,
          phoneVerified,
          emailVerificationTokenHash,
          emailVerificationExpiresAt,
          name,
          normalizedPhone,
          userId,
        ],
      );
    } else {
      const [insertResult] = await db.execute(
        `INSERT INTO users
           (email, password_hash, mobile_number, verification_mode, email_verified, phone_verified,
            email_verification_token_hash, email_verification_expires_at,
            phone_otp_hash, phone_otp_expires_at, otp_last_sent_at, otp_attempt_count, verified_at,
            free_trial_used, free_trial_started_at, free_trial_expires_at,
            free_trial_name, free_trial_phone, active_session_id, session_expires_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, 0, NULL, 1, NULL, NULL, ?, ?, NULL, NULL, NULL)`,
        [
          email,
          passwordHash,
          normalizedPhone,
          verificationMode,
          emailVerified,
          phoneVerified,
          emailVerificationTokenHash,
          emailVerificationExpiresAt,
          name,
          normalizedPhone,
        ],
      );

      userId = (insertResult as { insertId?: number }).insertId || null;
    }

    if (!userId) {
      return NextResponse.json({ message: "Unable to complete signup right now." }, { status: 500 });
    }

    if ((verificationMode === "email" || verificationMode === "both") && emailVerificationToken) {
      const reqUrl = new URL(req.url);
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || `${reqUrl.protocol}//${reqUrl.host}`;
      const verifyUrl = `${baseUrl}/api/auth/verify-email?email=${encodeURIComponent(
        email,
      )}&token=${encodeURIComponent(emailVerificationToken)}`;

      await sendEmail({
        to: email,
        subject: "Verify your Race Auto Analytics email",
        html: buildVerificationEmailHtml({
          username: name,
          verificationToken: emailVerificationToken,
          verifyUrl,
          expiresMinutes: VERIFICATION_TOKEN_EXPIRY_MINUTES,
        }),
        text: `Verification code: ${emailVerificationToken}. It expires in ${VERIFICATION_TOKEN_EXPIRY_MINUTES} minutes.`,
      });
    }

    if (createdNewUser) {
      try {
        const welcomeTemplate = userWelcomeEmail({ email, name });
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
        console.error("Welcome email failed for free-trial register:", welcomeError);
      }
    }

    const [userRows] = await db.execute(
      "SELECT verification_mode, email_verified, phone_verified, otp_last_sent_at, email_verification_expires_at FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
    const user = (userRows as TrialUserRow[])[0];
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
        mobile: normalizedPhone,
        verificationMode,
        pending,
        trialSeconds: FREE_TRIAL_SECONDS,
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
  } catch (err: unknown) {
    console.error("POST /api/free-trial/register error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
