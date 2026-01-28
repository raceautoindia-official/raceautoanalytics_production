// File: app/api/ml/results/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import db from "@/lib/db";

export async function GET(request) {
  const url = new URL(request.url);
  const graphId = url.searchParams.get("graphId");
  if (!graphId) {
    return new Response(JSON.stringify({ error: "graphId is required" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT graph_id, model_version, output_json, updated_at
         FROM ml_results
        WHERE graph_id = ?
        LIMIT 1`,
      [graphId]
    );
    if (!rows.length) {
      return new Response(JSON.stringify({ exists: false }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }
    const r = rows[0];
    return new Response(JSON.stringify({
      exists: true,
      graphId: r.graph_id,
      modelVersion: r.model_version,
      updatedAt: r.updated_at,
      output: r.output_json, // this is the JSON your Python returned
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("GET /api/ml/results error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  } finally {
    conn.release();
  }
}
