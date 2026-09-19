import OpenAI from "openai";
import { seasonalIndices } from "@/lib/forecastSeasonality";
import { holtWinters } from "@/lib/holtWinters";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const prettyRegion = (r) =>
  String(r || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

/**
 * OPTIONAL "lite" market research. Off unless the caller asks for it.
 *
 * Cost is why this is shaped the way it is. The first version researched every
 * graph separately: 173 web searches for a full run, and the search tool is
 * ~70% of the bill — about $7 a run. Policy changes, festival dates and
 * published headline figures are properties of a COUNTRY, not of a segment
 * within it, so one search now serves all of that country's graphs and the
 * result is cached. A full run costs roughly one search per country.
 *
 * It also returns a small STRUCTURED object rather than a prose brief, and the
 * adjustments are applied arithmetically here — so there is no second model
 * call per graph at all. Output tokens drop from ~940 per graph to ~250 per
 * country.
 *
 * gpt-4o-mini rather than gpt-4o: this is extraction, not analysis, and mini is
 * roughly 17x cheaper per token.
 */
const RESEARCH_TTL_MS = 12 * 60 * 60 * 1000;
const researchCache = new Map(); // country -> { at, brief }

async function liteCountryResearch(region, periods) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const ck = String(region || "").toLowerCase().trim();
  const hit = researchCache.get(ck);
  if (hit && Date.now() - hit.at < RESEARCH_TTL_MS) {
    return { ...hit.brief, cached: true };
  }

  const place = prettyRegion(region);
  const first = periods[0];
  const last = periods[periods.length - 1];

  try {
    const openai = new OpenAI({ apiKey: key });
    const res = await openai.responses.create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search" }],
      input: `Automotive market in ${place}, ${first} to ${last}. Search briefly, then answer ONLY with compact JSON:

{"monthly":[{"month":"YYYY-MM","factor":1.00,"why":"short reason"}],"trend":0.00,"note":"one line"}

- "monthly": ONLY months in ${first}..${last} where something specific makes demand unusually high or low — a festival whose date moved, a plate-change month, a tax or incentive change, a known supply disruption. factor is a multiplier vs a normal month (1.15 = 15% above normal). Omit months with nothing specific. Max 4 entries.
- "trend": overall market direction for the window as a decimal (0.03 = +3%), 0 if unclear.
- Use only what you can source. If you find nothing specific, return {"monthly":[],"trend":0,"note":"nothing found"}.
- No prose outside the JSON.`,
    });

    const text = String(res.output_text || "");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;

    let parsed;
    try {
      parsed = JSON.parse(m[0]);
    } catch {
      return null;
    }

    // Clamp hard: a researched hint may nudge the statistical forecast, never
    // replace it. A bad or over-confident answer cannot distort the line.
    const monthly = (Array.isArray(parsed.monthly) ? parsed.monthly : [])
      .filter((x) => /^\d{4}-\d{2}$/.test(String(x?.month)) && periods.includes(String(x.month)))
      .slice(0, 4)
      .map((x) => ({
        month: String(x.month),
        factor: Math.max(0.75, Math.min(1.35, Number(x.factor) || 1)),
        why: String(x.why || "").slice(0, 120),
      }))
      .filter((x) => Math.abs(x.factor - 1) > 0.01);

    const trend = Math.max(-0.12, Math.min(0.12, Number(parsed.trend) || 0));
    const sources = [
      ...new Set(
        (JSON.stringify(res.output || "").match(/https?:\/\/[^"\\\s)]+/g) || []).map((u) =>
          u.replace(/[.,]+$/, ""),
        ),
      ),
    ].slice(0, 5);

    const brief = { monthly, trend, note: String(parsed.note || "").slice(0, 200), sources };
    researchCache.set(ck, { at: Date.now(), brief });
    return brief;
  } catch (e) {
    console.error("ai-forecast: lite research failed:", e?.message || e);
    return null;
  }
}

