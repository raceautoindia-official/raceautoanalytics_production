import db from "@/lib/db";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { sendEmail } from "@/lib/sendEmail";
import { passwordResetEmail } from "@/lib/emailTemplates";

const NEUTRAL_MSG =
  "If an account exists for this email, a reset link has been sent.";

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    // Always return neutral message to avoid revealing whether email exists
    const [users] = await db.execute(
      "SELECT id, email FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return NextResponse.json({ message: NEUTRAL_MSG });
    }

    const user = users[0];

    // Generate a secure random token; store its SHA-256 hash in the DB
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.execute(
      "UPDATE users SET reset_password_token = ?, reset_password_expires_at = ? WHERE id = ?",
      [tokenHash, expiresAt, user.id]
    );

    const base =
      process.env.APP_BASE_URL || "https://raceautoanalytics.com";
    const resetUrl = `${base}/reset-password?token=${rawToken}`;

    const { subject, html, text } = passwordResetEmail({
      email: user.email,
      resetUrl,
    });
    await sendEmail({ to: user.email, subject, html, text });

    return NextResponse.json({ message: NEUTRAL_MSG });
  } catch (err) {
    console.error("Forgot password error:", err);
    // Still return neutral message even on error
    return NextResponse.json({ message: NEUTRAL_MSG });
  }
}
