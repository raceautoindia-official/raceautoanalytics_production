import { NextResponse } from "next/server";
import db from "@/lib/db";
import crypto from "crypto";
import axios from "axios";

// Recovery endpoint for users whose DB session lock survived their last logout
// (cookie cleared by browser cleanup / ITP / extension / network failure during
// logout, etc). Requires the correct password — same validation as the login
// route — so a stale lock cannot be cleared by anyone who only knows the email.
//
// On success: clears active_session_id + session_expires_at, returns 200.
// The client then immediately retries the login flow.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 },
      );
    }

    const [rows]: any = await db.execute(
      "SELECT id, password_hash FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    const user = rows?.[0] ?? null;

    if (!user) {
      // Same response for "no such email" and "wrong password" so this endpoint
      // can't be used to enumerate registered emails.
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Re-validate password using the SAME logic as forecast-login/route.js:
    // local hash takes priority, fall back to external auth.
    let passwordOk = false;
    if (user.password_hash) {
      const [salt, storedHash] = String(user.password_hash).split(":");
      if (salt && storedHash) {
        const incoming = crypto
          .pbkdf2Sync(password, salt, 100000, 64, "sha512")
          .toString("hex");
        passwordOk = incoming === storedHash;
      }
    } else {
      try {
        await axios.post(
          "https://raceautoindia.com/api/admin/forecast-auth",
          { email, password },
        );
        passwordOk = true;
      } catch {
        passwordOk = false;
      }
    }

    if (!passwordOk) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Clear the lock. Don't issue a new session here — the client will call
    // the normal login endpoint right after this succeeds.
    await db.execute(
      "UPDATE users SET active_session_id = NULL, session_expires_at = NULL WHERE id = ?",
      [user.id],
    );

    return NextResponse.json({ message: "Session cleared" });
  } catch (err) {
    console.error("force-clear-session error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
