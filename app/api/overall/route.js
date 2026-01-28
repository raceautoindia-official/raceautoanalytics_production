import db from "@/lib/db";
import { NextResponse } from "next/server";
import { format, subMonths, parse } from "date-fns";

// No need to parse percentages now
const parseValue = (val) => {
  const num =
    typeof val === "string" ? parseFloat(val.replace("%", "").trim()) : val;
  return isNaN(num) ? null : num;
};

export async function GET() {
  try {
    const now = new Date();

    // Set center to previous month (e.g., if today is June, use May)
    const centerDate = subMonths(now, 1);
    const centerMonthStr = format(centerDate, "MMM-yy");

    // Get all months from the DB
    const [allMonthsResult] = await db.execute(
      `SELECT month FROM overall_automative_industry_line`
    );

    const monthsDates = allMonthsResult
      .map(({ month }) => {
        const parsed = parse(month, "MMM-yy", new Date());
        return { month, date: parsed };
      })
      .filter(({ date }) => !isNaN(date))
      .sort((a, b) => a.date - b.date); // Sort ascending

    // Find the index of the intended center month
    let centerIndex = monthsDates.findIndex(
      ({ date }) => format(date, "MMM-yy") === centerMonthStr
    );

    // Fallback to nearest month before centerDate if not found
    if (centerIndex === -1) {
      const fallback = monthsDates.filter(({ date }) => date < centerDate);
      if (fallback.length === 0) {
        centerIndex = 0;
      } else {
        const latestBefore = fallback.reduce((a, b) =>
          a.date > b.date ? a : b
        );
        centerIndex = monthsDates.findIndex(
          (entry) => entry.month === latestBefore.month
        );
      }
    }

    // Get up to 10 months: 3 before, center, and 6 after
    const startIndex = Math.max(0, centerIndex - 3);
    const endIndex = Math.min(monthsDates.length, centerIndex + 7); // inclusive of center

    const selectedMonths = monthsDates
      .slice(startIndex, endIndex)
      .map(({ month }) => month);

    if (selectedMonths.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Build SQL placeholders (?, ?, ?...) for selected months
    const placeholders = selectedMonths.map(() => "?").join(", ");
    const [rows] = await db.execute(
      `
      SELECT 
        month,
        two_wheeler AS '2-wheeler',
        three_wheeler AS '3-wheeler',
        passenger,
        cv,
        tractor,
        truck,
        bus,
        total
      FROM overall_automative_industry_line
      WHERE month IN (${placeholders})
      ORDER BY STR_TO_DATE(CONCAT('01-', month), '%d-%b-%y') ASC
      `,
      selectedMonths
    );

    const formattedRows = rows.map((row) => {
      const parsedDate = parse(row.month, "MMM-yy", new Date());
      return {
        ...row,
        month: format(parsedDate, "yyyy-MM"),
      };
    });

    return NextResponse.json(formattedRows);
  } catch (error) {
    console.error("Fetch Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const rawData = body.data; // rawData is in transposed format (months as columns)

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
        truck: null,
        bus: null,
        total: null,
      };

      for (const record of rawData) {
        const category = record.category?.toLowerCase().replace(/-/g, "_");
        if (category in row) {
          row[category] = parseValue(record[month]);
        }
      }

      await db.execute(
        `INSERT INTO overall_automative_industry_line
         (month, two_wheeler, three_wheeler, passenger, cv, tractor, truck, bus, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           two_wheeler = VALUES(two_wheeler),
           three_wheeler = VALUES(three_wheeler),
           passenger = VALUES(passenger),
           cv = VALUES(cv),
           tractor = VALUES(tractor),
           truck = VALUES(truck),
           bus = VALUES(bus),
           total = VALUES(total)`,
        [
          month,
          row.two_wheeler,
          row.three_wheeler,
          row.passenger,
          row.cv,
          row.tractor,
          row.truck,
          row.bus,
          row.total,
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
