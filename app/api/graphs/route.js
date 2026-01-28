import { NextResponse } from "next/server";
import db from "@/lib/db";

/**
 * Compatibility goals:
 * - Accept both camelCase (old) and snake_case (new) request bodies
 * - Preserve legacy DB fields (summary, chart_type, etc.)
 * - Support DELETE with either ?id= or JSON body { id }
 * - Return responses that satisfy both:
 *    - old UI expecting { id, name, ... }
 *    - new UI expecting { ok: true, id } or { graph: ... }
 * - Keep old validations (required fields, line chart needs race forecast, etc.)
 */

function pickFirst(...vals) {
  for (const v of vals) if (v !== undefined) return v;
  return undefined;
}

function safeParseJson(v) {
  if (v == null) return null;
  if (typeof v === "object") return v;
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

function normalizeToArray(v) {
  if (v == null) return null;
  if (Array.isArray(v)) return v;
  return [v].filter((x) => x !== undefined && x !== null && x !== "");
}

function normalizeForecastObject(v) {
  if (v == null) return null;
  const parsed = safeParseJson(v);
  if (parsed == null) return null;
  if (typeof parsed === "object") return parsed;
  // if it's a primitive, return null (invalid shape)
  return null;
}

function ensureJsonString(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    // If it's already JSON-ish, keep it normalized (avoid double-stringify)
    const trimmed = value.trim();
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return JSON.stringify(JSON.parse(trimmed));
      } catch {
        return value; // keep original if it isn't valid JSON
      }
    }
    return value;
  }
  return JSON.stringify(value);
}

function graphRowWithAliases(row) {
  if (!row) return row;

  // Keep raw DB fields AS-IS (strings) for old code that does JSON.parse(row.ai_forecast), etc.
  const datasetIdsParsed = safeParseJson(row.dataset_ids);
  const forecastTypesParsed = safeParseJson(row.forecast_types);
  const aiForecastParsed = safeParseJson(row.ai_forecast);
  const raceForecastParsed = safeParseJson(row.race_forecast);

  const createdAt = row.created_at
    ? new Date(row.created_at).toISOString()
    : row.createdAt || null;

  return {
    ...row,

    // CamelCase aliases (old/new frontend convenience)
    datasetIds: datasetIdsParsed,
    forecastTypes: forecastTypesParsed,
    aiForecast: aiForecastParsed,
    raceForecast: raceForecastParsed,
    chartType: row.chart_type ?? null,
    createdAt,

    // Parsed snake_case aliases (for newer code that wants parsed but must not break old raw keys)
    dataset_ids_parsed: datasetIdsParsed,
    forecast_types_parsed: forecastTypesParsed,
    ai_forecast_parsed: aiForecastParsed,
    race_forecast_parsed: raceForecastParsed,
  };
}

