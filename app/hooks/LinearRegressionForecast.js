import { useMemo } from 'react';

/**
 * Hook to compute linear regression forecast volumes and percentage changes.
 * @param {number[]} historicalVolumes - Array of historical volume numbers.
 * @param {string[]} forecastYearNames - Array of year labels for the forecast period.
 * @returns {{ year: string; forecastVolume: number; percentageChange: number }[]}
 */
export function useLinearRegressionForecast(historicalVolumes, forecastYearNames) {
  return useMemo(() => {
    const n = historicalVolumes.length;
    if (n === 0 || !forecastYearNames?.length) {
      return [];
    }

    // Compute regression slope and intercept on historical data
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      const x = i + 1;
      const y = historicalVolumes[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Forecast for each year label provided
    const forecasts = [];
    let prevVolume = historicalVolumes[n - 1];
    for (let i = 0; i < forecastYearNames.length; i++) {
      const yearLabel = forecastYearNames[i];
      const xForecast = n + (i + 1);
      const forecastVolume = intercept + slope * xForecast;
      const percentageChange = prevVolume > 0
        ? (forecastVolume - prevVolume) / prevVolume
        : 0;
      forecasts.push({
        year: yearLabel,
        forecastVolume,
        percentageChange,
      });
      prevVolume = forecastVolume;
    }

    return forecasts;
  }, [historicalVolumes, forecastYearNames]);
}
