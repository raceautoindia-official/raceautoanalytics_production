import OpenAI from "openai";
import { seasonalIndices } from "@/lib/forecastSeasonality";
import { holtWinters } from "@/lib/holtWinters";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SEGMENT_HINT = {
  "2W": "two-wheeler (motorcycle and scooter)",
  "3W": "three-wheeler",
  PV: "passenger vehicle / passenger car",
  CV: "commercial vehicle",
  TRAC: "agricultural tractor",
  CE: "construction equipment",
  Total: "total automotive market (all vehicle types combined)",
  Truck: "truck",
  Bus: "bus and coach",
  Tipper: "tipper truck",
  Trailer: "tractor-trailer / articulated truck",
};

const prettyRegion = (r) =>
  String(r || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

/**
 * OPTIONAL online-research forecast. Runs ONLY when the caller passes
 * useResearch: true, because it spends OpenAI credits on every call.
 *
 * Two stages, the way a person would do it: find out what is actually
 * happening in the market right now, then forecast with that in hand.
 *
 *   1. RESEARCH — the model is given web search and asked who publishes the
 *      volumes, which months are already published, the recent trend, any
 *      policy change landing in the window, and the festive/plate-change
 *      calendar. Everything must be sourced; unfindable comes back NOT FOUND.
 *
 *   2. FORECAST — history for scale and seasonal shape, the research for
 *      direction and turning points, and the computed statistical forecast as
 *      a stated starting point it must justify departing from.
 *
 * The analyst (Race) line is NEVER sent and never read here. The model is not
 * told what the analyst thinks, so it cannot anchor to it.
 *
 * Returns null on any failure — the caller then keeps the free statistical
 * forecast, so an exhausted key or a bad answer degrades instead of breaking.
 */
async function researchForecast({ region, segHint, series, periods, baseline }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const openai = new OpenAI({ apiKey: key });
  const place = prettyRegion(region);
  const now = new Date();
  const today = `${now.toLocaleString("en-GB", { month: "long" })} ${now.getFullYear()}`;
  const first = periods[0];
  const last = periods[periods.length - 1];
  const values = series.map((p) => p.value);
  const lo = Math.min(...values) * 0.4;
  const hi = Math.max(...values) * 1.6;

  let brief = "";
  let sources = [];
  try {
    const research = await openai.responses.create({
      model: "gpt-4o",
      tools: [{ type: "web_search" }],
      input: `Research the CURRENT state of the ${segHint} market in ${place}, as of ${today}.

Report ONLY what you can source, naming the source and its date:
1. Who publishes monthly sales/registration volumes for this market, and which months are already published — INCLUDING any month between ${first} and ${last}. If an actual figure for one of those months has already been published, state it explicitly.
2. The year-on-year growth trend over the last six months.
3. Any tax, incentive, emissions or registration change affecting demand between ${first} and ${last}.
4. Calendar effects in that window, with dates: festivals that move year to year (for example Diwali in India), plate-change months, winter demand collapse.
5. Any published industry forecast for this market covering that window.

Be concise and factual. Write NOT FOUND for anything you cannot source. Do not speculate.`,
    });
    brief = String(research.output_text || "").trim();
    sources = [
      ...new Set(
        (JSON.stringify(research.output || "").match(/https?:\/\/[^"\\\s)]+/g) || []).map(
          (u) => u.replace(/[.,]+$/, ""),
        ),
      ),
    ].slice(0, 8);
  } catch (e) {
    console.error("ai-forecast: research stage failed:", e?.message || e);
    return null;
  }
  if (!brief) return null;

  const prompt = `You are an automotive market analyst producing a monthly volume forecast for ${place} / ${segHint}.

ACTUAL MONTHLY HISTORY. This is the client's own dataset. Your forecast must be on exactly this scale and definition — not the units used by any news source.
${series.map((p) => `${p.month}: ${p.value.toLocaleString()}`).join("\n")}

STATISTICAL STARTING POINT, computed from that history alone:
${periods.map((p) => `${p}: ${Math.round(baseline[p]).toLocaleString()}`).join("\n")}

MARKET RESEARCH, gathered online just now:
${brief}

How to build the forecast:
- Start from the statistical figures above. Depart from them only where the research gives you a reason you can name — a published actual, a policy change, a festival that has moved, a capacity or model-launch change.
- If the research reports an ALREADY-PUBLISHED actual for one of the forecast months, use it, converted to the scale of the history above.
- Every value must be a realistic monthly volume for THIS dataset. The history runs from ${Math.min(...values).toLocaleString()} to ${Math.max(...values).toLocaleString()}.
- Consecutive months must not move by a constant increment.

Return ONLY a JSON object with exactly these ${periods.length} keys as plain integers (no commas, no units): ${periods.join(", ")}. Add "_why" with one short sentence naming what moved you off the statistical figures.`;

  const ask = async (correction) => {
    const chat = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an automotive market analyst. You ground every forecast in the supplied history and research, and return a strict JSON object.",
        },
        { role: "user", content: correction ? `${prompt}\n\n${correction}` : prompt },
      ],
    });
    let obj;
    try {
      obj = JSON.parse(chat.choices?.[0]?.message?.content || "");
    } catch {
      return { vals: null, reason: "the response was not valid JSON" };
    }
    const vals = {};
    for (const p of periods) {
      const n = Number(obj?.[p]);
      if (Number.isFinite(n) && n > 0) vals[p] = Math.round(n);
    }
    if (Object.keys(vals).length !== periods.length) {
      return { vals: null, reason: `it did not contain all ${periods.length} months as positive numbers` };
    }
    const arr = periods.map((p) => vals[p]);
    if (arr.some((v) => v < lo || v > hi)) {
      return {
        vals: null,
        reason: `the values were off the scale of this market — every month must be between ${Math.round(lo).toLocaleString()} and ${Math.round(hi).toLocaleString()}, in the same units as the history`,
      };
    }
    return { vals, why: String(obj?._why || "").slice(0, 300) };
  };

  try {
    let r = await ask(null);
    if (!r.vals) {
      r = await ask(`Your previous answer was rejected because ${r.reason}. Correct it and return all ${periods.length} months.`);
    }
    if (!r.vals) return null;
    return { values: r.vals, why: r.why || "", sources };
  } catch (e) {
    console.error("ai-forecast: forecast stage failed:", e?.message || e);
    return null;
  }
}

