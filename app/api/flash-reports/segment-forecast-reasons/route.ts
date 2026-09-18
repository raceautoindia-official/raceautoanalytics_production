import { NextResponse } from "next/server";
import db from "@/lib/db";
import { normalizeCountryKey } from "@/lib/flashReportCountry";

export const dynamic = "force-dynamic";

/**
 * Rationale rows shown under the segment forecast share chart: per OEM, a rank
 * and a short written explanation of the forecast.
 *
 * Read-only and public to the same audience as the chart above it. Content is
 * maintained in the CMS (Flash Reports → Forecast Rationale).
 *
 * Table: flash_segment_forecast_reasons
 * (db/migrations/flash_segment_forecast_reasons.sql)
 */

/**
 * "passenger vehicle" -> "passenger-vehicle".
 *
 * Deliberately does NOT singularise: stripping a trailing "s" turns the "bus"
 * segment into "bu". Both sides (the page and the CMS editor) pass the same
 * segment strings, so no plural folding is needed.
 */
export function normalizeSegmentKey(raw: string | null) {
  return String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

/** "2026-09" if it looks like a month, otherwise "" (the default set). */
export function normalizeMonthKey(raw: string | null) {
  const s = String(raw || "").trim();
  return /^\d{4}-\d{2}$/.test(s) ? s : "";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const country = normalizeCountryKey(searchParams.get("country")) || "india";
    const segment = normalizeSegmentKey(searchParams.get("segment"));
    const month = normalizeMonthKey(searchParams.get("month"));

    if (!segment) {
      return NextResponse.json({ reasons: [] });
    }

    const load = async (monthKey: string) => {
      const [rows] = await db.query(
        `SELECT rank_index, oem_name, description
           FROM flash_segment_forecast_reasons
          WHERE country_key = ? AND segment_key = ? AND month_key = ?
          ORDER BY rank_index ASC, oem_name ASC`,
        [country, segment, monthKey],
      );
      return Array.isArray(rows) ? rows : [];
    };

    // Month-specific copy when it exists, otherwise the default set — so an
    // editor only has to write per-month text where it actually differs.
    let rows = month ? await load(month) : [];
    const usedMonth = rows.length ? month : "";
    if (!rows.length) rows = await load("");

    const reasons = rows.map((r: any) => ({
      rank: Number(r.rank_index) || 0,
      oem: String(r.oem_name || "").trim(),
      description: String(r.description || "").trim(),
    }));

    return NextResponse.json({
      country,
      segment,
      month,
      // Which set was actually served: the month's own copy, or the default.
      source: usedMonth ? "month" : "default",
      reasons,
    });
  } catch (e: any) {
    // A missing table must not take the page down — the section simply hides.
    if (e?.code === "ER_NO_SUCH_TABLE") {
      return NextResponse.json({ reasons: [] });
    }
    console.error("GET /api/flash-reports/segment-forecast-reasons error:", e);
    return NextResponse.json({ reasons: [] }, { status: 200 });
  }
}
