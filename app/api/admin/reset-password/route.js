import { NextResponse } from "next/server";

/**
 * Reset password is handled by Race Auto India, not Race Auto Analytics.
 * This endpoint is intentionally disabled.
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

