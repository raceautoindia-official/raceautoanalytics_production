import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [rows] = await db.execute(
      `SELECT id, title, body, icon, theme, sort_order
       FROM home_optional_insights
       WHERE is_active = 1
       ORDER BY sort_order ASC, id ASC`
    );
    return NextResponse.json(rows);
  } catch (e: any) {
    console.error("[home-content/optional-insights][GET]", e);
    return NextResponse.json([]);
  }
}
