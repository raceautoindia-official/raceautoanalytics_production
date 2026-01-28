// File: app/api/ml/recompute/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import db from "@/lib/db";
import { randomUUID } from "crypto";

const PY_ML_BASE = process.env.PYTHON_ML_BASE_URL || "http://127.0.0.1:5501";
const MODEL_VERSION = process.env.ML_MODEL_VERSION || "kmeans-v1";
const DEFAULT_CLUSTERS = Number(process.env.ML_DEFAULT_CLUSTERS || "3");
const ADMIN_TOKEN = process.env.ML_ADMIN_TOKEN || null;

// --- small helpers ----------------------------------------------------------
async function logStart({ requestId, graphId, clusters, modelVersion, source }) {
  const conn = await db.getConnection();
  try {
    await conn.query(
      `INSERT INTO score_range_logs
         (request_id, graph_id, clusters, model_version, source, status)
       VALUES (?, ?, ?, ?, ?, 'started')`,
      [requestId, graphId, clusters, modelVersion, source]
    );
  } finally {
    conn.release();
  }
}

async function logFinish({
  requestId,
  status, // 'success' | 'error' | 'timeout'
  pythonStatusCode = null,
  outputCountGroups = null,
  durationMs = null,
  errorMessage = null,
}) {
  const conn = await db.getConnection();
  try {
    await conn.query(
      `UPDATE score_range_logs
          SET status = ?,
              python_status_code = ?,
              output_count_groups = ?,
              duration_ms = ?,
              error_message = ?,
              finished_at = CURRENT_TIMESTAMP
        WHERE request_id = ?`,
      [status, pythonStatusCode, outputCountGroups, durationMs, errorMessage, requestId]
    );
  } finally {
    conn.release();
  }
}

async function upsertMlResults({ graphId, payload }) {
  const conn = await db.getConnection();
  try {
    await conn.query(
      `INSERT INTO ml_results (graph_id, model_version, output_json)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         model_version = VALUES(model_version),
         output_json   = VALUES(output_json),
         updated_at    = CURRENT_TIMESTAMP`,
      [graphId, MODEL_VERSION, JSON.stringify(payload)]
    );
  } finally {
    conn.release();
  }
}

// --- route ------------------------------------------------------------------
export async function POST(request) {
  // Optional bearer auth
  if (ADMIN_TOKEN) {
    const auth = request.headers.get("authorization") || "";
    const ok = auth.toLowerCase().startsWith("bearer ")
      && auth.split(" ")[1] === ADMIN_TOKEN;
    if (!ok) return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const graphId = body?.graphId;
  const clusters = body?.clusters;
  const source =
    (body?.source ||
      request.headers.get("x-trigger") ||
      "unknown").toString().slice(0, 32);

  if (!graphId) {
    return new Response(JSON.stringify({ error: "graphId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const nClusters = Number.isFinite(Number(clusters))
    ? Number(clusters)
    : DEFAULT_CLUSTERS;

  // --- Log "started" immediately (do not hold a DB conn across network calls)
  const requestId = randomUUID();
  await logStart({
    requestId,
    graphId,
    clusters: nClusters,
    modelVersion: MODEL_VERSION,
    source,
  });

  // --- Call Python service
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);
  const url = `${PY_ML_BASE}/calculate_ranges?graphId=${encodeURIComponent(
    graphId
  )}&clusters=${nClusters}&cache=0`;

  let payload = null;
  let pyStatus = null;
  let finalStatus = "success";
  let finalError = null;

  try {
    const res = await fetch(url, { method: "GET", signal: ctrl.signal });
    pyStatus = res.status;
    if (!res.ok) {
      throw new Error(`Python ML error: ${res.status} ${res.statusText}`);
    }
    payload = await res.json(); // { data: [...], clusters, count_groups }
  } catch (e) {
    finalStatus = (e && e.name === "AbortError") ? "timeout" : "error";
    finalError = String(e);
  } finally {
    clearTimeout(timer);
  }

  // --- On success: upsert ml_results
  if (finalStatus === "success") {
    try {
      await upsertMlResults({ graphId, payload });
    } catch (e) {
      finalStatus = "error";
      finalError = `Upsert failed: ${e.message || String(e)}`;
    }
  }

  // --- Finish log
  const durationMs = Date.now() - started;
  const outCount =
    (payload && Number.isFinite(Number(payload.count_groups)))
      ? Number(payload.count_groups)
      : (Array.isArray(payload?.data) ? payload.data.length : null);

  try {
    await logFinish({
      requestId,
      status: finalStatus,
      pythonStatusCode: pyStatus,
      outputCountGroups: outCount,
      durationMs,
      errorMessage: finalError,
    });
  } catch (e) {
    // Avoid masking the original outcome if the log update fails
    console.error("[/api/ml/recompute] logFinish failed:", e);
  }

  // --- Response mirrors original behavior
  if (finalStatus === "success") {
    return new Response(
      JSON.stringify({
        success: true,
        graphId,
        modelVersion: MODEL_VERSION,
        clusters: nClusters,
        requestId,
        outputCountGroups: outCount,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Python or DB failure → propagate a 5xx
  const code = finalStatus === "timeout" ? 504 : 502;
  return new Response(
    JSON.stringify({
      success: false,
      graphId,
      requestId,
      status: finalStatus,
      error: finalError,
      pythonStatusCode: pyStatus,
    }),
    { status: code, headers: { "Content-Type": "application/json" } }
  );
}
