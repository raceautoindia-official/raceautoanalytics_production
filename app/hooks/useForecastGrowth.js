import { useMemo } from "react";
import {
  seasonalIndices,
  monthOf,
  baselineLevel,
} from "@/lib/forecastSeasonality";

/**
 * Exported as BOTH named + default to match existing imports.
 *
 * Applies the user's BYF scores to the historical trend.
 *
 * The BYF line used to render as a smooth curve with no month-to-month shape,
 * for the same underlying reason the AI line was a straight ramp: it grew at a
 * SINGLE constant rate (the mean of all historical MoM growth), so it could not
 * express seasonality even in a market with a strong festive or monsoon cycle.
 *
 * Now, when month labels are supplied, the trend is fitted on DESEASONALISED
 * history and the market's own month-of-year shape is re-applied to the
 * result. The score still drives direction and magnitude exactly as before.
 *
 * `opts` is optional and the return shape is unchanged, so the existing
 * callers that pass only (volumes, scores) keep their previous behaviour.
 */
export function useForecastGrowth(volumes, scores, opts) {
  const histMonths = opts?.histMonths;
  const forecastMonths = opts?.forecastMonths;

  return useMemo(() => {
    if (!Array.isArray(volumes) || volumes.length < 2) return [];
    if (!Array.isArray(scores) || scores.length === 0) return [];

    // Seasonal indices, only when we know which month each value belongs to.
    let idx = null;
    if (
      Array.isArray(histMonths) &&
      histMonths.length === volumes.length &&
      volumes.length >= 13
    ) {
      const series = volumes
        .map((v, i) => ({ month: histMonths[i], value: Number(v) }))
        .filter((p) => monthOf(p.month) && Number.isFinite(p.value));
      if (series.length === volumes.length) idx = seasonalIndices(series);
    }

    const factorFor = (month) => {
      const cm = monthOf(month);
      const f = cm && idx ? idx[cm] : 1;
      return Number.isFinite(f) && f > 0 ? f : 1;
    };

    // Strip seasonality before measuring the trend, so a festive spike at the
    // end of the history is not mistaken for underlying growth.
    const deseasoned = volumes.map((v, i) =>
      Number.isFinite(v) ? v / (idx ? factorFor(histMonths?.[i]) : 1) : v,
    );

    // Start from the trailing 12-month mean rather than a single
    // deseasonalised month: one noisy seasonal index should not set the level
    // the whole projection is built on.
    let last = baselineLevel(
      volumes.map((v, i) => ({ month: histMonths?.[i], value: Number(v) })),
      idx,
    );
    if (!Number.isFinite(last) || last <= 0) {
      for (let i = deseasoned.length - 1; i >= 0; i--) {
        if (Number.isFinite(deseasoned[i])) {
          last = deseasoned[i];
          break;
        }
      }
    }

    // avg historical growth (on the deseasonalised series)
    const growthRates = [];
    for (let i = 1; i < deseasoned.length; i++) {
      const prev = deseasoned[i - 1];
      const curr = deseasoned[i];
      if (!Number.isFinite(prev) || !Number.isFinite(curr) || prev === 0)
        continue;
      growthRates.push((curr - prev) / prev);
    }
    const avgGrowth =
      growthRates.length > 0
        ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
        : 0;

    // Reference level for the reported "change", on the same (raw) scale the
    // caller sees, so the existing consumers keep comparable numbers.
    const lastRaw = (() => {
      for (let i = volumes.length - 1; i >= 0; i--) {
        if (Number.isFinite(volumes[i])) return volumes[i];
      }
      return 0;
    })();

    let prevForecast = last;

    return scores.map((s, i) => {
      const scorePct = (Number(s) || 0) / 10; // 0..1
      const change = avgGrowth * scorePct;
      const level = prevForecast * (1 + change);
      prevForecast = level;

      // Re-apply the calendar-month shape to the trend level.
      const forecast = level * factorFor(forecastMonths?.[i]);

      return {
        forecast: parseFloat((change * 100).toFixed(2)), // %
        change: parseFloat((forecast - lastRaw).toFixed(2)),
        forecastVolume: parseFloat(forecast.toFixed(2)),
      };
    });
  }, [volumes, scores, histMonths, forecastMonths]);
}

export default useForecastGrowth;
