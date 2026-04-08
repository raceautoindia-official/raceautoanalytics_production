import { NextResponse } from "next/server";
import db from "@/lib/db";
import { normalizeCountryKey } from "@/lib/flashReportCountry";

export const dynamic = "force-dynamic";

const COLUMNS = [
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawCountry = searchParams.get("country");
    const countryKey = normalizeCountryKey(rawCountry);

    const [rows] = await db.query(
      `SELECT ${COLUMNS.join(", ")} FROM flash_reports_text WHERE country_key = ? LIMIT 1`,
      [countryKey],
    );

    if (Array.isArray(rows) && rows.length) {
      return NextResponse.json(rows[0]);
    }

    if (countryKey !== "india") {
      const [indiaRows] = await db.query(
        `SELECT ${COLUMNS.join(", ")} FROM flash_reports_text WHERE country_key = 'india' LIMIT 1`,
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

    const payload: Record<string, any> = {};
    for (const c of COLUMNS) {
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
      const sets = COLUMNS.map((c) => `${c} = ?`).join(", ");
      const values = COLUMNS.map((c) => payload[c]);

      await db.query(
        `UPDATE flash_reports_text SET ${sets}, updated_at = NOW() WHERE country_key = ?`,
        [...values, countryKey],
      );
    } else {
      const cols = ["country_key", ...COLUMNS].join(", ");
      const placeholders = ["?", ...COLUMNS.map(() => "?")].join(", ");
      const values = [countryKey, ...COLUMNS.map((c) => payload[c])];

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