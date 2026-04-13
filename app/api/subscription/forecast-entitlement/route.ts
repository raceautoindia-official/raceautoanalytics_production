import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  fetchRaiForecastEntitlement,
  decodeJwtPayload,
} from "@/lib/internalSubscriptionFetch";

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
    return NextResponse.json(entitlement);
  } catch (error: any) {
    console.error("GET /api/subscription/forecast-entitlement error:", error);
    return NextResponse.json(
      { error: "Failed to fetch forecast entitlement" },
      { status: 500 },
    );
  }
}
