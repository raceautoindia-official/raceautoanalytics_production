import { NextResponse } from "next/server";
import db from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [rows] = await db.query(
      `
      SELECT
        overall_graph_id,
        pv_graph_id,
        cv_graph_id,
        tw_graph_id,
        threew_graph_id,
        tractor_graph_id,
        truck_graph_id,
        bus_graph_id,
        ce_graph_id
      FROM flash_reports_text
      ORDER BY id ASC
      LIMIT 1
      `,
    );

    const row = Array.isArray(rows) && rows.length ? (rows as any)[0] : {};

    // Validate mapping IDs against real Flash graphs to avoid sending stale/non-existent IDs.
    const requested = [
      row.overall_graph_id,
      row.pv_graph_id,
      row.cv_graph_id,
      row.tw_graph_id,
      row.threew_graph_id,
      row.tractor_graph_id,
      row.truck_graph_id,
      row.bus_graph_id,
      row.ce_graph_id,
    ]
      .map((v: any) => (v == null ? null : Number(v)))
      .filter((v: any) => Number.isFinite(v)) as number[];

    let valid = new Set<number>();
    if (requested.length) {
      const placeholders = requested.map(() => "?").join(",");
      const [grows] = await db.query(
        `SELECT id FROM graphs WHERE context = 'flash' AND id IN (${placeholders})`,
        requested,
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
      overall: pick(row.overall_graph_id),
      pv: pick(row.pv_graph_id),
      cv: pick(row.cv_graph_id),
      tw: pick(row.tw_graph_id),
      threew: pick(row.threew_graph_id),
      tractor: pick(row.tractor_graph_id),
      truck: pick(row.truck_graph_id),
      bus: pick(row.bus_graph_id),
      ce: pick(row.ce_graph_id),
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
