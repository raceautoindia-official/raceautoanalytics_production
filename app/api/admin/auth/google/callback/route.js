
import axios from "axios";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

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

    // 4. Create JWT
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

    // 5. Set cookies
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
