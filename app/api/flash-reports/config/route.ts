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
] as const;

type MappingRow = {
  overall_graph_id?: number | null;
  pv_graph_id?: number | null;
  cv_graph_id?: number | null;
  tw_graph_id?: number | null;
  threew_graph_id?: number | null;
  tractor_graph_id?: number | null;
  truck_graph_id?: number | null;
  bus_graph_id?: number | null;
  ce_graph_id?: number | null;
};

async function getCountryRow(countryKey: string): Promise<MappingRow | null> {
  const [rows] = await db.query(
    `
    SELECT
      ${COLUMNS.join(", ")}
    FROM flash_reports_text
    WHERE country_key = ?
    LIMIT 1
    `,
    [countryKey],
  );

  return Array.isArray(rows) && rows.length ? ((rows as any)[0] as MappingRow) : null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawCountry =
      searchParams.get("country") || searchParams.get("region");
    const countryKey = normalizeCountryKey(rawCountry);

    let row = await getCountryRow(countryKey);

    if (!row && countryKey !== "india") {
      row = await getCountryRow("india");
    }

    const safeRow: MappingRow = row || {};

    // Validate mapping IDs against real Flash graphs to avoid sending stale/non-existent IDs.
    const requested = [
      safeRow.overall_graph_id,
      safeRow.pv_graph_id,
      safeRow.cv_graph_id,
      safeRow.tw_graph_id,
      safeRow.threew_graph_id,
      safeRow.tractor_graph_id,
      safeRow.truck_graph_id,
      safeRow.bus_graph_id,
      safeRow.ce_graph_id,
    ]
      .map((v: any) => (v == null ? null : Number(v)))
      .filter((v: any) => Number.isFinite(v)) as number[];

    let valid = new Set<number>();

    if (requested.length) {
      const uniqueRequested = [...new Set(requested)];
      const placeholders = uniqueRequested.map(() => "?").join(",");

      const [grows] = await db.query(
        `SELECT id FROM graphs WHERE context = 'flash' AND id IN (${placeholders})`,
        uniqueRequested,
      );

      const arr = Array.isArray(grows) ? grows : [];
      valid = new Set(arr.map((x: any) => Number(x.id)));
    }

    const pick = (v: any) => {
      const n = v == null ? null : Number(v);
      if (!Number.isFinite(n)) return null;
      return valid.has(n) ? n : null;
    };

    return NextResponse.json({
      country: countryKey,
      overall: pick(safeRow.overall_graph_id),
      pv: pick(safeRow.pv_graph_id),
      cv: pick(safeRow.cv_graph_id),
      tw: pick(safeRow.tw_graph_id),
      threew: pick(safeRow.threew_graph_id),
      tractor: pick(safeRow.tractor_graph_id),
      truck: pick(safeRow.truck_graph_id),
      bus: pick(safeRow.bus_graph_id),
      ce: pick(safeRow.ce_graph_id),
      horizonDefault: 6,
    });
  } catch (e: any) {
    console.error("GET /api/flash-reports/config error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}