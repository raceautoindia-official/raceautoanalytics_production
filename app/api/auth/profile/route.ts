import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";
import { decodeJwtPayload } from "@/lib/internalSubscriptionFetch";

export const dynamic = "force-dynamic";

/**
 * Returns minimal authenticated user profile fields needed by client widgets
 * (currently: email + mobile_number for Razorpay prefill).
 *
 * Auth: reads `authToken` cookie, verifies with JWT_KEY.
 * Returns 401 if missing/invalid.
 */
export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("authToken")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = decodeJwtPayload(token);
    const email = payload?.email ? String(payload.email) : null;
    if (!email) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const [rows]: any = await db.execute(
      "SELECT email, mobile_number FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    const user = rows?.[0] ?? null;
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      email: user.email,
      mobile_number: user.mobile_number ?? null,
    });
  } catch (err) {
    console.error("GET /api/auth/profile error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