/** Apply the researched hints to an already-computed forecast. */
function applyResearch(out, periods, brief) {
  const byMonth = new Map(brief.monthly.map((x) => [x.month, x]));
  let touched = 0;
  periods.forEach((p, i) => {
    let v = out[p];
    if (!Number.isFinite(v)) return;
    const hit = byMonth.get(p);
    if (hit) {
      v *= hit.factor;
      touched++;
    }
    if (brief.trend) v *= 1 + brief.trend * ((i + 1) / periods.length);
    out[p] = v;
  });
  return touched;
}

const PERIOD_RE = /^\d{4}(-\d{2})?$/;
const isAnnualKey = (k) => /^\d{4}$/.test(String(k).trim());
const yearOf = (k) => Number(String(k).slice(0, 4));
const monthNum = (k) =>
  isAnnualKey(k) ? null : Number(String(k).slice(5, 7)) || null;

const prevYearOf = (m) =>
  isAnnualKey(m)
    ? String(Number(m) - 1)
    : `${Number(m.slice(0, 4)) - 1}${m.slice(4)}`;

/**
 * Zeros are dropped, not forecast. In this dataset a zero means the month was
 * not collected yet, not that nothing sold: India Tipper carries nine zero
 * months before its real series begins, and Spain has no two-wheeler data at
 * all. Keeping them made a no-data segment "forecast" a flat line at zero.
 */
function buildSeries(data) {
  return Object.entries(data || {})
    .map(([k, v]) => ({ month: String(k).trim(), value: Number(v) }))
    .filter(
      (p) => PERIOD_RE.test(p.month) && Number.isFinite(p.value) && p.value > 0,
    )
    .sort((a, b) => a.month.localeCompare(b.month));
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  if (!s.length) return NaN;
  const h = s.length / 2;
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[h - 1] + s[h]) / 2;
};

/**
 * Months that carry a movable festive peak, by country and year.
 *
 * Diwali: 31 Oct/1 Nov 2024 (the peak split across both months), 20 Oct 2025,
 * 8 Nov 2026, 29 Oct 2027. Without this the forecast repeats last year's
 * festive month, which is wrong in any year the festival moves.
 */
const FESTIVE_MONTHS = {
  india: { 2024: [10, 11], 2025: [10], 2026: [11], 2027: [10] },
};

const MAX_GROWTH = 0.35;

/** Trailing-12 vs previous-12 level, falling back to recent year-over-year. */
function estimateGrowth(series, byKey) {
  const values = series.map((p) => p.value);
  if (values.length >= 24) {
    const last12 = mean(values.slice(-12));
    const prev12 = mean(values.slice(-24, -12));
    if (prev12 > 0 && Number.isFinite(last12)) {
      return Math.max(-MAX_GROWTH, Math.min(MAX_GROWTH, last12 / prev12 - 1));
    }
  }
  const yoy = [];
  for (const p of series) {
    const prev = byKey[prevYearOf(p.month)];
    if (prev > 0) yoy.push(p.value / prev - 1);
  }
  if (!yoy.length) return 0;
  return Math.max(-MAX_GROWTH, Math.min(MAX_GROWTH, median(yoy.slice(-6))));
}

/**
 * Ordinary (non-festive) monthly level, and how much a festive month lifts
 * above it. Both measured from the market's own history.
 */
