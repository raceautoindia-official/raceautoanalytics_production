import { NextResponse } from "next/server";
import db from "../../../lib/db";

// Escape MySQL column names
const escapeColumn = (name) => `\`${name.replace(/[^a-zA-Z0-9_]/g, "_")}\``;

// Convert "11.85%" -> 11.85 (number)
const parsePercentage = (val) => {
  if (typeof val === "string") {
    const cleaned = val.replace("%", "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  if (typeof val === "number") return val;
  return null;
};

const formatMonth = (date) => {
  return (
    date.toLocaleString("en-US", { month: "short" }).replace(".", "") +
    "_" +
    String(date.getFullYear()).slice(2)
  );
};

const normalize = (col) => col?.toLowerCase();
const includesNormalized = (target, list) =>
  list.some((col) => normalize(col) === normalize(target));

const columnToTimestamp = (col) => {
  const [mon, yr] = col.split("_");
  const month = new Date(`${mon} 1, 2000`).getMonth(); // Locale-safe
  const year = 2000 + parseInt(yr, 10);
  return new Date(year, month).getTime();
};

const findClosestAvailable = (target, available, exclude = []) => {
  const validCols = available.filter((col) => /^\w{3}_\d{2}$/.test(col));
  const targetTime = columnToTimestamp(target);

  const sorted = validCols
    .filter((col) => !exclude.some((ex) => normalize(ex) === normalize(col)))
    .map((col) => ({
      col,
      diff: Math.abs(columnToTimestamp(col) - targetTime),
    }))
    .sort((a, b) => a.diff - b.diff);

  return sorted.length > 0 ? sorted[0].col : null;
};

const getAvailableColumns = async (tableName) => {
  const [cols] = await db.execute(`SHOW COLUMNS FROM ${tableName}`);
  return cols.map((col) => col.Field);
};

export async function GET() {
  try {
    const tableName = "truck_ev";
    const today = new Date();

    const currentMonthRaw = formatMonth(
      new Date(today.getFullYear(), today.getMonth() - 1, 1)
    );
    const previousMonthRaw = formatMonth(
      new Date(today.getFullYear(), today.getMonth() - 2, 1)
    );
    const lastYearMonthRaw = formatMonth(
      new Date(today.getFullYear() - 1, today.getMonth() - 1, 1)
    );

    const availableCols = await getAvailableColumns(tableName);

    // Logging for debug

    const currentMonth = includesNormalized(currentMonthRaw, availableCols)
      ? currentMonthRaw
      : findClosestAvailable(currentMonthRaw, availableCols);

    const previousMonth =
      includesNormalized(previousMonthRaw, availableCols) &&
      normalize(previousMonthRaw) !== normalize(currentMonth)
        ? previousMonthRaw
        : findClosestAvailable(previousMonthRaw, availableCols, [currentMonth]);

    const lastYearMonth =
      includesNormalized(lastYearMonthRaw, availableCols) &&
      ![currentMonth, previousMonth].some(
        (m) => normalize(lastYearMonthRaw) === normalize(m)
      )
        ? lastYearMonthRaw
        : findClosestAvailable(lastYearMonthRaw, availableCols, [
            currentMonth,
            previousMonth,
          ]);

    if (!currentMonth || !previousMonth || !lastYearMonth) {
      return NextResponse.json(
        { message: "Required data columns not found" },
        { status: 404 }
      );
    }

    const query = `
      SELECT company_name,
             \`${lastYearMonth}\` AS lastYear,
             \`${previousMonth}\` AS previousMonth,
             \`${currentMonth}\` AS currentMonth
      FROM ${tableName};
    `;

    const [rows] = await db.execute(query);

    const result = rows.map((row) => ({
      name: row.company_name,
      [lastYearMonth]: parseFloat(row.lastYear),
      [previousMonth]: parseFloat(row.previousMonth),
      [currentMonth]: parseFloat(row.currentMonth),
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("❌ Error fetching OEM share data:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const rawData = body.data;

    if (!Array.isArray(rawData) || rawData.length === 0) {
      return NextResponse.json(
        { message: "No data provided" },
        { status: 400 }
      );
    }

    const monthSums = {}; // Track sum per month
    const companyEntries = []; // Store cleaned company data for insert

    for (const row of rawData) {
      const company_name = row["company name"]?.trim();
      const status = 0;

      const months = {};
      for (const key in row) {
        if (key !== "company name") {
          months[key] = parsePercentage(row[key]);
        }
      }

      if (!company_name || Object.keys(months).length === 0) {
        continue;
      }

      for (const [month, val] of Object.entries(months)) {
        if (val === null) continue;
        const normalizedMonth = month.trim();
        monthSums[normalizedMonth] = (monthSums[normalizedMonth] || 0) + val;
      }

      companyEntries.push({ company_name, status, months });
    }

    // Validate: Each month's sum must be <= 100
    for (const [month, total] of Object.entries(monthSums)) {
      if (total > 100.01) {
        return NextResponse.json(
          {
            message: `Total for month "${month}" exceeds 100% (got ${total.toFixed(
              2
            )}%). Please fix the Excel data.`,
          },
          { status: 400 }
        );
      }
    }

    // Ensure dynamic month columns exist
    const allMonths = Object.keys(monthSums);
    for (const monthKey of allMonths) {
      const safeColumn = monthKey.replace(/[^a-zA-Z0-9_]/g, "_");
      const [cols] = await db.execute(
        `SHOW COLUMNS FROM truck_ev LIKE '${safeColumn}'`
      );
      if (cols.length === 0) {
        await db.execute(
          `ALTER TABLE truck_ev ADD COLUMN ${escapeColumn(
            monthKey
          )} FLOAT DEFAULT 0`
        );
      }
    }

    // Insert each company row
    for (const { company_name, status, months } of companyEntries) {
      const filteredMonths = Object.fromEntries(
        Object.entries(months).filter(([_, val]) => val !== null)
      );

      const monthColumns = Object.keys(filteredMonths).map(escapeColumn);
      const values = Object.values(filteredMonths);

      const updateSet = [
        `status = VALUES(status)`,
        ...monthColumns.map((col) => `${col} = VALUES(${col})`),
      ].join(", ");

      const insertQuery = `
        INSERT INTO truck_ev (company_name, status, ${monthColumns.join(", ")})
        VALUES (?, ?, ${monthColumns.map(() => "?").join(", ")})
        ON DUPLICATE KEY UPDATE ${updateSet}
      `;

      await db.execute(insertQuery, [company_name, status, ...values]);
    }

    return NextResponse.json(
      { message: "Data saved successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST Error:", error);
    return NextResponse.json(
      { message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}
