import { format, subMonths, addMonths } from "date-fns";
import { NextResponse } from "next/server";
import db from "@/lib/db"; // adjust path as needed

// Format to "Mon-YY" like "May-25"
const formatMonthKey = (date) => format(date, "MMM-yy");

const normalize = (m) => m.toLowerCase();

const getAvailableMonths = async () => {
  const [rows] = await db.execute(
    "SELECT DISTINCT month FROM commercial_segment_line"
  );
  return rows.map((r) => r.month);
};

export async function GET() {
  try {
    const now = new Date();
    const available = await getAvailableMonths();

    if (!available || available.length === 0) {
      return NextResponse.json(
        { message: "No available months found in DB" },
        { status: 404 }
      );
    }

    const normAvail = available.map(normalize);

    // Step 1: Try current month first, fallback to previous available month if needed
    let currentRaw = formatMonthKey(now);
    let currentIndex = -1;

    if (!normAvail.includes(normalize(currentRaw))) {
      for (let i = 1; i <= 12; i++) {
        const check = formatMonthKey(subMonths(now, i));
        const idx = normAvail.indexOf(normalize(check));
        if (idx !== -1) {
          currentRaw = available[idx];
          currentIndex = idx;
          break;
        }
      }

      if (currentIndex === -1) {
        return NextResponse.json(
          { message: "No usable month found in DB" },
          { status: 404 }
        );
      }
    }

    // Use the actual DB-cased month value
    const normalizedCurrent = normalize(currentRaw);
    currentRaw =
      available.find((m) => normalize(m) === normalizedCurrent) || currentRaw;

    // Step 2: Get up to 3 months before and after
    const allSorted = [...available].sort((a, b) => {
      return new Date("01-" + a).getTime() - new Date("01-" + b).getTime();
    });

    const currIndex = allSorted.findIndex(
      (m) => normalize(m) === normalizedCurrent
    );

    const finalMonths = allSorted.slice(
      Math.max(0, currIndex - 3),
      currIndex + 6
    ); // 3 before, current, 3 after

    // Step 3: Fetch only those
    const [rows] = await db.execute(
      `SELECT 
         month,
         hcv,
         mcv,
         lcv
       FROM commercial_segment_line
       WHERE month IN (${finalMonths.map(() => "?").join(",")})
       ORDER BY month ASC`,
      finalMonths
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const records = body.data;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { message: "No valid data provided" },
        { status: 400 }
      );
    }

    const parseValue = (val) => {
      if (val === undefined || val === null) return null;
      if (typeof val === "string") {
        const num = parseFloat(val.replace("%", "").trim());
        return isNaN(num) ? null : num;
      }
      return typeof val === "number" ? val : null;
    };

    for (const record of records) {
      const month = record["month"]?.trim();

      if (!month) continue;

      const values = [
        month,
        parseValue(record["hcv"]),
        parseValue(record["mcv"]),
        parseValue(record["lcv"]),
      ];

      await db.execute(
        `INSERT INTO commercial_segment_line 
        (month, hcv, mcv, lcv)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          hcv = VALUES(hcv),
          mcv = VALUES(mcv),
          lcv = VALUES(lcv)`,
        values
      );
    }

    return NextResponse.json(
      { message: "Data uploaded successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
