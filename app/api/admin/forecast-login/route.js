import db from "@/lib/db";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import axios from "axios";
import {
  getPendingVerificationSteps,
  maskEmail,
  maskMobileNumber,
} from "@/lib/authVerification";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
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
      normalizedEmail,
    ]);

    let user = users.length > 0 ? users[0] : null;

    // Authenticate: local password hash takes priority (set via password reset)
    if (user?.password_hash) {
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
          { email: normalizedEmail, password }
        );
      } catch (extErr) {
        const msg =
          extErr?.response?.data?.message ||
          extErr?.response?.data?.error ||
          "Invalid credentials";
        return NextResponse.json({ message: msg }, { status: 401 });
      }
    }

    if (!user) {
      await db.execute("INSERT IGNORE INTO users (email) VALUES (?)", [
        normalizedEmail,
      ]);
      const [freshRows] = await db.execute(
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [normalizedEmail],
      );
      user = (freshRows || [])[0];
      if (!user) {
        return NextResponse.json(
          { message: "Unable to initialize user session" },
          { status: 500 },
        );
      }
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

    const mode = user.verification_mode;
    const emailVerified = Boolean(user.email_verified);
    const phoneVerified = Boolean(user.phone_verified);
    const pending = getPendingVerificationSteps(user);
    const verificationPayload = {
      error_code: "VERIFICATION_PENDING",
      verification_mode: mode || null,
      pending,
      email: user.email || null,
      mobile: user.mobile_number || null,
      masked_email: maskEmail(user.email),
      masked_mobile: maskMobileNumber(user.mobile_number),
    };

    if (mode === "email" && !emailVerified) {
      return NextResponse.json(
        {
          ...verificationPayload,
          error_code: "EMAIL_NOT_VERIFIED",
          message: "Please verify your email before logging in.",
        },
        { status: 403 }
      );
    }

    if (mode === "phone" && !phoneVerified) {
      return NextResponse.json(
        {
          ...verificationPayload,
          error_code: "PHONE_NOT_VERIFIED",
          message: "Please verify your mobile number before logging in.",
        },
        { status: 403 }
      );
    }

    if (mode === "both" && (!emailVerified || !phoneVerified)) {
      return NextResponse.json(
        {
          ...verificationPayload,
          error_code: "VERIFICATION_PENDING",
          message:
            "Please complete email and mobile verification before logging in.",
        },
        { status: 403 }
      );
    }

    // Generate a new session ID and store it with a 7-day expiry
    const sessionId = crypto.randomUUID();
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.execute(
      "UPDATE users SET active_session_id = ?, session_expires_at = ?, last_login_at = NOW() WHERE id = ?",
      [sessionId, sessionExpiresAt, user.id]
    );

    const token = jwt.sign(
      { id: user.id, email: normalizedEmail },
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
