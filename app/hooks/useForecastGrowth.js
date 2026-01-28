import { useMemo } from "react";

/**
 * Exported as BOTH named + default to match existing imports.
 */
export function useForecastGrowth(volumes, scores) {
  return useMemo(() => {
    if (!Array.isArray(volumes) || volumes.length < 2) return [];
    if (!Array.isArray(scores) || scores.length === 0) return [];

    // last available actual value
    let last = 0;
    for (let i = volumes.length - 1; i >= 0; i--) {
      if (Number.isFinite(volumes[i])) {
        last = volumes[i];
        break;
      }
    }

    // avg historical growth
    const growthRates = [];
    for (let i = 1; i < volumes.length; i++) {
      const prev = volumes[i - 1];
      const curr = volumes[i];
      if (!Number.isFinite(prev) || !Number.isFinite(curr) || prev === 0)
        continue;
      growthRates.push((curr - prev) / prev);
    }
    const avgGrowth =
      growthRates.length > 0
        ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
        : 0;

    let prevForecast = last;

    return scores.map((s, i) => {
      const scorePct = (Number(s) || 0) / 10; // 0..1
      const change = avgGrowth * scorePct;
      const forecast = prevForecast * (1 + change);
      prevForecast = forecast;

      return {
        forecast: parseFloat((change * 100).toFixed(2)), // %
        change: parseFloat((forecast - last).toFixed(2)),
        forecastVolume: parseFloat(forecast.toFixed(2)),
      };
    });
  }, [volumes, scores]);
}

export default useForecastGrowth;
