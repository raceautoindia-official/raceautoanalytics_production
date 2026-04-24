import { NextResponse } from "next/server";
import db from "@/lib/db";
import {
  getPendingVerificationSteps,
  maskEmail,
  maskMobileNumber,
  normalizeEmail,
  normalizeMobileNumber,
} from "@/lib/authVerification";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const mobileRaw = typeof body.mobile === "string" ? body.mobile : "";
    const mobile = mobileRaw ? normalizeMobileNumber(mobileRaw) : null;

    if (!email && !mobile) {
      return NextResponse.json(
        { message: "Email or mobile is required" },
        { status: 400 },
      );
    }

    const query = email
      ? `SELECT id, email, mobile_number, verification_mode, email_verified, phone_verified
         FROM users
         WHERE email = ?
         LIMIT 1`
      : `SELECT id, email, mobile_number, verification_mode, email_verified, phone_verified
         FROM users
         WHERE mobile_number = ?
         LIMIT 1`;

    const [rows] = await db.execute(query, [email || mobile]);
    const user = (rows as any[])[0];

    if (!user) {
      return NextResponse.json({
        exists: false,
        verificationRequired: false,
      });
    }

    const pending = getPendingVerificationSteps(user);

    return NextResponse.json({
      exists: true,
      verificationMode: user.verification_mode || null,
      emailVerified: Boolean(user.email_verified),
      phoneVerified: Boolean(user.phone_verified),
      pending,
      verificationRequired: !pending.completed,
      email: user.email,
      mobile: user.mobile_number,
      maskedEmail: maskEmail(user.email),
      maskedMobile: maskMobileNumber(user.mobile_number),
    });
  } catch (error) {
    console.error("POST /api/auth/verification-status error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
