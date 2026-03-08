import db from "@/lib/db";
import { NextResponse } from "next/server";

function toNullableNumber(value: any) {
  if (value === null || value === undefined || value === "") return null;
  const cleaned = String(value).replace(/,/g, "").trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rows = body?.rows;

    if (!Array.isArray(rows)) {
      return NextResponse.json(
        { success: false, message: "rows array is required" },
        { status: 400 }
      );
    }

    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      for (const row of rows) {
        if (!row?.id || !row?.plan) continue;

        await conn.execute(
          `
          INSERT INTO subscription_plan_reference
          (
            remote_plan_id,
            plan,
            platinum,
            gold,
            silver,
            bronze,
            description,
            raw_payload
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            plan = VALUES(plan),
            platinum = VALUES(platinum),
            gold = VALUES(gold),
            silver = VALUES(silver),
            bronze = VALUES(bronze),
            description = VALUES(description),
            raw_payload = VALUES(raw_payload),
            synced_at = CURRENT_TIMESTAMP
          `,
          [
            Number(row.id),
            String(row.plan),
            toNullableNumber(row.platinum),
            toNullableNumber(row.gold),
            toNullableNumber(row.silver),
            toNullableNumber(row.bronze),
            row.description ? String(row.description) : null,
            JSON.stringify(row),
          ]
        );
      }

      await conn.commit();

      return NextResponse.json({
        success: true,
        message: "Plans synced successfully",
        count: rows.length,
      });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("sync-plans error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to sync plans" },
      { status: 500 }
    );
  }
}