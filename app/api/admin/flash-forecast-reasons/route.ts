import { NextResponse } from "next/server";
import db from "@/lib/db";
import { normalizeCountryKey } from "@/lib/flashReportCountry";
import { normalizeSegmentKey } from "@/app/api/flash-reports/segment-forecast-reasons/route";

export const dynamic = "force-dynamic";

/**
 * CMS editor endpoint for the forecast rationale rows.
 *
 * Protected by the admin basic-auth middleware (see middleware.js
 * protectedPaths + matcher), the same way /api/admin/insights is. The sibling
 * /api/admin/flash-dynamic/* routes predate that and are unauthenticated; this
 * one is not written that way.
 *
 * GET  ?country=&segment=        -> current rows
 * POST { country, segment, rows } -> replaces the set for that country+segment
 */

type IncomingRow = { rank?: unknown; oem?: unknown; description?: unknown };

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const country = normalizeCountryKey(searchParams.get("country")) || "india";
    const segment = normalizeSegmentKey(searchParams.get("segment"));

    const [rows] = await db.query(
      `SELECT id, rank_index, oem_name, description, updated_at
         FROM flash_segment_forecast_reasons
        WHERE country_key = ? AND segment_key = ?
        ORDER BY rank_index ASC, oem_name ASC`,
      [country, segment],
    );

    return NextResponse.json({ country, segment, rows: rows || [] });
  } catch (e: any) {
    if (e?.code === "ER_NO_SUCH_TABLE") {
      return NextResponse.json(
        {
          rows: [],
          error:
            "Table flash_segment_forecast_reasons is missing — run db/migrations/flash_segment_forecast_reasons.sql.",
        },
        { status: 503 },
      );
    }
    console.error("GET /api/admin/flash-forecast-reasons error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const country = normalizeCountryKey(body?.country) || "india";
  const segment = normalizeSegmentKey(body?.segment);
  if (!segment) {
    return NextResponse.json({ error: "segment is required" }, { status: 400 });
  }

  const incoming: IncomingRow[] = Array.isArray(body?.rows) ? body.rows : [];

  // Keep only rows with an OEM name; rank falls back to list order so the
  // editor does not have to renumber after a delete.
  const cleaned = incoming
    .map((r, i) => ({
      rank: Number.isFinite(Number(r?.rank)) && Number(r?.rank) > 0 ? Number(r.rank) : i + 1,
      oem: String(r?.oem ?? "").trim(),
      description: String(r?.description ?? "").trim(),
    }))
    .filter((r) => r.oem.length > 0);

  // One OEM per country+segment (the table's unique key); keep the first.
  const seen = new Set<string>();
  const rows = cleaned.filter((r) => {
    const k = r.oem.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Replace the whole set so deletions in the editor take effect.
    await conn.execute(
      "DELETE FROM flash_segment_forecast_reasons WHERE country_key = ? AND segment_key = ?",
      [country, segment],
    );

    for (const r of rows) {
      await conn.execute(
        `INSERT INTO flash_segment_forecast_reasons
           (country_key, segment_key, rank_index, oem_name, description)
         VALUES (?, ?, ?, ?, ?)`,
        [country, segment, r.rank, r.oem, r.description || null],
      );
    }

    await conn.commit();
    return NextResponse.json({ country, segment, saved: rows.length });
  } catch (e: any) {
    await conn.rollback();
    if (e?.code === "ER_NO_SUCH_TABLE") {
      return NextResponse.json(
        {
          error:
            "Table flash_segment_forecast_reasons is missing — run db/migrations/flash_segment_forecast_reasons.sql.",
        },
        { status: 503 },
      );
    }
    console.error("POST /api/admin/flash-forecast-reasons error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  } finally {
    conn.release();
  }
}