/**
 * Flash / CMS forecast generator.
 *
 * This is a DETERMINISTIC calculation. It makes no OpenAI call, costs nothing
 * to run, and returns the same answer every time for the same history — so a
 * regeneration can be repeated without spending anything or drifting.
 *
 * It is also INDEPENDENT of the analyst (Race) line. Nothing here reads or is
 * bounded by Race: the two lines are separate opinions drawn on one chart, and
 * pinning one to the other made the generated line a visual copy of the other.
 *
 * Replacing the model also removed the only failure mode the CMS still had.
 * The previous version rejected a model answer that broke its guards and gave
 * up after three tries ("did not return a usable forecast"), which is what
 * Spain's Passenger Cars and Truck graphs were hitting. A calculation cannot
 * fail that way: any history long enough to show a trend yields a forecast.
 *
 * METHOD: backtested ensemble.
 *
 * Five forecasters compete — seasonal naive, year-over-year anchoring, level x
 * a seasonal profile fitted across all years, damped-trend Holt-Winters, and a
 * festive-aware variant where a movable-festival calendar is known. They
 * deliberately disagree: one replays last year, one rebuilds the month from
 * every year on record, one ignores seasonality entirely.
 *
 * The last few months are HELD OUT, each method forecasts them from the
 * truncated history, and its mean absolute percentage error against the real
 * values sets its weight (1/error^2). The published line is the weighted blend
 * of those that earn their place.
 *
 * So the method is chosen by evidence per market rather than fixed in code: a
 * market whose last year was atypical leans on the multi-year profile, a smooth
 * one leans on the trend model, and a strongly seasonal one leans on the
 * year-over-year anchor. No value is invented — every candidate is computed
 * from this market's own actuals, and the weights come from measured accuracy.
 *
 * MOVABLE FESTIVALS. A festive peak belongs to an event, not to a calendar
 * month, and year-over-year anchoring cannot know that: Diwali fell in October
 * 2025 and falls in November 2026, so anchoring November to November would
 * carry the wrong month forward. For countries in FESTIVE_MONTHS the festive
 * uplift is measured against that year's ordinary months and re-applied to
 * whichever month actually holds the festival this year.
 *
 * GROWTH is the trailing-12-month level against the previous 12 months where
 * the history allows. That is deliberately slower than a recent year-over-year
 * reading: India's last six YoY figures average about +25%, but every one of
 * them compares a post-GST-cut month against a pre-cut month, so they overstate
 * what carries forward once the base period is itself post-cut.
 */

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
    const { region, volumeData, years, useResearch, categoryName } =
      await req.json();

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
    // explicitly asked. A failure returns null and we keep the free forecast.
    let researchNote = "off";
    let sourceList = "";
    if (useResearch) {
      const segKey = String(categoryName || "")
        .replace(/^Flash\s+/i, "")
        .trim();
      const researched = await researchForecast({
        region,
        segHint: SEGMENT_HINT[segKey] || segKey || "automotive",
        series,
        periods,
        baseline: { ...out },
      });
      if (researched) {
        Object.assign(out, researched.values);
        method = `${method}+research`;
        researchNote = researched.why || "ok";
        sourceList = researched.sources.join(" | ");
      } else {
        researchNote = "failed — kept the statistical forecast";
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
