/**
 * Seasonality helpers for the Flash AI forecast.
 *
 * Why this exists: the AI forecast was producing perfectly straight lines —
 * 160 of 173 stored series had a constant month-to-month step. Three causes
 * compounded:
 *   1. the prompt demanded values "must not fluctuate erratically" and follow a
 *      "smooth, plausible trend", so the model dutifully returned a ramp;
 *   2. only ~10 months of history was supplied, which is less than one full
 *      year, so no month-of-year cycle was visible to infer from;
 *   3. whatever came back was stored verbatim, with nothing checking it.
 *
 * These helpers derive the real seasonal shape from the market's own history
 * and are used both to steer the prompt and to repair a degenerate response.
 * Nothing here invents data: every index comes from the supplied actuals.
 */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-07" -> 7, else null. */
export function monthOf(key) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(key || "").trim());
  if (!m) return null;
  const n = Number(m[2]);
  return n >= 1 && n <= 12 ? n : null;
}

export function addMonths(key, delta) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(key || "").trim());
  if (!m) return null;
  const total = Number(m[1]) * 12 + (Number(m[2]) - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Sorted [{ month, value }] from a { "YYYY-MM": value } map. */
export function toSeries(data) {
  return Object.entries(data || {})
    .map(([month, v]) => ({ month, value: Number(v) }))
    .filter((p) => monthOf(p.month) && Number.isFinite(p.value))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Multiplicative seasonal index per calendar month, centred on 1.
 *
 * Each point is divided by a centred 12-month moving average to strip the
 * trend, then indices are averaged per calendar month and normalised so they
 * average exactly 1 (so applying them cannot shift the overall level).
 *
 * Returns null when there is less than ~13 months of history, because a
 * seasonal cycle cannot be observed inside a single year.
 */
export function seasonalIndices(series) {
  if (!Array.isArray(series) || series.length < 13) return null;

  const ratios = new Map(); // calendar month -> ratios
  const W = 12;
  const half = W / 2;

  for (let i = half; i + half < series.length; i++) {
    // Centred moving average (even window: half weight on the two ends).
    let sum = 0;
    for (let k = i - half; k <= i + half; k++) {
      const w = k === i - half || k === i + half ? 0.5 : 1;
      sum += series[k].value * w;
    }
    const ma = sum / W;
    if (!Number.isFinite(ma) || ma <= 0) continue;

    const cm = monthOf(series[i].month);
    if (!cm) continue;
    if (!ratios.has(cm)) ratios.set(cm, []);
    ratios.get(cm).push(series[i].value / ma);
  }

  if (ratios.size < 6) return null; // too sparse to be meaningful

  const idx = {};
  for (const [cm, list] of ratios) {
    idx[cm] = list.reduce((a, b) => a + b, 0) / list.length;
  }
  // Fill unobserved months with 1 (neutral), then normalise the mean to 1.
  for (let m = 1; m <= 12; m++) if (!Number.isFinite(idx[m])) idx[m] = 1;
  const mean = Object.values(idx).reduce((a, b) => a + b, 0) / 12;
  if (!Number.isFinite(mean) || mean <= 0) return null;
  for (let m = 1; m <= 12; m++) idx[m] = idx[m] / mean;

  return idx;
}

/** True when consecutive differences are effectively identical — a ramp. */
export function isEffectivelyLinear(values) {
  if (!Array.isArray(values) || values.length < 3) return false;
  const diffs = [];
  for (let i = 1; i < values.length; i++) diffs.push(values[i] - values[i - 1]);
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const scale = Math.max(...values.map(Math.abs)) || 1;
  // Every step within 0.15% of the average step => a straight line.
  return diffs.every((d) => Math.abs(d - mean) <= scale * 0.0015);
}

/** Human-readable seasonality summary for the prompt. */
export function describeSeasonality(idx) {
  if (!idx) return null;
  return Object.keys(idx)
    .map(Number)
    .sort((a, b) => a - b)
    .map((m) => `${MONTHS[m - 1]}: ${(idx[m] * 100).toFixed(1)}% of trend`)
    .join(", ");
}

/**
 * Rebuild a forecast so it follows the market's real seasonal shape.
 *
 * Keeps the model's overall level and direction (a straight-line fit through
 * its own output) and re-imposes the observed seasonal index on top. Used only
 * when the model returns a degenerate ramp, or as the fallback when the model
 * is unavailable.
 */
export function applySeasonality(periods, level, idx) {
  const out = {};
  periods.forEach((p, i) => {
    const cm = monthOf(p);
    const factor = cm && idx ? idx[cm] : 1;
    out[p] = Math.round(level(i) * (Number.isFinite(factor) ? factor : 1));
  });
  return out;
}
