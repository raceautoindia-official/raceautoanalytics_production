import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const plan = (searchParams.get("plan") || "").trim();

    const conditions: string[] = [];
    const values: any[] = [];

    if (q) {
      conditions.push(`(email LIKE ? OR payment_id LIKE ?)`);
      values.push(`%${q}%`, `%${q}%`);
    }

    if (status) {
      conditions.push(`status = ?`);
      values.push(status);
    }

    if (plan) {
      conditions.push(`plan_name = ?`);
      values.push(plan);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows]: any = await db.execute(
      `
      SELECT
        id,
        email,
        remote_user_id,
        remote_subscription_id,
        payment_id,
        plan_name,
        status,
        start_date,
        end_date,
        synced_at,
        created_at
      FROM subscription_reference
      ${where}
      ORDER BY synced_at DESC
      `,
      values
    );

    return NextResponse.json({
      success: true,
      rows,
    });
  } catch (error) {
    console.error("admin subscription current fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch subscription reference" },
      { status: 500 }
    );
  }
}