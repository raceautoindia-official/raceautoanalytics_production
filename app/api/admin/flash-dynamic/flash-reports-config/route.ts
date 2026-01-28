import { NextResponse } from "next/server";
import db from "@/lib/db";

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

export async function GET() {
  try {
    const [rows] = await db.query(
      `SELECT ${COLUMNS.join(", ")} FROM flash_reports_text LIMIT 1`,
    );

    const row = Array.isArray(rows) && rows.length ? rows[0] : {};
    return NextResponse.json(row);
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

    const payload: Record<string, any> = {};
    for (const c of COLUMNS) {
      const v = body?.[c];
      payload[c] = v === "" || v == null ? null : Number(v);
      if (Number.isNaN(payload[c])) payload[c] = null;
    }

    const [existing] = await db.query(
      "SELECT id FROM flash_reports_text LIMIT 1",
    );
    const id =
      Array.isArray(existing) && existing.length ? existing[0].id : null;

    if (id) {
      const sets = COLUMNS.map((c) => `${c} = ?`).join(", ");
      const values = COLUMNS.map((c) => payload[c]);
      await db.query(
        `UPDATE flash_reports_text SET ${sets}, updated_at = NOW() WHERE id = ?`,
        [...values, id],
      );
    } else {
      const cols = COLUMNS.join(", ");
      const placeholders = COLUMNS.map(() => "?").join(", ");
      const values = COLUMNS.map((c) => payload[c]);
      await db.query(
        `INSERT INTO flash_reports_text (${cols}) VALUES (${placeholders})`,
        values,
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Save failed" },
      { status: 500 },
    );
  }
}
