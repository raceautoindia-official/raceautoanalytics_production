import { NextResponse } from "next/server";
import db from "@/lib/db";
import crypto from "crypto";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

const FREE_TRIAL_SECONDS = 80;

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

    const { name, email, phone, password } = body;

    // --- Validation ---
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return NextResponse.json({ message: "A valid email is required" }, { status: 400 });
    }
    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json({ message: "Phone number is required" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // --- Check for existing account ---
    const [existing] = await db.execute(
      "SELECT id, free_trial_used, free_trial_expires_at FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail],
    );
    const existingUser = (existing as any[])[0];

    if (existingUser) {
      // Account exists — never create a duplicate
      if (existingUser.free_trial_used) {
        return NextResponse.json(
          {
            message: "This email has already availed free access. Please log in.",
            code: "TRIAL_ALREADY_USED",
          },
          { status: 409 },
        );
      }
      // Account exists but trial not yet used — still, don't create duplicate
      return NextResponse.json(
        {
          message:
            "An account with this email already exists. Please log in to continue.",
          code: "ACCOUNT_EXISTS",
        },
        { status: 409 },
      );
    }

    // --- Create new user account ---
    const passwordHash = hashPassword(password);
    const now = new Date();
    const trialExpiresAt = new Date(now.getTime() + FREE_TRIAL_SECONDS * 1000);

    const [insertResult] = await db.execute(
      `INSERT INTO users
         (email, password_hash, free_trial_used, free_trial_started_at,
          free_trial_expires_at, free_trial_name, free_trial_phone, last_login_at)
       VALUES (?, ?, 1, ?, ?, ?, ?, NOW())`,
      [
        normalizedEmail,
        passwordHash,
        now,
        trialExpiresAt,
        name.trim(),
        phone.trim(),
      ],
    );

    const userId = (insertResult as any).insertId;

    // --- Create login session (same logic as forecast-login route) ---
    const sessionId = crypto.randomUUID();
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.execute(
      "UPDATE users SET active_session_id = ?, session_expires_at = ? WHERE id = ?",
      [sessionId, sessionExpiresAt, userId],
    );

    const token = jwt.sign(
      { id: userId, email: normalizedEmail },
      process.env.JWT_KEY as string,
      { expiresIn: "7d" },
    );

    const response = NextResponse.json({
      ok: true,
      trialExpiresAt: trialExpiresAt.toISOString(),
      trialSeconds: FREE_TRIAL_SECONDS,
    });

    response.cookies.set("authToken", token, {
      path: "/",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    console.error("POST /api/free-trial/register error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
