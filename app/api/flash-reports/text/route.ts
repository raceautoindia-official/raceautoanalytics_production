import { NextResponse } from "next/server";
import db from "@/lib/db";
import { normalizeCountryKey } from "@/lib/flashReportCountry";

export const dynamic = "force-dynamic";

async function getCountryTextRow(countryKey: string) {
  const [rows] = await db.query(
    `
    SELECT *
    FROM flash_reports_text
    WHERE country_key = ?
    LIMIT 1
    `,
    [countryKey],
  );

  return Array.isArray(rows) && rows.length ? (rows as any)[0] : null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawCountry =
      searchParams.get("country") || searchParams.get("region");
    const countryKey = normalizeCountryKey(rawCountry);

    let row = await getCountryTextRow(countryKey);

    if (!row && countryKey !== "india") {
      row = await getCountryTextRow("india");
    }

    return NextResponse.json(row || {});
  } catch (e: any) {
    console.error("GET /api/flash-reports/text error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to load flash report text" },
      { status: 500 },
    );
  }
}