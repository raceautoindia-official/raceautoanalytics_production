import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [rows] = await db.execute(
      `SELECT id, tag, delta, title, body, publish_date, sort_order
       FROM home_latest_insights
       WHERE is_active = 1
       ORDER BY sort_order ASC, publish_date DESC, id DESC
       LIMIT 12`
    );
    return NextResponse.json(rows);
  } catch (e: any) {
    console.error("[home-content/latest-insights][GET]", e);
    return NextResponse.json([]);
  }
}
