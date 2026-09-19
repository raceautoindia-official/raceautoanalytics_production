"use client";

import { useMemo } from "react";
import { ChartWrapper } from "@/components/charts/ChartWrapper";
import { BarChart } from "@/components/charts/BarChart";
import { useAppContext } from "@/components/providers/Providers";
import {
  FORECAST_PALETTE,
  OTHERS_COLOR,
  OTHERS_LABEL,
  TOP_OEM_COUNT,
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

  // Only the largest OEMs get their own slice; the rest are grouped. A market
  // like Germany carries 16 OEMs, and a 16-segment column is unreadable — the
  // smallest slices are thinner than the stroke between them.
  const { series, others } = useMemo(() => {
    const top = oems.slice(0, TOP_OEM_COUNT);
    const rest = oems.slice(TOP_OEM_COUNT);
    const seen = new Map<string, number>();
    const list = top.map((oem, i) => {
      const short = shortOemName(oem);
      const n = (seen.get(short) || 0) + 1;
      seen.set(short, n);
      return {
        full: oem,
        label: n > 1 ? oem : short,
        color: FORECAST_PALETTE[i % FORECAST_PALETTE.length],
      };
    });
    return { series: list, others: rest };
  }, [oems]);

  // One row per month; each OEM becomes a key on that row.
  const chartData = useMemo(
    () =>
      months.map((m) => {
        const row: Record<string, any> = { name: m.label };
        for (const s of series) row[s.label] = m.values[s.full] ?? 0;
        if (others.length) {
          row[OTHERS_LABEL] = others.reduce(
            (sum, oem) => sum + (Number(m.values[oem]) || 0),
            0,
          );
        }
        return row;
      }),
    [months, series, others],
  );

  const bars = useMemo(() => {
    const list = series.map((s) => ({
      key: s.label,
      name: s.label,
      color: s.color,
      // Shared id = the OEMs stack into a single column per month.
      stackId: "share",
    }));
    // Grouped remainder sits last, so it reads as the tail of the column.
    if (others.length) {
      list.push({
        key: OTHERS_LABEL,
        name: OTHERS_LABEL,
        color: OTHERS_COLOR,
        stackId: "share",
      });
    }
    return list;
  }, [series, others]);

  if (!chartData.length || !bars.length) return null;

  const first = months[0]?.label;
  const last = months[months.length - 1]?.label;
  const span = first && last && first !== last ? `${first} – ${last}` : first;

  const avgTotal =
    months.reduce(
      (sum, m) => sum + Object.values(m.values).reduce((a, b) => a + b, 0),
      0,
    ) / (months.length || 1);

  const summary = `Projected share of monthly volumes by manufacturer, ${span}. Each column is one month${
    others.length
      ? `, showing the ${series.length} largest OEMs with the remaining ${others.length} grouped as Others`
      : `, split across the ${series.length} OEM${series.length === 1 ? "" : "s"} tracked`
  } — together about ${avgTotal.toFixed(0)}% of the market.`;

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
        // A percentage axis is ambiguous without a title — it could be share,
        // growth or penetration.
        xAxisLabel="Forecast month"
        yAxisLabel="Share of segment (%)"
        // Hovering reports the OEM box under the pointer, not the whole column.
        tooltipShared={false}
        // Own legend below — the built-in one puts ten long OEM names on one
        // line and truncates them.
        showLegend={false}
      />

      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 list-none p-0 m-0">
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
        {others.length > 0 && (
          <li
            title={others.join(", ")}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: OTHERS_COLOR }}
            />
            <span className="whitespace-nowrap">
              {OTHERS_LABEL} ({others.length})
            </span>
          </li>
        )}
      </ul>

      <p
        style={{ padding: 0 }}
        className="mt-4 border-t border-border/60 pt-3 text-sm text-muted-foreground"
      >
        Note: Forecast share of segment volume by OEM. Hover a column for the
        exact share in that month.
      </p>
    </ChartWrapper>
  );
}
