import db from "@/lib/db";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const authTokenMatch = cookieHeader.match(/(?:^|;\s*)authToken=([^;]+)/);
    const token = authTokenMatch ? authTokenMatch[1] : null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        const email = decoded.email;

        if (email) {
          await db.execute(
            "UPDATE users SET active_session_id = NULL, session_expires_at = NULL WHERE email = ?",
            [email]
          );
        }
      } catch {
        // Token invalid or expired — session already gone, nothing to clear
      }
    }

    const response = NextResponse.json({ message: "Logged out" });
    response.cookies.set("authToken", "", {
      path: "/",
      sameSite: "Strict",
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
