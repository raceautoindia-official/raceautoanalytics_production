"use client";

import { useMemo } from "react";
import { ChartWrapper } from "@/components/charts/ChartWrapper";
import { BarChart } from "@/components/charts/BarChart";
import { useAppContext } from "@/components/providers/Providers";
import {
  FORECAST_PALETTE,
  shortOemName,
  useSegmentForecastShare,
} from "./useSegmentForecastShare";

interface SegmentForecastShareChartProps {
  /** Same segment string the page passes to the other flash endpoints. */
  segmentName: string;
  title: string;
}

/**
 * OEM share of a segment across the forecast months, drawn as one stacked
 * column per month: X = month, Y = percent, each stack segment an OEM.
 *
 * Data: /api/flash-reports/segment-forecast-share via a shared cached hook, so
 * the rationale table below reuses the same request. The chart is entirely
 * data-driven — adding an OEM in the CMS adds a stack segment here, with no
 * code change.
 *
 * Renders NOTHING when the CMS holds no forecast rows for this segment and
 * country, so segments without the data are not left with an empty frame.
 */
export function SegmentForecastShareChart({
  segmentName,
  title,
}: SegmentForecastShareChartProps) {
  const { region, month } = useAppContext();
  const { months, oems } = useSegmentForecastShare(segmentName, region, month);

  // Short names are the display key, so the legend and tooltip stay readable
  // with ten OEMs. Collisions after shortening keep their full name.
  const series = useMemo(() => {
    const seen = new Map<string, number>();
    return oems.map((oem, i) => {
      const short = shortOemName(oem);
      const n = (seen.get(short) || 0) + 1;
      seen.set(short, n);
      return {
        full: oem,
        label: n > 1 ? oem : short,
        color: FORECAST_PALETTE[i % FORECAST_PALETTE.length],
      };
    });
  }, [oems]);

  // One row per month; each OEM becomes a key on that row.
  const chartData = useMemo(
    () =>
      months.map((m) => {
        const row: Record<string, any> = { name: m.label };
        for (const s of series) row[s.label] = m.values[s.full] ?? 0;
        return row;
      }),
    [months, series],
  );

  const bars = useMemo(
    () =>
      series.map((s) => ({
        key: s.label,
        name: s.label,
        color: s.color,
        // Shared id = the OEMs stack into a single column per month.
        stackId: "share",
      })),
    [series],
  );

  if (!chartData.length || !bars.length) return null;

  const first = months[0]?.label;
  const last = months[months.length - 1]?.label;
  const span = first && last && first !== last ? `${first} – ${last}` : first;

  const avgTotal =
    months.reduce(
      (sum, m) => sum + Object.values(m.values).reduce((a, b) => a + b, 0),
      0,
    ) / (months.length || 1);

  const summary = `Projected OEM share of monthly segment volumes, ${span}. Each column is one month, split by manufacturer — together the ${
    series.length
  } OEM${series.length === 1 ? "" : "s"} shown account for about ${avgTotal.toFixed(
    0,
  )}% of the market.`;

  return (
    <ChartWrapper title={title} summary={summary}>
      <BarChart
        data={chartData}
        bars={bars}
        height={360}
        layout="horizontal"
        valueSuffix="%"
        valueDecimals={1}
        maxBarSize={64}
        // Own legend below — the built-in one puts ten long OEM names on one
        // line and truncates them.
        showLegend={false}
      />

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 list-none p-0 m-0">
        {series.map((s) => (
          <li
            key={s.full}
            title={s.full}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <span className="whitespace-nowrap">{s.label}</span>
          </li>
        ))}
      </ul>

      <p style={{ margin: 0, padding: 0 }} className="mt-3 text-sm text-muted-foreground">
        Note: Forecast share of segment volume by OEM. Hover a column for the
        exact share in that month.
      </p>
    </ChartWrapper>
  );
}
