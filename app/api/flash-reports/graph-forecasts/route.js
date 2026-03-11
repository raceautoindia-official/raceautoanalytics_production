import { NextResponse } from "next/server";
import db from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Optional admin protection for POST (keep empty to allow internal usage)
const ADMIN_TOKEN = process.env.FLASH_ADMIN_TOKEN || null;

function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function normalizeCountry(v) {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return s || null;
}
function safeJson(v) {
  if (v == null) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const graphId = toInt(searchParams.get("graphId"));
    if (graphId == null) {
      return NextResponse.json(
        { error: "graphId is required" },
        { status: 400 }
      );
    }

    const country = normalizeCountry(searchParams.get("country")) || "india";

    // 1) Try per-country override from flash_graph_forecasts
    const [rows] = await db.query(
      `SELECT graph_id, country, ai_forecast_json, race_forecast_json, updated_at
         FROM flash_graph_forecasts
        WHERE graph_id = ? AND country = ?
        LIMIT 1`,
      [graphId, country]
    );

    if (rows?.length) {
      const r = rows[0];
      return NextResponse.json({
        exists: true,
        source: "flash_graph_forecasts",
        graphId: r.graph_id,
        country: r.country,
        updatedAt: r.updated_at,
        aiForecast: safeJson(r.ai_forecast_json),
        raceForecast: safeJson(r.race_forecast_json),
      });
    }

    // 2) Backward compatibility: India falls back to graphs table (old behavior)
    if (country === "india") {
      const [grows] = await db.query(
        `SELECT id, ai_forecast, race_forecast
           FROM graphs
          WHERE id = ?
          LIMIT 1`,
        [graphId]
      );

      if (grows?.length) {
        const g = grows[0];
        const ai = safeJson(g.ai_forecast);
        const race = safeJson(g.race_forecast);

        // Only claim exists if any forecast is present
        const any = !!(ai || race);

        return NextResponse.json({
          exists: any,
          source: "graphs",
          graphId: g.id,
          country: "india",
          updatedAt: null,
          aiForecast: ai,
          raceForecast: race,
        });
      }
    }

    // 3) Non-india: do NOT fall back to india (prevents wrong lines)
    return NextResponse.json({
      exists: false,
      source: "none",
      graphId,
      country,
      updatedAt: null,
      aiForecast: null,
      raceForecast: null,
    });
  } catch (e) {
    console.error("GET /api/flash-reports/graph-forecasts error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Optional bearer auth for CMS/admin writes
    if (ADMIN_TOKEN) {
      const auth = request.headers.get("authorization") || "";
      const ok =
        auth.toLowerCase().startsWith("bearer ") &&
        auth.split(" ")[1] === ADMIN_TOKEN;
      if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const graphId = toInt(body?.graphId);
    const country = normalizeCountry(body?.country);

    if (graphId == null || !country) {
      return NextResponse.json(
        { error: "graphId and country are required" },
        { status: 400 }
      );
    }

    const aiForecast = body?.aiForecast ?? null;
    const raceForecast = body?.raceForecast ?? null;

    if (aiForecast == null && raceForecast == null) {
      return NextResponse.json(
        { error: "Provide aiForecast and/or raceForecast" },
        { status: 400 }
      );
    }

    await db.query(
      `INSERT INTO flash_graph_forecasts (graph_id, country, ai_forecast_json, race_forecast_json)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         ai_forecast_json = COALESCE(VALUES(ai_forecast_json), ai_forecast_json),
         race_forecast_json = COALESCE(VALUES(race_forecast_json), race_forecast_json),
         updated_at = CURRENT_TIMESTAMP`,
      [
        graphId,
        country,
        aiForecast == null ? null : JSON.stringify(aiForecast),
        raceForecast == null ? null : JSON.stringify(raceForecast),
      ]
    );

    return NextResponse.json({ ok: true, graphId, country });
  } catch (e) {
    console.error("POST /api/flash-reports/graph-forecasts error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}