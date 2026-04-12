import db from "@/lib/db";
import { NextResponse } from "next/server";
import crypto from "crypto";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

export async function POST(req) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { message: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Hash the incoming raw token to compare with the stored hash
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const [users] = await db.execute(
      "SELECT id, reset_password_expires_at FROM users WHERE reset_password_token = ?",
      [tokenHash]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { message: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    const user = users[0];

    if (
      !user.reset_password_expires_at ||
      new Date(user.reset_password_expires_at) < new Date()
    ) {
      return NextResponse.json(
        {
          message:
            "This reset link has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(password);

    // Store new password hash and clear the reset token
    await db.execute(
      `UPDATE users
         SET password_hash = ?,
             reset_password_token = NULL,
             reset_password_expires_at = NULL,
             active_session_id = NULL,
             session_expires_at = NULL
       WHERE id = ?`,
      [passwordHash, user.id]
    );

    return NextResponse.json({
      message: "Password reset successful. You can now log in with your new password.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