function festiveProfile(series, festiveByYear) {
  const isFestive = (k) => {
    const list = festiveByYear?.[yearOf(k)];
    return Array.isArray(list) && list.includes(monthNum(k));
  };

  const recent = series.slice(-12);
  const ordinaryRecent = recent.filter((p) => !isFestive(p.month));
  const level = mean(
    (ordinaryRecent.length >= 6 ? ordinaryRecent : recent).map((p) => p.value),
  );

  // Uplift per year that has both festive and ordinary months on record.
  const byYear = new Map();
  for (const p of series) {
    const y = yearOf(p.month);
    if (!byYear.has(y)) byYear.set(y, { fest: [], ord: [] });
    (isFestive(p.month) ? byYear.get(y).fest : byYear.get(y).ord).push(p.value);
  }
  const ratios = [];
  for (const { fest, ord } of byYear.values()) {
    if (!fest.length || ord.length < 6) continue;
    const o = mean(ord);
    if (o > 0) ratios.push(mean(fest) / o);
  }

  return {
    isFestive,
    level,
    uplift: ratios.length ? median(ratios) : null,
  };
}

/**
 * The candidate forecasters. Each takes a history and a list of target months
 * and returns { month: value }, or null if this history cannot support it.
 *
 * They deliberately disagree: one replays last year, one rebuilds the month
 * from a seasonal profile fitted across ALL years, one is pure level-and-trend.
 * Which of them is right is a property of the market, not something to decide
 * once in code — that is what the backtest below is for.
 */
function buildCandidates(series, festiveByYear) {
  const list = [];

  const at = (s) => Object.fromEntries(s.map((p) => [p.month, p.value]));
  const growthOf = (s) => estimateGrowth(s, at(s));

  // 1. Seasonal naive: last year's same month, unchanged. The honest baseline
  //    every other method has to beat.
  list.push({
    name: "seasonal-naive",
    forecast: (s, targets) => {
      const map = at(s);
      const out = {};
      for (const t of targets) {
        const a = map[prevYearOf(t)];
        if (!(a > 0)) return null;
        out[t] = a;
      }
      return out;
    },
  });

  // 2. Year-over-year anchor with the market's growth, damped across the
  //    horizon.
  list.push({
    name: "yoy",
    forecast: (s, targets) => {
      const map = at(s);
      const g = growthOf(s);
      const out = {};
      targets.forEach((t, i) => {
        const a = map[prevYearOf(t)];
        if (!(a > 0)) return;
        out[t] = a * (1 + g * (1 - 0.06 * i));
      });
      return Object.keys(out).length === targets.length ? out : null;
    },
  });

  // 3. Trailing level x seasonal index fitted across every year available.
  //    Differs from (2) wherever last year's month was itself unusual.
  list.push({
    name: "level-seasonal",
    forecast: (s, targets) => {
      const idx = seasonalIndices(s);
      if (!idx) return null;
      const vals = s.map((p) => p.value);
      if (vals.length < 12) return null;
      const level = mean(vals.slice(-12));
      const g = growthOf(s);
      const out = {};
      targets.forEach((t, i) => {
        const m = monthNum(t);
        const f = m && idx[m] > 0 ? idx[m] : 1;
        out[t] = level * f * (1 + g * ((i + 1) / targets.length));
      });
      return out;
    },
  });

  // 4. Damped-trend Holt-Winters. Strong on long, smooth histories; degrades
  //    to a ramp on short ones, which the backtest will punish.
  list.push({
    name: "damped-trend",
    forecast: (s, targets) => {
      const hw = holtWinters(
        s.map((p) => p.value),
        targets.length,
      );
      if (!Array.isArray(hw)) return null;
      const out = {};
      targets.forEach((t, i) => {
        out[t] = hw[i];
      });
      return out;
    },
  });

  // 5. Festive-aware, only where a movable-festival calendar is known. Rebuilds
  //    the peak on the month that actually holds the festival this year.
  if (festiveByYear) {
    list.push({
      name: "festive",
      forecast: (s, targets) => {
        const profile = festiveProfile(s, festiveByYear);
        if (!profile?.uplift || !(profile.level > 0)) return null;
        const map = at(s);
        const idx = seasonalIndices(s);
        const g = growthOf(s);
        const out = {};
        targets.forEach((t, i) => {
          const grown = 1 + g * (1 - 0.06 * i);
          const m = monthNum(t);
          const thisYear = festiveByYear[yearOf(t)];
          if (Array.isArray(thisYear) && thisYear.includes(m)) {
            out[t] = profile.level * grown * profile.uplift;
            return;
          }
          if (profile.isFestive(prevYearOf(t))) {
            const f = idx && m && idx[m] > 0 ? idx[m] : 1;
            out[t] = profile.level * grown * f;
            return;
          }
          const a = map[prevYearOf(t)];
          out[t] = a > 0 ? a * grown : profile.level * grown;
        });
        return out;
      },
    });
  }

  return list;
}

