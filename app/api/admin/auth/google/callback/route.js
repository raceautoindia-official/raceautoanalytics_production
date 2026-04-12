
import axios from "axios";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import db from "@/lib/db";
import crypto from "crypto";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Authorization code is missing" }, { status: 400 });
  }

  try {
    // 1. Exchange code for access token
    const { data } = await axios.post(
      "https://oauth2.googleapis.com/token",
      null,
      {
        params: {
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: `https://raceautoanalytics.com/api/admin/auth/google/callback`,
        },
      }
    );

    const { access_token } = data;

    // 2. Get user info
    const { data: userInfo } = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!userInfo || !userInfo.email) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // 3. Send user data to external API
    const externalResponse = await axios.post(
      "https://raceautoindia.com/api/admin/forecast-google-login",
      {
        username: userInfo.name,
        slug: userInfo.name.toLowerCase().split(" ").join("-"),
        email: userInfo.email,
        google_id: userInfo.sub,
      }
    );

    const externalUser = externalResponse.data?.user;

    if (!externalUser) {
      return NextResponse.json({ error: "User not authenticated via external API" }, { status: 401 });
    }

    // 4. Check session lock in local users table (upsert by email)
    const [localUsers] = await db.execute(
      "SELECT * FROM users WHERE email = ?",
      [externalUser.email]
    );

    let localUser;
    if (localUsers.length > 0) {
      localUser = localUsers[0];
    } else {
      const [result] = await db.execute(
        "INSERT INTO users (email) VALUES (?)",
        [externalUser.email]
      );
      localUser = { id: result.insertId, email: externalUser.email };
    }

    // Block login if an active session already exists on another device
    if (localUser.active_session_id && localUser.session_expires_at) {
      const expiresAt = new Date(localUser.session_expires_at);
      if (expiresAt > new Date()) {
        const blockedUrl = new URL("/", req.url);
        blockedUrl.searchParams.set(
          "error",
          "You are already logged in on another device. Please log out from that device first."
        );
        return NextResponse.redirect(blockedUrl);
      }
    }

    // Generate a new session ID and store it with a 7-day expiry
    const sessionId = crypto.randomUUID();
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.execute(
      "UPDATE users SET active_session_id = ?, session_expires_at = ?, last_login_at = NOW() WHERE id = ?",
      [sessionId, sessionExpiresAt, localUser.id]
    );

    // 5. Create JWT
    const token = jwt.sign(
      {
        id: externalUser.id,
        email: externalUser.email,
        role: externalUser.role,
        username: externalUser.username,
      },
      process.env.JWT_KEY,
      { expiresIn: "7d" }
    );

    const redirectUrl = new URL(`${process.env.NEXT_PUBLIC_BACKEND_URL}`, req.url);
    const response = NextResponse.redirect(redirectUrl);

    // 6. Set cookies
    response.cookies.set("authToken", token, {
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    response.cookies.set("profilePic", userInfo.picture, {
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;

  } catch (error) {
    console.error("Error authenticating:", error?.response?.data || error.message);
    return NextResponse.redirect(new URL("/", req.url));
  }
}
