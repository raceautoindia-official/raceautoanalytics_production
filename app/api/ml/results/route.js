// File: app/api/ml/results/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import db from "@/lib/db";

function normalizeCountry(v) {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return s || null;
}

export async function GET(request) {
  const url = new URL(request.url);
  const graphId = url.searchParams.get("graphId");
  if (!graphId) {
    return new Response(JSON.stringify({ error: "graphId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const countryParam = normalizeCountry(url.searchParams.get("country"));
  const country = countryParam || "india";

  const conn = await db.getConnection();
  try {
    // 1) Try graph + country
    let [rows] = await conn.query(
      `SELECT graph_id, country, model_version, output_json, updated_at
         FROM ml_results
        WHERE graph_id = ?
          AND country = ?
        LIMIT 1`,
      [graphId, country]
    );

    // 2) Fallback to india if caller asked another country and it doesn't exist
    if (!rows.length && country !== "india") {
      [rows] = await conn.query(
        `SELECT graph_id, country, model_version, output_json, updated_at
           FROM ml_results
          WHERE graph_id = ?
            AND country = 'india'
          LIMIT 1`,
        [graphId]
      );
    }

    // 3) Final fallback (legacy) any row for graphId
    if (!rows.length) {
      [rows] = await conn.query(
        `SELECT graph_id, country, model_version, output_json, updated_at
           FROM ml_results
          WHERE graph_id = ?
          LIMIT 1`,
        [graphId]
      );
    }

    if (!rows.length) {
      return new Response(JSON.stringify({ exists: false, graphId, country }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const r = rows[0];
    return new Response(
      JSON.stringify({
        exists: true,
        graphId: r.graph_id,
        country: r.country,
        modelVersion: r.model_version,
        updatedAt: r.updated_at,
        output: r.output_json,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("GET /api/ml/results error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    conn.release();
  }
}