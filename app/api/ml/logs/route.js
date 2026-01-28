// File: app/api/ml/logs/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import db from "@/lib/db";

const VALID_STATUSES = new Set(["started", "success", "error", "timeout"]);

export async function GET(request) {
  const url = new URL(request.url);
  const graphIdParam = url.searchParams.get("graphId");
  const statusParam  = url.searchParams.get("status"); // CSV: success,error
  const pageParam    = url.searchParams.get("page") || "1";
  const sizeParam    = url.searchParams.get("pageSize") || "20";

  const page = Math.max(parseInt(pageParam, 10) || 1, 1);
  const pageSizeRaw = parseInt(sizeParam, 10) || 20;
  const pageSize = Math.min(Math.max(pageSizeRaw, 1), 100);
  const offset = (page - 1) * pageSize;

  const where = [];
  const params = [];

  if (graphIdParam) {
    const gid = Number(graphIdParam);
    if (!Number.isFinite(gid)) {
      return new Response(JSON.stringify({ error: "graphId must be an integer" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }
    where.push("graph_id = ?");
    params.push(gid);
  }

  if (statusParam) {
    const statuses = statusParam
      .split(",")
      .map(s => s.trim())
      .filter(s => VALID_STATUSES.has(s));
    if (statuses.length) {
      // mysql2 expands array for IN (?)
      where.push("status IN (?)");
      params.push(statuses);
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const baseFrom = `FROM score_range_logs ${whereSql}`;

  const conn = await db.getConnection();
  try {
    // total count
    const [cntRows] = await conn.query(`SELECT COUNT(*) AS cnt ${baseFrom}`, params);
    const total = Number(cntRows?.[0]?.cnt || 0);

    // rows
    const [rows] = await conn.query(
      `
      SELECT
        id,
        request_id           AS requestId,
        graph_id             AS graphId,
        clusters,
        model_version        AS modelVersion,
        source,
        status,
        python_status_code   AS pythonStatusCode,
        output_count_groups  AS outputCountGroups,
        duration_ms          AS durationMs,
        error_message        AS errorMessage,
        started_at           AS startedAt,
        finished_at          AS finishedAt
      ${baseFrom}
      ORDER BY started_at DESC, id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, pageSize, offset]
    );

    return new Response(JSON.stringify({
      rows, total, page, pageSize,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("GET /api/ml/logs error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  } finally {
    conn.release();
  }
}