/**
 * Score each candidate on months it did NOT see.
 *
 * The last few months are held out, every method forecasts them from the
 * truncated history, and the mean absolute percentage error against the real
 * values decides how much that method is trusted here. This is why the answer
 * can differ market by market without anyone choosing a rule per market.
 */
function scoreCandidates(candidates, series) {
  const holdout = Math.min(6, Math.floor(series.length / 4));
  if (holdout < 2) return [];

  const train = series.slice(0, -holdout);
  const test = series.slice(-holdout);
  const targets = test.map((p) => p.month);

  const scored = [];
  for (const c of candidates) {
    let pred = null;
    try {
      pred = c.forecast(train, targets);
    } catch {
      pred = null;
    }
    if (!pred) continue;

    let errSum = 0;
    let n = 0;
    for (const p of test) {
      const f = Number(pred[p.month]);
      if (!Number.isFinite(f) || f <= 0 || !(p.value > 0)) continue;
      errSum += Math.abs(f - p.value) / p.value;
      n++;
    }
    if (n < holdout) continue;
    scored.push({ ...c, mape: errSum / n });
  }

  return scored.sort((a, b) => a.mape - b.mape);
}

/**
 * Accuracy-weighted blend of the candidates, using the FULL history.
 *
 * Weights go as 1/error^2, so a clearly better method dominates while a close
 * second still contributes — which is what keeps the line from snapping between
 * methods month to month. Anything more than twice the best method's error is
 * dropped rather than allowed to drag the result.
 */
function blend(scored, series, periods) {
  if (!scored.length) return null;

  const best = scored[0].mape;
  const kept = scored.filter((c) => c.mape <= Math.max(best * 2, best + 0.02));

  const parts = [];
  for (const c of kept) {
    let pred = null;
    try {
      pred = c.forecast(series, periods);
    } catch {
      pred = null;
    }
    if (!pred) continue;
    if (periods.some((p) => !Number.isFinite(Number(pred[p])) || pred[p] <= 0)) {
      continue;
    }
    // Floor the error so a freak-perfect backtest cannot take all the weight.
    const w = 1 / Math.pow(Math.max(c.mape, 0.01), 2);
    parts.push({ name: c.name, mape: c.mape, weight: w, pred });
  }
  if (!parts.length) return null;

  const total = parts.reduce((a, p) => a + p.weight, 0);
  const values = {};
  for (const p of periods) {
    values[p] = parts.reduce((a, part) => a + part.weight * part.pred[p], 0) / total;
  }

  const note = parts
    .map(
      (p) =>
        `${p.name} ${Math.round((p.weight / total) * 100)}% (mape ${(p.mape * 100).toFixed(1)}%)`,
    )
    .join(", ");

  return { values, note };
}

