import db from "@/lib/db";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
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

      user = {
        id: result.insertId,
        email,
      };
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_KEY,
      { expiresIn: "7d" }
    );

    // Encrypt the token using CryptoJS

    // Set the encrypted token as a cookie
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
