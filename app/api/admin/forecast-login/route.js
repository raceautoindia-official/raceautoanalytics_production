import db from "@/lib/db";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import axios from "axios";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }
    if (!password) {
      return NextResponse.json(
        { message: "Password is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    let user;

    if (users.length > 0) {
      user = users[0];
    } else {
      // Insert new user
      const [result] = await db.execute(
        "INSERT INTO users (email) VALUES (?)",
        [email]
      );
      user = { id: result.insertId, email };
    }

    // Block login if an active session already exists on another device
    if (user.active_session_id && user.session_expires_at) {
      const expiresAt = new Date(user.session_expires_at);
      if (expiresAt > new Date()) {
        return NextResponse.json(
          {
            message:
              "You are already logged in on another device. Please log out from that device first.",
          },
          { status: 409 }
        );
      }
    }

    // Authenticate: local password hash takes priority (set via password reset)
    if (user.password_hash) {
      const [salt, storedHash] = user.password_hash.split(":");
      const incoming = crypto
        .pbkdf2Sync(password, salt, 100000, 64, "sha512")
        .toString("hex");
      if (incoming !== storedHash) {
        return NextResponse.json(
          { message: "Invalid credentials" },
          { status: 401 }
        );
      }
    } else {
      // Fall back to external auth for users who have not reset password locally
      try {
        await axios.post(
          "https://raceautoindia.com/api/admin/forecast-auth",
          { email, password }
        );
      } catch (extErr) {
        const msg =
          extErr?.response?.data?.message ||
          extErr?.response?.data?.error ||
          "Invalid credentials";
        return NextResponse.json({ message: msg }, { status: 401 });
      }
    }

    // Generate a new session ID and store it with a 7-day expiry
    const sessionId = crypto.randomUUID();
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.execute(
      "UPDATE users SET active_session_id = ?, session_expires_at = ?, last_login_at = NOW() WHERE id = ?",
      [sessionId, sessionExpiresAt, user.id]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_KEY,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json({ message: "Login successful" });
    response.cookies.set("authToken", token, {
      path: "/",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