async function fetchGraphById(id) {
  const [rows] = await db.query(`SELECT * FROM graphs WHERE id = ? LIMIT 1`, [
    Number(id),
  ]);
  return rows?.[0] ? graphRowWithAliases(rows[0]) : null;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const context = searchParams.get("context");

    // Single
    if (id) {
      const graph = await fetchGraphById(id);
      if (!graph)
        return NextResponse.json({ error: "Graph not found" }, { status: 404 });

      // Return BOTH shapes:
      // - new callers can use { graph }
      // - old callers can read top-level fields directly
      return NextResponse.json({ ...graph, graph });
    }

    // List (optionally filter by context)
    const [rows] = await db.query(
      context
        ? `SELECT * FROM graphs WHERE context = ? ORDER BY id DESC`
        : `SELECT * FROM graphs ORDER BY id DESC`,
      context ? [context] : []
    );

    // Old code expects an array; keep it an array
    return NextResponse.json((rows || []).map(graphRowWithAliases));
  } catch (e) {
    console.error("GET /api/graphs error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Accept both camelCase (old) and snake_case (new)
    const name = pickFirst(body.name, "") || "";
    const description = pickFirst(body.description, "") || "";
    const summary = pickFirst(body.summary, null);
    const chartType = pickFirst(body.chart_type, body.chartType, null);

    // dataset ids
    const datasetIdsRaw = pickFirst(body.dataset_ids, body.datasetIds, null);
    const datasetIdsArr =
      datasetIdsRaw == null ? null : normalizeToArray(datasetIdsRaw);

    // forecast types
    const forecastTypesRaw = pickFirst(
      body.forecast_types,
      body.forecastTypes,
      []
    );
    const forecastTypesArr = Array.isArray(forecastTypesRaw)
      ? forecastTypesRaw
      : safeParseJson(forecastTypesRaw) ?? [];

    // forecasts
    const aiForecast = normalizeForecastObject(
      pickFirst(body.ai_forecast, body.aiForecast, null)
    );
    const raceForecast = normalizeForecastObject(
      pickFirst(body.race_forecast, body.raceForecast, null)
    );

    // context / extra fields
    const context = pickFirst(body.context, "forecast") || "forecast";
    const scoreSettingsKey =
      pickFirst(
        body.score_settings_key,
        body.scoreSettingsKey,
        "scoreSettings"
      ) || "scoreSettings";
    const flashSegment = pickFirst(body.flash_segment, body.flashSegment, null);

    // --- Legacy validations (to prevent bad inserts that later crash renderers) ---
    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    // Old behavior: datasetIds + chartType required (except flash can be looser if you want)
    // To keep old code safe, enforce dataset for non-flash contexts.
    if (context !== "flash" && (!datasetIdsArr || datasetIdsArr.length === 0)) {
      return NextResponse.json(
        { error: "Missing required field: datasetIds/dataset_ids" },
        { status: 400 }
      );
    }

    if (!chartType) {
      return NextResponse.json(
        { error: "Missing required field: chartType/chart_type" },
        { status: 400 }
      );
    }

    if (chartType === "line" && !raceForecast) {
      return NextResponse.json(
        { error: "Race forecast data is required for line chart" },
        { status: 400 }
      );
    }

    if (
      chartType === "line" &&
      (!forecastTypesArr || forecastTypesArr.length === 0)
    ) {
      return NextResponse.json(
        { error: "Select forecasting methods (forecastTypes/forecast_types)" },
        { status: 400 }
      );
    }

    const [res] = await db.query(
      `
      INSERT INTO graphs
        (name, description, summary, chart_type, dataset_ids, forecast_types, ai_forecast, race_forecast, context, score_settings_key, flash_segment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        description || null,
        summary || null,
        chartType || null,
        datasetIdsArr == null ? null : ensureJsonString(datasetIdsArr),
        ensureJsonString(forecastTypesArr ?? []),
        aiForecast == null ? null : ensureJsonString(aiForecast),
        raceForecast == null ? null : ensureJsonString(raceForecast),
        context,
        scoreSettingsKey,
        flashSegment,
      ]
    );

    const created = await fetchGraphById(res.insertId);

    // Return BOTH shapes so old + new frontend code works without edits:
    // - ok/id for newer code
    // - id/name/graph fields for older code
    return NextResponse.json({
      ok: true,
      id: res.insertId,
      ...(created || { name }),
      graph: created || null,
    });
  } catch (e) {
    console.error("POST /api/graphs error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();

    const id = pickFirst(body.id, null);
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    // Accept both styles
    const name = pickFirst(body.name, "") || "";
    const description = pickFirst(body.description, "") || "";
    const summary = pickFirst(body.summary, undefined); // undefined = don't overwrite unless provided
    const chartType = pickFirst(body.chart_type, body.chartType, undefined);

    const datasetIdsRaw = pickFirst(
      body.dataset_ids,
      body.datasetIds,
      undefined
    );
    const datasetIdsArr =
      datasetIdsRaw === undefined
        ? undefined
        : datasetIdsRaw == null
        ? null
        : normalizeToArray(datasetIdsRaw);

    const forecastTypesRaw = pickFirst(
      body.forecast_types,
      body.forecastTypes,
      undefined
    );
    const forecastTypesArr =
      forecastTypesRaw === undefined
        ? undefined
        : Array.isArray(forecastTypesRaw)
        ? forecastTypesRaw
        : safeParseJson(forecastTypesRaw) ?? [];

    const aiForecastRaw = pickFirst(
      body.ai_forecast,
      body.aiForecast,
      undefined
    );
    const raceForecastRaw = pickFirst(
      body.race_forecast,
      body.raceForecast,
      undefined
    );

    const aiForecast =
      aiForecastRaw === undefined
        ? undefined
        : normalizeForecastObject(aiForecastRaw);
    const raceForecast =
      raceForecastRaw === undefined
        ? undefined
        : normalizeForecastObject(raceForecastRaw);

    const context = pickFirst(body.context, undefined);
    const scoreSettingsKey = pickFirst(
      body.score_settings_key,
      body.scoreSettingsKey,
      undefined
    );
    const flashSegment = pickFirst(
      body.flash_segment,
      body.flashSegment,
      undefined
    );

    // Build dynamic update (so undefined fields don't wipe existing values)
    const sets = [];
    const params = [];

    const add = (col, val) => {
      sets.push(`${col} = ?`);
      params.push(val);
    };

    add("name", name);
    add("description", description);

    if (summary !== undefined) add("summary", summary == null ? null : summary);
    if (chartType !== undefined)
      add("chart_type", chartType == null ? null : chartType);

    if (datasetIdsArr !== undefined)
      add(
        "dataset_ids",
        datasetIdsArr == null ? null : ensureJsonString(datasetIdsArr)
      );
    if (forecastTypesArr !== undefined)
      add("forecast_types", ensureJsonString(forecastTypesArr ?? []));
    if (aiForecast !== undefined)
      add(
        "ai_forecast",
        aiForecast == null ? null : ensureJsonString(aiForecast)
      );
    if (raceForecast !== undefined)
      add(
        "race_forecast",
        raceForecast == null ? null : ensureJsonString(raceForecast)
      );

    if (context !== undefined) add("context", context == null ? null : context);
    if (scoreSettingsKey !== undefined)
      add(
        "score_settings_key",
        scoreSettingsKey == null ? null : scoreSettingsKey
      );
    if (flashSegment !== undefined)
      add("flash_segment", flashSegment == null ? null : flashSegment);

    params.push(Number(id));

    await db.query(
      `
      UPDATE graphs
      SET ${sets.join(", ")}
      WHERE id = ?
      `,
      params
    );

    const updated = await fetchGraphById(id);

    return NextResponse.json({
      ok: true,
      ...(updated || {}),
      graph: updated || null,
      message: "Graph updated successfully",
    });
  } catch (e) {
    console.error("PUT /api/graphs error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const url = new URL(request.url);
    let id = url.searchParams.get("id");

    // Back-compat: allow JSON body { id } as old code did
    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {
        // ignore
      }
    }

    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    await db.query("DELETE FROM graphs WHERE id = ?", [Number(id)]);
    return NextResponse.json({
      ok: true,
      id: Number(id),
      message: "Graph deleted",
    });
  } catch (e) {
    console.error("DELETE /api/graphs error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

// import { NextResponse } from "next/server";
// import db from "@/lib/db";

// function safeJson(v) {
//   if (v == null) return null;
//   if (typeof v === "object") return v;
//   try {
//     return JSON.parse(v);
//   } catch {
//     return v; // keep original if parsing fails
//   }
// }

// function normalizeGraph(row) {
//   if (!row) return row;
//   return {
//     ...row,
//     forecast_types: safeJson(row.forecast_types) ?? row.forecast_types,
//     ai_forecast: safeJson(row.ai_forecast) ?? row.ai_forecast,
//     race_forecast: safeJson(row.race_forecast) ?? row.race_forecast,
//     dataset_ids: safeJson(row.dataset_ids) ?? row.dataset_ids,
//   };
// }

// export async function GET(request) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const id = searchParams.get("id");
//     const context = searchParams.get("context");

//     // Single graph
//     if (id) {
//       const [rows] = await db.query(
//         `SELECT * FROM graphs WHERE id = ? LIMIT 1`,
//         [Number(id)]
//       );
//       if (!rows?.length)
//         return NextResponse.json({ error: "Graph not found" }, { status: 404 });
//       return NextResponse.json({ graph: normalizeGraph(rows[0]) });
//     }

//     // List graphs (optionally filter by context)
//     const [rows] = await db.query(
//       context
//         ? "SELECT * FROM graphs WHERE context = ? ORDER BY id DESC"
//         : "SELECT * FROM graphs ORDER BY id DESC",
//       context ? [context] : []
//     );

//     return NextResponse.json((rows || []).map(normalizeGraph));
//   } catch (e) {
//     console.error("GET /api/graphs error:", e);
//     return NextResponse.json(
//       { error: e?.message || "Server error" },
//       { status: 500 }
//     );
//   }
// }

// export async function POST(request) {
//   try {
//     const body = await request.json();

//     const name = body.name || "";
//     const description = body.description || "";

//     const forecast_types = body.forecast_types ?? [];
//     const ai_forecast = body.ai_forecast ?? null;
//     const race_forecast = body.race_forecast ?? null;
//     const dataset_ids = body.dataset_ids ?? null;

//     const context = body.context || "forecast";
//     const score_settings_key = body.score_settings_key || "scoreSettings";
//     const flash_segment = body.flash_segment ?? null;

//     const [res] = await db.query(
//       `
//       INSERT INTO graphs
//         (name, description, forecast_types, ai_forecast, race_forecast, dataset_ids, context, score_settings_key, flash_segment)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
//       `,
//       [
//         name,
//         description,
//         JSON.stringify(forecast_types),
//         ai_forecast == null ? null : JSON.stringify(ai_forecast),
//         race_forecast == null ? null : JSON.stringify(race_forecast),
//         dataset_ids == null ? null : JSON.stringify(dataset_ids),
//         context,
//         score_settings_key,
//         flash_segment,
//       ]
//     );

//     return NextResponse.json({ ok: true, id: res.insertId });
//   } catch (e) {
//     console.error("POST /api/graphs error:", e);
//     return NextResponse.json(
//       { error: e?.message || "Server error" },
//       { status: 500 }
//     );
//   }
// }

// export async function PUT(request) {
//   try {
//     const body = await request.json();

//     if (!body.id)
//       return NextResponse.json({ error: "id is required" }, { status: 400 });

//     const id = Number(body.id);
//     const name = body.name || "";
//     const description = body.description || "";

//     const forecast_types = body.forecast_types ?? [];
//     const ai_forecast = body.ai_forecast ?? null;
//     const race_forecast = body.race_forecast ?? null;
//     const dataset_ids = body.dataset_ids ?? null;

//     const context = body.context || "forecast";
//     const score_settings_key = body.score_settings_key || "scoreSettings";
//     const flash_segment = body.flash_segment ?? null;

//     await db.query(
//       `
//       UPDATE graphs
//       SET
//         name = ?,
//         description = ?,
//         forecast_types = ?,
//         ai_forecast = ?,
//         race_forecast = ?,
//         dataset_ids = ?,
//         context = ?,
//         score_settings_key = ?,
//         flash_segment = ?
//       WHERE id = ?
//       `,
//       [
//         name,
//         description,
//         JSON.stringify(forecast_types),
//         ai_forecast == null ? null : JSON.stringify(ai_forecast),
//         race_forecast == null ? null : JSON.stringify(race_forecast),
//         dataset_ids == null ? null : JSON.stringify(dataset_ids),
//         context,
//         score_settings_key,
//         flash_segment,
//         id,
//       ]
//     );

//     return NextResponse.json({ ok: true });
//   } catch (e) {
//     console.error("PUT /api/graphs error:", e);
//     return NextResponse.json(
//       { error: e?.message || "Server error" },
//       { status: 500 }
//     );
//   }
// }

// export async function DELETE(request) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const id = searchParams.get("id");
//     if (!id)
//       return NextResponse.json({ error: "id is required" }, { status: 400 });

//     await db.query("DELETE FROM graphs WHERE id = ?", [Number(id)]);
//     return NextResponse.json({ ok: true });
//   } catch (e) {
//     console.error("DELETE /api/graphs error:", e);
//     return NextResponse.json(
//       { error: e?.message || "Server error" },
//       { status: 500 }
//     );
//   }
// }
