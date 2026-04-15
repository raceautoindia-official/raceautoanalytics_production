import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  fetchRaiForecastEntitlement,
  decodeJwtPayload,
} from "@/lib/internalSubscriptionFetch";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      );
    }

    const payload = decodeJwtPayload(token);
    if (!payload?.email) {
      return NextResponse.json(
        { error: "Invalid auth token" },
        { status: 401 },
      );
    }

    const entitlement = await fetchRaiForecastEntitlement(
      String(payload.email),
    );

    // Free-trial overlay: if user has no real paid plan, check for active trial
    if (!entitlement.isSubscribed) {
      try {
        const [rows] = await db.execute(
          "SELECT free_trial_expires_at FROM users WHERE email = ? LIMIT 1",
          [String(payload.email)],
        );
        const user = (rows as any[])[0];
        if (user?.free_trial_expires_at) {
          const expiresAt = new Date(user.free_trial_expires_at);
          if (expiresAt > new Date()) {
            // Trial is active — overlay platinum-level forecast access
            return NextResponse.json({
              ...entitlement,
              effectivePlan: "bronze",
              accessType: "trial",
              isSubscribed: true,
              effectiveStatus: "active",
              forecastRegionLimit: 1, // trial: India only
              hasDirectPlan: false,
              hasSharedPlan: false,
              trialActive: true,
              trialExpiresAt: expiresAt.toISOString(),
            });
          }
        }
      } catch (dbErr) {
        console.error("Trial check failed in forecast-entitlement:", dbErr);
      }
    }

    return NextResponse.json(entitlement);
  } catch (error: any) {
    console.error("GET /api/subscription/forecast-entitlement error:", error);
    return NextResponse.json(
      { error: "Failed to fetch forecast entitlement" },
      { status: 500 },
    );
  }
}
