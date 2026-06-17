import { NextResponse } from "next/server";
import db from "@/lib/db";
import { normalizeCountryKey } from "@/lib/flashReportCountry";

export const dynamic = "force-dynamic";

const CORE_COLUMNS = [
  "overall_graph_id",
  "pv_graph_id",
  "cv_graph_id",
  "tw_graph_id",
  "threew_graph_id",
  "tractor_graph_id",
  "truck_graph_id",
  "bus_graph_id",
  "ce_graph_id",
];

// Added by db/migrations/add_tipper_trailer_graph_ids.sql. Included in
// read/write only if they actually exist, so the mapping editor (and saving the
// other mappings) keeps working whether or not the migration has run yet.
const OPTIONAL_COLUMNS = ["tipper_graph_id", "trailer_graph_id"];

// Resolve the mapping columns that currently exist on flash_reports_text.
// Not cached: picks up the migration immediately on the next request without a
// server restart. The route is admin-only / low-traffic, so the lookup is cheap.
async function getMappingColumns(): Promise<string[]> {
  try {
    const [rows]: any = await db.query(
      `SELECT COLUMN_NAME FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'flash_reports_text'
         AND COLUMN_NAME IN (${OPTIONAL_COLUMNS.map(() => "?").join(", ")})`,
      OPTIONAL_COLUMNS,
    );
    const present = new Set(
      (Array.isArray(rows) ? rows : []).map((r: any) => String(r.COLUMN_NAME)),
    );
    return [...CORE_COLUMNS, ...OPTIONAL_COLUMNS.filter((c) => present.has(c))];
  } catch {
    return [...CORE_COLUMNS];
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawCountry = searchParams.get("country");
    const countryKey = normalizeCountryKey(rawCountry);

    const columns = await getMappingColumns();

    const [rows] = await db.query(
      `SELECT ${columns.join(", ")} FROM flash_reports_text WHERE country_key = ? LIMIT 1`,
      [countryKey],
    );

    if (Array.isArray(rows) && rows.length) {
      return NextResponse.json(rows[0]);
    }

    if (countryKey !== "india") {
      const [indiaRows] = await db.query(
        `SELECT ${columns.join(", ")} FROM flash_reports_text WHERE country_key = 'india' LIMIT 1`,
      );

      if (Array.isArray(indiaRows) && indiaRows.length) {
        return NextResponse.json(indiaRows[0]);
      }
    }

    return NextResponse.json({});
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load mapping" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const countryKey = normalizeCountryKey(body?.country);

    const columns = await getMappingColumns();

    const payload: Record<string, any> = {};
    for (const c of columns) {
      const v = body?.[c];
      payload[c] = v === "" || v == null ? null : Number(v);
      if (Number.isNaN(payload[c])) payload[c] = null;
    }

    const [existing] = await db.query(
      "SELECT id FROM flash_reports_text WHERE country_key = ? LIMIT 1",
      [countryKey],
    );

    const hasRow =
      Array.isArray(existing) && existing.length && existing[0]?.id != null;

    if (hasRow) {
      const sets = columns.map((c) => `${c} = ?`).join(", ");
      const values = columns.map((c) => payload[c]);

      await db.query(
        `UPDATE flash_reports_text SET ${sets}, updated_at = NOW() WHERE country_key = ?`,
        [...values, countryKey],
      );
    } else {
      const cols = ["country_key", ...columns].join(", ");
      const placeholders = ["?", ...columns.map(() => "?")].join(", ");
      const values = [countryKey, ...columns.map((c) => payload[c])];

      await db.query(
        `INSERT INTO flash_reports_text (${cols}) VALUES (${placeholders})`,
        values,
      );
    }

    return NextResponse.json({ ok: true, country: countryKey });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Save failed" },
      { status: 500 },
    );
  }
}