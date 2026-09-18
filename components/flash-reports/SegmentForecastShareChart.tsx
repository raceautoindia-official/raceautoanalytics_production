"use client";

import { useEffect, useMemo, useState } from "react";
import { ChartWrapper } from "@/components/charts/ChartWrapper";
import { BarChart } from "@/components/charts/BarChart";
import { useAppContext } from "@/components/providers/Providers";
import { withCountry } from "@/lib/withCountry";

type MonthPoint = { month: string; label: string; values: Record<string, number> };

interface SegmentForecastShareChartProps {
  /** Same segment string the page passes to the other flash endpoints. */
  segmentName: string;
  title: string;
}

/**
 * OEM share of a segment across the forecast months, drawn as one stacked
 * column per month: X = month, Y = percent, each stack segment an OEM.
 *
 * Data: /api/flash-reports/segment-forecast-share, which reads the CMS
 * "segment forecast" node beside the segment's "market share" node. The chart
 * is entirely data-driven — adding an OEM in the CMS adds a stack segment here,
 * with no code change.
 *
 * Renders NOTHING when the CMS holds no forecast rows for this segment and
 * country, so segments without the data are not left with an empty frame.
 */

// Distinct hues, dark enough for white labels, stable per position so a given
// OEM keeps its colour as long as the CMS ordering is stable.
const PALETTE = [
  "#2563EB", "#7C3AED", "#0891B2", "#DB2777", "#EA580C",
  "#16A34A", "#CA8A04", "#4F46E5", "#059669", "#BE123C",
];

export function SegmentForecastShareChart({
  segmentName,
  title,
}: SegmentForecastShareChartProps) {
  const { region, month } = useAppContext();

  const [months, setMonths] = useState<MonthPoint[]>([]);
  const [oems, setOems] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const url = withCountry(
          `/api/flash-reports/segment-forecast-share?segmentName=${encodeURIComponent(
            segmentName,
          )}&baseMonth=${encodeURIComponent(month)}&horizon=6`,
          region,
        );
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load forecast share: ${res.status}`);

        const json = await res.json();
        if (cancelled) return;
        setMonths(Array.isArray(json?.months) ? json.months : []);
        setOems(Array.isArray(json?.oems) ? json.oems : []);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setMonths([]);
          setOems([]);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [segmentName, region, month]);

  // One row per month; each OEM becomes a key on that row.
  const chartData = useMemo(
    () =>
      months.map((m) => {
        const row: Record<string, any> = { name: m.label };
        for (const oem of oems) row[oem] = m.values[oem] ?? 0;
        return row;
      }),
    [months, oems],
  );

  const bars = useMemo(
    () =>
      oems.map((oem, i) => ({
        key: oem,
        name: oem,
        color: PALETTE[i % PALETTE.length],
        // Shared id = the OEMs stack into a single column per month.
        stackId: "share",
      })),
    [oems],
  );

  if (!chartData.length || !bars.length) return null;

  const first = months[0]?.label;
  const last = months[months.length - 1]?.label;
  const span = first && last && first !== last ? `${first} – ${last}` : first;

  // Percent of the stack the OEMs cover, averaged across the months. Says
  // plainly whether the column is the whole market or just the tracked OEMs.
  const avgTotal =
    months.reduce(
      (sum, m) => sum + Object.values(m.values).reduce((a, b) => a + b, 0),
      0,
    ) / (months.length || 1);

  const summary = `Forecast OEM share of the segment, ${span}. ${
    oems.length
  } OEM${oems.length === 1 ? "" : "s"} covering about ${avgTotal.toFixed(
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
      />
      <p style={{ margin: 0, padding: 0 }} className="text-sm text-muted-foreground">
        Note: Forecast share of segment volume by OEM. Each column is one month
        and totals the combined share of the OEMs shown.
      </p>
    </ChartWrapper>
  );
}