export async function POST(req) {
  try {
    const { region, volumeData, years, useResearch } = await req.json();

    if (!volumeData || !years) {
      return new Response(
        JSON.stringify({ error: "Missing volumeData or years" }),
        { status: 400 },
      );
    }

    // The Flash generator nests the volume map under `data`; the yearly CMS
    // generator sends it flat. Accept either.
    const rawData =
      volumeData && typeof volumeData.data === "object" && volumeData.data
        ? volumeData.data
        : volumeData;

    const series = buildSeries(rawData);
    const periods = (Array.isArray(years) ? years : [])
      .map((y) => String(y).trim())
      .filter((y) => PERIOD_RE.test(y));

    const annual = periods.length > 0 && periods.every(isAnnualKey);
    const minPoints = annual ? 3 : 6;

    if (series.length < minPoints || !periods.length) {
      return new Response(
        JSON.stringify({
          error: `Not enough history to calculate a forecast (${series.length} points, ${minPoints} needed).`,
          code: "INSUFFICIENT_HISTORY",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const byKey = Object.fromEntries(series.map((p) => [p.month, p.value]));
    const values = series.map((p) => p.value);
    const growth = estimateGrowth(series, byKey);

    const out = {};
    let method;
    let weightNote = "";

    if (annual) {
      // No seasonality to carry; compound the trend off the last actual.
      const lastValue = series[series.length - 1].value;
      periods.forEach((p, i) => {
        out[p] = lastValue * Math.pow(1 + growth, i + 1);
      });
      method = "annual-trend";
    } else {
      const festiveByYear = FESTIVE_MONTHS[String(region || "").toLowerCase()];

      const candidates = buildCandidates(series, festiveByYear);
      const scored = scoreCandidates(candidates, series);

      // Accuracy-weighted blend of the methods that actually forecast this
      // market well, rather than one hand-picked rule for every market.
      const ensemble = blend(scored, series, periods);

      if (ensemble) {
        Object.assign(out, ensemble.values);
        method = "ensemble";
        weightNote = ensemble.note;
      } else {
        // Nothing backtested (very short history) — fall back to the single
        // most robust estimator available.
        const fallback =
          candidates.find((c) => c.name === "yoy") || candidates[0];
        Object.assign(out, fallback.forecast(series, periods));
        method = `${fallback.name}-only`;
      }
    }

    // Opt-in only: spends OpenAI credits, so nothing runs unless the caller
    // explicitly asked. A failure leaves the free forecast untouched.
    let researchNote = "off";
    let sourceList = "";
    if (useResearch && !annual) {
      const brief = await liteCountryResearch(region, periods);
      if (brief) {
        const touched = applyResearch(out, periods, brief);
        method = `${method}+research`;
        researchNote = `${brief.cached ? "cached " : ""}trend ${(brief.trend * 100).toFixed(1)}%, ${touched} month(s) adjusted${
          brief.monthly.length
            ? ": " + brief.monthly.map((x) => `${x.month} x${x.factor.toFixed(2)} (${x.why})`).join("; ")
            : ""
        }`;
        sourceList = (brief.sources || []).join(" | ");
      } else {
        researchNote = "unavailable — kept the statistical forecast";
      }
    }

    // Sanity bound from the market's own history — NOT from the Race line.
    // Wide enough to allow a genuine festive peak or a plate-change month,
    // narrow enough to catch a runaway trend.
    const lo = Math.min(...values) * 0.4;
    const hi = Math.max(...values) * 1.6;
    let bounded = 0;
    for (const p of periods) {
      const v = out[p];
      if (!Number.isFinite(v) || v <= 0) {
        out[p] = Math.round(mean(values.slice(-3)));
        continue;
      }
      const c = Math.min(Math.max(v, lo), hi);
      if (c !== v) bounded++;
      out[p] = Math.round(c);
    }

    return new Response(JSON.stringify(out), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "x-forecast-method": method,
        "x-forecast-growth": `${(growth * 100).toFixed(1)}%`,
        "x-forecast-bounded": `${bounded}/${periods.length}`,
        "x-forecast-points": String(series.length),
        // Which methods earned their weight here, and their backtest error.
        "x-forecast-weights": weightNote.slice(0, 300),
        "x-forecast-research": researchNote.replace(/[^\x20-\x7e]/g, "").slice(0, 300),
        "x-forecast-sources": sourceList.slice(0, 1500),
      },
    });
  } catch (err) {
    console.error("Forecast calculation error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
