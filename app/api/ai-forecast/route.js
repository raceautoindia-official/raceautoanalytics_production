import { seasonalIndices } from "@/lib/forecastSeasonality";
import { holtWinters } from "@/lib/holtWinters";

export const dynamic = "force-dynamic";

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
 * METHOD, in order of preference:
 *
 *  1. Year-over-year anchoring. Each forecast month starts from the SAME
 *     CALENDAR MONTH one year earlier, grown by the market's own rate. Last
 *     year's actual already contains the seasonal shape, so nothing has to be
 *     inferred. This is what makes Ireland's January plate-change peak and
 *     Finland's winter collapse come out right, where a seasonal index built
 *     from one or two observations per month flattened them into nonsense.
 *
 *  2. Level x seasonal index, when the history does not cover a full year back
 *     from every forecast month.
 *
 *  3. Damped-trend Holt-Winters, when there is too little history for either.
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

export async function POST(req) {
  try {
    const { region, volumeData, years } = await req.json();

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

    if (annual) {
      // No seasonality to carry; compound the trend off the last actual.
      const lastValue = series[series.length - 1].value;
      periods.forEach((p, i) => {
        out[p] = lastValue * Math.pow(1 + growth, i + 1);
      });
      method = "annual-trend";
    } else {
      const festiveByYear = FESTIVE_MONTHS[String(region || "").toLowerCase()];
      const profile = festiveByYear
        ? festiveProfile(series, festiveByYear)
        : null;
      const useFestive = !!(profile && profile.uplift && profile.level > 0);

      // Damped so a growth rate is not compounded unchanged across the horizon.
      const grown = (i) => 1 + growth * (1 - 0.06 * i);

      const idx = seasonalIndices(series);
      const anchored = periods.every((p) => byKey[prevYearOf(p)] > 0);

      periods.forEach((p, i) => {
        const m = monthNum(p);
        const thisYearFestive =
          useFestive &&
          Array.isArray(festiveByYear[yearOf(p)]) &&
          festiveByYear[yearOf(p)].includes(m);

        if (useFestive) {
          // Festive months are rebuilt from the ordinary level and the observed
          // uplift, so the peak lands on the month that actually holds the
          // festival this year rather than the one that held it last year.
          if (thisYearFestive) {
            out[p] = profile.level * grown(i) * profile.uplift;
            return;
          }
          // A month that was festive LAST year cannot be anchored to itself —
          // it would carry a peak that has moved away. Use the ordinary level.
          if (profile.isFestive(prevYearOf(p))) {
            const f = idx && m ? idx[m] : 1;
            out[p] = profile.level * grown(i) * (f > 0 ? f : 1);
            return;
          }
        }

        const anchor = byKey[prevYearOf(p)];
        if (anchor > 0) {
          out[p] = anchor * grown(i);
          return;
        }

        if (idx && m) {
          const level =
            series.length >= 12
              ? mean(values.slice(-12))
              : mean(values.slice(-Math.min(6, values.length)));
          out[p] = level * (idx[m] > 0 ? idx[m] : 1) * grown(i);
          return;
        }

        const hw = holtWinters(values, periods.length);
        out[p] = Array.isArray(hw) && Number.isFinite(hw[i])
          ? hw[i]
          : values[values.length - 1] * grown(i);
      });

      method = useFestive
        ? "yoy-anchored+festive"
        : anchored
          ? "yoy-anchored"
          : idx
            ? "level-x-seasonal"
            : "holt-winters";
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
      },
    });
  } catch (err) {
    console.error("Forecast calculation error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
