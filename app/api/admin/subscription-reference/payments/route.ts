import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const plan = (searchParams.get("plan") || "").trim();
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 25), 1), 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];

    if (q) {
      conditions.push(
        `(email LIKE ? OR razorpay_order_id LIKE ? OR razorpay_payment_id LIKE ?)`
      );
      values.push(`%${q}%`, `%${q}%`, `%${q}%`);
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

    const [countRows]: any = await db.execute(
      `SELECT COUNT(*) as total FROM payment_reference_log ${where}`,
      values
    );

    const [rows]: any = await db.execute(
      `
      SELECT
        id,
        email,
        remote_user_id,
        plan_name,
        duration,
        amount,
        razorpay_order_id,
        razorpay_payment_id,
        status,
        message,
        created_at,
        updated_at
      FROM payment_reference_log
      ${where}
      ORDER BY id DESC
      LIMIT ${limit} OFFSET ${offset}
      `,
      values
    );

    return NextResponse.json({
      success: true,
      rows,
      pagination: {
        page,
        limit,
        total: countRows?.[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("admin subscription payments fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch payment reference log" },
      { status: 500 }
    );
  }
}