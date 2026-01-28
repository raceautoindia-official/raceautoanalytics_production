import { NextResponse } from "next/server";
import db from "../../../lib/db";
import { parse, format, subMonths } from "date-fns";

// No need to parse percentages now
const parseValue = (val) => {
  const num = typeof val === "string" ? parseFloat(val.replace("%", "").trim()) : val;
  return isNaN(num) ? null : num;
};

function convertMonthStr(input) {
  try {
    const parsedDate = parse(input, "MMM-yy", new Date());
    return format(parsedDate, "yyyy-MM");
  } catch {
    return null;
  }
}

const normalizeMonth = (str) => str?.toLowerCase();

const findClosestMonth = (target, available, exclude = []) => {
  const targetDate = new Date(target);
  const targetTime = targetDate.getTime();

  const filtered = available
    .filter((month) => !exclude.some((ex) => normalizeMonth(ex) === normalizeMonth(month)))
    .map((month) => ({
      month,
      diff: Math.abs(new Date(month).getTime() - targetTime),
    }))
    .sort((a, b) => a.diff - b.diff);

  return filtered.length > 0 ? filtered[0].month : null;
};

const getAvailableMonths = async () => {
  const [rows] = await db.execute("SELECT DISTINCT month FROM overall_automative_industry_bar");
  // Convert months from DB "Aug-24" format to "yyyy-MM"
  return rows.map((r) => convertMonthStr(r.month)).filter(Boolean);
};

export async function GET() {
  try {
    const now = new Date();

const currentRaw = format(subMonths(now, 1), "yyyy-MM");     // previous month
const previousRaw = format(subMonths(now, 2), "yyyy-MM");    // two months before now
const lastYearRaw = format(subMonths(now, 13), "yyyy-MM");   // 13 months before now


    const availableMonths = await getAvailableMonths();

    if (availableMonths.length === 0) {
      return NextResponse.json(
        { message: "No available month data in DB" },
        { status: 404 }
      );
    }

    // Pick current month if exists else nearest
    const currentMonth = availableMonths.includes(currentRaw)
      ? currentRaw
      : findClosestMonth(currentRaw, availableMonths);

    // Previous month distinct from currentMonth
    const previousMonth =
      availableMonths.includes(previousRaw) && normalizeMonth(previousRaw) !== normalizeMonth(currentMonth)
        ? previousRaw
        : findClosestMonth(previousRaw, availableMonths, [currentMonth]);

    // Last year month distinct from both
    const lastYearMonth =
      availableMonths.includes(lastYearRaw) &&
      ![currentMonth, previousMonth].some((m) => normalizeMonth(m) === normalizeMonth(lastYearRaw))
        ? lastYearRaw
        : findClosestMonth(lastYearRaw, availableMonths, [currentMonth, previousMonth]);

    if (!currentMonth || !previousMonth || !lastYearMonth) {
      return NextResponse.json(
        { message: "Required month data not found" },
        { status: 404 }
      );
    }

    // Query the data for those months (stored in original DB format, so convert back)
    // We need to convert currentMonth, previousMonth, lastYearMonth (yyyy-MM) to original DB format (MMM-yy) for SQL filtering
    // Let's create a helper to convert yyyy-MM back to MMM-yy:
    function revertMonthFormat(ym) {
      const parsed = parse(ym, "yyyy-MM", new Date());
      return format(parsed, "MMM-yy");
    }

    const monthsForQuery = [lastYearMonth, previousMonth, currentMonth].map(revertMonthFormat);

    const [rows] = await db.execute(
      `SELECT 
         month,
         two_wheeler AS '2-wheeler',
         three_wheeler AS '3-wheeler',
         passenger,
         cv,
         tractor
       FROM overall_automative_industry_bar
       WHERE month IN (?, ?, ?)
       ORDER BY month ASC`,
      monthsForQuery
    );

    // Normalize output month format to "yyyy-MM"
    const result = rows.map((r) => ({
      ...r,
      month: convertMonthStr(r.month), // convert "Aug-24" → "2024-08"
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET API Error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const rawData = body.data;

    if (!Array.isArray(rawData)) {
      return NextResponse.json(
        { error: "Invalid data format: data must be an array" },
        { status: 400 }
      );
    }

    const months = Object.keys(rawData[0]).filter((key) => key !== "category");

    for (const month of months) {
      const row = {
        month,
        two_wheeler: null,
        three_wheeler: null,
        passenger: null,
        cv: null,
        tractor: null,
      };

      for (const record of rawData) {
        const category = record.category?.toLowerCase().replace(/-/g, "_");
        if (category in row) {
          row[category] = parseValue(record[month]);
        }
      }

      await db.execute(
        `INSERT INTO overall_automative_industry_bar
         (month, two_wheeler, three_wheeler, passenger, cv, tractor)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           two_wheeler = VALUES(two_wheeler),
           three_wheeler = VALUES(three_wheeler),
           passenger = VALUES(passenger),
           cv = VALUES(cv),
           tractor = VALUES(tractor)`,
        [
          month,
          row.two_wheeler,
          row.three_wheeler,
          row.passenger,
          row.cv,
          row.tractor,
        ]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DB Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
