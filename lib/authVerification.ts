import crypto from "crypto";

export type VerificationMode = "email" | "phone" | "both";

type VerificationRecord = {
  verification_mode?: string | null;
  email_verified?: number | boolean | null;
  phone_verified?: number | boolean | null;
};

function getIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const VERIFICATION_TOKEN_EXPIRY_MINUTES = getIntEnv(
  "EMAIL_VERIFICATION_EXPIRY_MINUTES",
  30,
);
export const OTP_EXPIRY_MINUTES = getIntEnv("OTP_EXPIRY_MINUTES", 10);
export const OTP_RESEND_COOLDOWN_SECONDS = getIntEnv(
  "OTP_RESEND_COOLDOWN_SECONDS",
  60,
);
export const OTP_MAX_ATTEMPTS = getIntEnv("OTP_MAX_ATTEMPTS", 5);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  if (name.length <= 2) return `${name[0] || "*"}*@${domain}`;
  return `${name[0]}${"*".repeat(Math.max(1, name.length - 2))}${name[name.length - 1]}@${domain}`;
}

export function normalizeMobileNumber(input: string): string | null {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  let cleaned = trimmed.replace(/[\s\-().]/g, "");

  if (cleaned.startsWith("00")) {
    cleaned = `+${cleaned.slice(2)}`;
  }

  if (cleaned.startsWith("+")) {
    cleaned = `+${cleaned.slice(1).replace(/\D/g, "")}`;
  } else {
    const digits = cleaned.replace(/\D/g, "");

    if (digits.length === 10) {
      cleaned = `+91${digits}`;
    } else if (digits.length >= 8 && digits.length <= 15) {
      cleaned = `+${digits}`;
    } else {
      return null;
    }
  }

  if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}

export function maskMobileNumber(input: string | null | undefined): string {
  if (!input) return "";
  const normalized = normalizeMobileNumber(input) || input;
  const digits = normalized.replace(/\D/g, "");
  if (digits.length < 4) return normalized;
  const suffix = digits.slice(-4);
  return `+**${"*".repeat(Math.max(2, digits.length - 6))}${suffix}`;
}

export function isVerificationMode(value: unknown): value is VerificationMode {
  return value === "email" || value === "phone" || value === "both";
}

export function generateVerificationToken(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function generateOtpCode(): string {
  const code = crypto.randomInt(0, 1_000_000);
  return code.toString().padStart(6, "0");
}

export function hashSecret(secret: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(secret, salt, 150000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

export function verifySecret(secret: string, stored: string | null | undefined): boolean {
  if (!stored || typeof stored !== "string" || !stored.includes(":")) {
    return false;
  }

  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;

  const actual = crypto
    .pbkdf2Sync(secret, salt, 150000, 64, "sha512")
    .toString("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(actual, "hex");

  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export function getPendingVerificationSteps(user: VerificationRecord): {
  requiresEmail: boolean;
  requiresPhone: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  pendingEmail: boolean;
  pendingPhone: boolean;
  completed: boolean;
} {
  const mode = (user.verification_mode ?? "") as VerificationMode | "";
  const emailVerified = Boolean(user.email_verified);
  const phoneVerified = Boolean(user.phone_verified);

  const requiresEmail = mode === "email" || mode === "both";
  const requiresPhone = mode === "phone" || mode === "both";

  const pendingEmail = requiresEmail && !emailVerified;
  const pendingPhone = requiresPhone && !phoneVerified;

  return {
    requiresEmail,
    requiresPhone,
    emailVerified,
    phoneVerified,
    pendingEmail,
    pendingPhone,
    completed: !pendingEmail && !pendingPhone,
  };
}

export function getSecondsRemaining(fromDate: Date | null, cooldownSec: number): number {
  if (!fromDate) return 0;
  const elapsedMs = Date.now() - fromDate.getTime();
  const remaining = cooldownSec - Math.floor(elapsedMs / 1000);
  return remaining > 0 ? remaining : 0;
}

export function buildVerificationEmailHtml(params: {
  username: string;
  verificationToken: string;
  verifyUrl?: string;
  expiresMinutes: number;
}): string {
  const escapedName = params.username.replace(/[<>"']/g, "");

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <h2 style="margin:0 0 12px;">Verify Your Email</h2>
      <p style="margin:0 0 12px;">Hi ${escapedName || "there"},</p>
      <p style="margin:0 0 12px;">
        Use this verification code to complete your signup:
      </p>
      <p style="font-size:24px;letter-spacing:1px;font-weight:700;margin:8px 0 16px;">${params.verificationToken}</p>
      ${
        params.verifyUrl
          ? `<p style="margin:0 0 16px;">
        You can also verify instantly using this secure link:
        <a href="${params.verifyUrl}" style="color:#2563eb;">Verify Email</a>
      </p>`
          : ""
      }
      <p style="margin:0 0 8px;color:#6b7280;">
        This code expires in ${params.expiresMinutes} minutes.
      </p>
      <p style="margin:0;color:#6b7280;">
        If you did not request this, you can safely ignore this email.
      </p>
    </div>
  `;
}
