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

/**
 * Hues deliberately jump around the wheel between consecutive entries, because
 * neighbouring entries are drawn touching each other in the stack. An evenly
 * walked hue ramp puts blue next to indigo and green next to emerald, which
 * reads as one block; this order keeps every adjacent pair far apart.
 */
const PALETTE = [
  "#2563EB", // blue
  "#F59E0B", // amber
  "#DC2626", // red
  "#10B981", // emerald
  "#7C3AED", // violet
  "#06B6D4", // cyan
  "#EC4899", // pink
  "#84CC16", // lime
  "#F97316", // orange
  "#6366F1", // indigo
  "#14B8A6", // teal
  "#A855F7", // purple
];

// Corporate boilerplate that makes legend entries unreadable once there are ten
// of them ("MARUTI SUZUKI INDIA LTD", "JSW MG MOTOR INDIA PVT LTD").
const NOISE = new Set([
  "LTD", "LIMITED", "PVT", "PRIVATE", "INDIA", "MOTOR", "MOTORS", "GROUP",
  "CARS", "CO", "COMPANY", "CORP", "CORPORATION", "INC", "AUTOMOBILES",
  "AUTOMOBILE", "AUTO", "VEHICLES", "VEHICLE",
]);

/** "MARUTI SUZUKI INDIA LTD" -> "Maruti Suzuki"; "BMW INDIA PVT LTD" -> "BMW". */
export function shortOemName(raw: string): string {
  const tokens = String(raw || "")
    .replace(/\s*-\s*/g, "-")
    .replace(/[.,]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return String(raw || "");

  const kept = [...tokens];
  while (kept.length > 1 && NOISE.has(kept[kept.length - 1].toUpperCase())) {
    kept.pop();
  }

  return kept
    .map((t) =>
      // Keep short tokens as acronyms (BMW, JSW, MG); title-case real words.
      t.length <= 3
        ? t.toUpperCase()
        : t
            .split("-")
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
            .join("-"),
    )
    .join(" ");
}

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
        color: PALETTE[i % PALETTE.length],
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
