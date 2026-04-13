import { NextResponse } from "next/server";

/**
 * Forgot password is handled by Race Auto India, not Race Auto Analytics.
 * This endpoint is intentionally disabled.
 * Users must reset their password at https://raceautoindia.com
 */
export async function POST() {
  return NextResponse.json(
    {
      message:
        "Password reset is managed by Race Auto India. Please visit raceautoindia.com to reset your password.",
    },
    { status: 410 },
  );
}
