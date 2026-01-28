import { NextResponse } from "next/server";
import db from "@/lib/db";

function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeBasePeriod(v) {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

/**
 * Accepts BOTH payload formats:
 * A) New (flat)
 *   { graphId, userEmail, basePeriod?, scores: [{questionId, yearIndex, score, skipped}] }
 *
 * B) Legacy (ScoreCard)
 *   { graphId, user, basePeriod?, results: [{questionId, skipped, scores:[...]}] }
 */
function flattenScoresFromBody(body) {
  // New flat format
  if (Array.isArray(body?.scores)) {
    return body.scores
      .map((s) => ({
        questionId: toInt(s.questionId),
        yearIndex: s.yearIndex == null ? null : toInt(s.yearIndex),
        score:
          s.score == null || s.score === ""
            ? null
            : Number.isFinite(Number(s.score))
            ? Number(s.score)
            : null,
        skipped: !!s.skipped ? 1 : 0,
      }))
      .filter((x) => x.questionId != null);
  }

  // Legacy format
  const results = Array.isArray(body?.results) ? body.results : [];
  const out = [];

  for (const r of results) {
    const qid = toInt(r.questionId);
    if (qid == null) continue;

    const skipped = !!r.skipped;
    if (skipped) {
      out.push({ questionId: qid, yearIndex: null, score: null, skipped: 1 });
      continue;
    }

    const arr = Array.isArray(r.scores) ? r.scores : [];
    for (let i = 0; i < arr.length; i++) {
      const raw = arr[i];
      const score =
        raw == null || raw === ""
          ? null
          : Number.isFinite(Number(raw))
          ? Number(raw)
          : null;
      out.push({ questionId: qid, yearIndex: i, score, skipped: 0 });
    }
  }

  return out;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const graphId = toInt(searchParams.get("graphId"));
    const email = searchParams.get("email");
    const basePeriod = normalizeBasePeriod(searchParams.get("basePeriod"));

    const where = [];
    const params = [];

    if (graphId != null) {
      where.push("s.graph_id = ?");
      params.push(graphId);
    }
    if (email) {
      where.push("s.user_email = ?");
      params.push(email);
    }
    if (basePeriod) {
      where.push("s.base_period = ?");
      params.push(basePeriod);
    }

    const sql = `
      SELECT
        s.id AS submission_id,
        s.user_email,
        s.graph_id,
        s.base_period,
        s.created_at,
        sc.id AS score_id,
        sc.question_id,
        sc.year_index,
        sc.score,
        sc.skipped
      FROM submissions s
      LEFT JOIN submission_scores sc ON sc.submission_id = s.id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY s.created_at DESC, sc.question_id ASC, sc.year_index ASC
    `;

    const [rows] = await db.query(sql, params);

    const map = new Map();

    for (const r of rows || []) {
      const id = r.submission_id;
      if (!map.has(id)) {
        map.set(id, {
          id,
          userEmail: r.user_email,
          graphId: r.graph_id,
          basePeriod: r.base_period,
          createdAt: r.created_at,
          scores: [],
        });
      }

      if (r.score_id) {
        map.get(id).scores.push({
          id: r.score_id,
          questionId: r.question_id,
          yearIndex: r.year_index,
          score: r.score,
          skipped: !!r.skipped,
        });
      }
    }

    return NextResponse.json({ submissions: Array.from(map.values()) });
  } catch (e) {
    console.error("GET /api/saveScores error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const graphId = toInt(body.graphId);
    const userEmail = body.userEmail || body.user || body.email;

    if (graphId == null || !userEmail) {
      return NextResponse.json(
        { error: "graphId and userEmail are required" },
        { status: 400 }
      );
    }

    const basePeriod = normalizeBasePeriod(body.basePeriod);

    // For Flash cycle submissions: enforce one submission per (graphId, user, basePeriod)
    if (basePeriod) {
      const [oldRows] = await db.query(
        "SELECT id FROM submissions WHERE graph_id = ? AND user_email = ? AND base_period = ?",
        [graphId, userEmail, basePeriod]
      );
      const ids = (oldRows || []).map((x) => x.id);
      if (ids.length) {
        const placeholders = ids.map(() => "?").join(",");
        await db.query(
          `DELETE FROM submission_scores WHERE submission_id IN (${placeholders})`,
          ids
        );
        await db.query(
          `DELETE FROM submissions WHERE id IN (${placeholders})`,
          ids
        );
      }
    }

    const [insertRes] = await db.query(
      "INSERT INTO submissions (user_email, graph_id, base_period) VALUES (?, ?, ?)",
      [userEmail, graphId, basePeriod]
    );

    const submissionId = insertRes.insertId;
    const flattened = flattenScoresFromBody(body);

    if (flattened.length) {
      const values = [];
      const params = [];

      for (const s of flattened) {
        values.push("(?, ?, ?, ?, ?)");
        params.push(
          submissionId,
          s.questionId,
          s.yearIndex,
          s.score,
          s.skipped ? 1 : 0
        );
      }

      await db.query(
        `
        INSERT INTO submission_scores
          (submission_id, question_id, year_index, score, skipped)
        VALUES ${values.join(",")}
        `,
        params
      );
    }

    return NextResponse.json({ ok: true, submissionId });
  } catch (e) {
    console.error("POST /api/saveScores error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();

    const id = toInt(body.id);
    const graphId = toInt(body.graphId);
    const email = body.email || body.userEmail || body.user;
    const basePeriod = normalizeBasePeriod(body.basePeriod);

    let ids = [];

    if (id != null) {
      ids = [id];
    } else {
      if (graphId == null || !email) {
        return NextResponse.json(
          { error: "Provide either {id} OR {graphId, email, basePeriod?}" },
          { status: 400 }
        );
      }

      // If basePeriod is not provided, treat as forecast-mode delete (base_period IS NULL)
      const [rows] = await db.query(
        `
        SELECT id FROM submissions
        WHERE graph_id = ?
          AND user_email = ?
          AND ${basePeriod ? "base_period = ?" : "base_period IS NULL"}
        `,
        basePeriod ? [graphId, email, basePeriod] : [graphId, email]
      );

      ids = (rows || []).map((x) => x.id);
    }

    if (!ids.length) return NextResponse.json({ ok: true, deleted: 0 });

    const placeholders = ids.map(() => "?").join(",");
    await db.query(
      `DELETE FROM submission_scores WHERE submission_id IN (${placeholders})`,
      ids
    );
    await db.query(
      `DELETE FROM submissions WHERE id IN (${placeholders})`,
      ids
    );

    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch (e) {
    console.error("DELETE /api/saveScores error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
