import db from "@/lib/db";
import { NextResponse } from "next/server";
import { format, subMonths, addMonths } from "date-fns";

// POST: Insert or update records
export async function POST(req) {
  try {
    // const body = await req.json();
    // const records = body.data;

    if (!Array.isArray(records)) {
      return NextResponse.json(
        { error: "Invalid data format: data must be an array" },
        { status: 400 }
      );
    }

    const safeValue = (v) => (v === undefined ? null : v);

    for (const record of records) {
      const {
        month,
        "2-wheeler": twoW = null,
        "3-wheeler": threeW = null,
        passenger = null,
        cv = null,
        tractor = null,
        total = null,
      } = record;

      if (!month) continue;

      // Check if month exists
      const [rows] = await db.execute(
        `SELECT 1 FROM overall_automative_industry_line WHERE month = ? LIMIT 1`,
        [month]
      );

      if (rows.length === 0) {
        console.log(`Month ${month} does not exist, skipping update.`);
        continue;
      }

      // Perform update
      await db.execute(
        `UPDATE overall_automative_industry_line
         SET 
           two_wheeler = ?, 
           three_wheeler = ?, 
           passenger = ?, 
           cv = ?, 
           tractor = ?, 
           total = ?
         WHERE month = ?`,
        [
          safeValue(twoW),
          safeValue(threeW),
          safeValue(passenger),
          safeValue(cv),
          safeValue(tractor),
          safeValue(total),
          month,
        ]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DB Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const now = new Date();
    const currentMonth = format(now, "yyyy-MM");

    const startMonth = format(subMonths(now, 3), "yyyy-MM");
    const endMonth = format(addMonths(now, 3), "yyyy-MM");

    const [rows] = await db.execute(
      `SELECT 
         month,
         two_wheeler AS '2-wheeler',
         three_wheeler AS '3-wheeler',
         passenger,
         cv,
         tractor,
         total
       FROM overall_line_chart
       WHERE month >= ? AND month <= ?
       ORDER BY month ASC`,
      [startMonth, endMonth]
    );
    console.log(rows);
    return NextResponse.json(rows); // frontend expects an array directly
  } catch (error) {
    console.error("Fetch Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
