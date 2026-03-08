import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [rows]: any = await db.execute(`
      SELECT
        id,
        remote_plan_id,
        plan,
        platinum,
        gold,
        silver,
        bronze,
        description,
        synced_at,
        created_at
      FROM subscription_plan_reference
      ORDER BY remote_plan_id ASC
    `);

    return NextResponse.json({
      success: true,
      rows,
    });
  } catch (error) {
    console.error("admin subscription plans fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch subscription plan reference" },
      { status: 500 }
    );
  }
}