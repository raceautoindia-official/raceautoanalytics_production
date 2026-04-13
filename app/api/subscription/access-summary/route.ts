import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  fetchRaiAccessSummary,
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

    const summary = await fetchRaiAccessSummary(String(payload.email));
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("GET /api/subscription/access-summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch access summary" },
      { status: 500 },
    );
  }
}
