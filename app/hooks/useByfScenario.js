import { useMemo } from "react";
import { seasonalIndices, monthOf } from "@/lib/forecastSeasonality";

/**
 * Build-Your-Forecast projection — YOUR scenario, not the crowd's.
 *
 * Why this is separate from useForecastGrowth: BYF and the ML-Survey line were
 * running the SAME function, differing only in which scores were fed in. When
 * the two score sets were close the lines were numerically identical (both
 * reported -0.6% MoM on the overall-industry chart), so the chart appeared to
 * show two methods agreeing when it was really one method drawn twice.
 *
 * The two now answer genuinely different questions:
 *
 *   ML Survey  - consensus. Averaged respondent scores applied to the market's
 *                own average drift, compounding month over month. It tracks
 *                where the crowd thinks the trend goes.
 *
 *   BYF (here) - scenario. Your score is read as a deviation from the market's
 *                SEASONAL BASELINE, not as an adjustment to the crowd's drift.
 *                A neutral score (5/10) reproduces the baseline exactly; above
 *                or below bends the whole path away from it. There is no
 *                compounding of average growth, so BYF does not inherit the
 *                consensus trend and separates from it wherever your view
 *                differs — which is the entire point of the feature.
 *
 * Both are derived from the same actuals; neither invents movement.
 */

const NEUTRAL_SCORE = 5; // 0..10 scale, 5 = "no change to the baseline"
// How far a full-scale score (0 or 10) bends the path away from the baseline.
// Kept deliberately moderate so a maxed-out score stays inside plausible
// territory rather than producing a number the market has never seen.
const MAX_DEVIATION = 0.18;

export function useByfScenario(volumes, scores, opts) {
  const histMonths = opts?.histMonths;
  const forecastMonths = opts?.forecastMonths;

  return useMemo(() => {
    if (!Array.isArray(volumes) || volumes.length < 2) return [];
    if (!Array.isArray(scores) || scores.length === 0) return [];

    // Seasonal shape from the market's own history, when there is enough of it.
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

    const lastIdx = (() => {
      for (let i = volumes.length - 1; i >= 0; i--) {
        if (Number.isFinite(volumes[i])) return i;
      }
      return -1;
    })();
    if (lastIdx < 0) return [];
    const lastRaw = volumes[lastIdx];

    // Baseline level = the last actual with its own seasonality removed. The
    // seasonal factor is re-applied per forecast month below, so the shape
    // comes from the calendar rather than from the crowd's drift.
    const baseLevel = lastRaw / factorFor(histMonths?.[lastIdx]);

    return scores.map((s, i) => {
      const score = Number(s);
      const safe = Number.isFinite(score) ? score : NEUTRAL_SCORE;
      // -1 .. +1 around neutral
      const tilt = (safe - NEUTRAL_SCORE) / NEUTRAL_SCORE;
      // Ramp the deviation in over the horizon: a view about the future should
      // diverge gradually, not jump in month one.
      const ramp = (i + 1) / scores.length;
      const deviation = tilt * MAX_DEVIATION * ramp;

      const level = baseLevel * (1 + deviation);
      const forecast = level * factorFor(forecastMonths?.[i]);

      return {
        forecast: parseFloat((deviation * 100).toFixed(2)), // % vs baseline
        change: parseFloat((forecast - lastRaw).toFixed(2)),
        forecastVolume: parseFloat(forecast.toFixed(2)),
      };
    });
  }, [volumes, scores, histMonths, forecastMonths]);
}

export default useByfScenario;
