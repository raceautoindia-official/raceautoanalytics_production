"use client";

import { useEffect, useMemo, useState } from "react";
import { ChartWrapper } from "@/components/charts/ChartWrapper";
import { BarChart } from "@/components/charts/BarChart";
import { useAppContext } from "@/components/providers/Providers";
import { withCountry } from "@/lib/withCountry";

type ModelPoint = { name: string; value: number };
type BrandModels = { brand: string; models: ModelPoint[] };

interface BrandModelsChartProps {
  /** Same segment string the page passes to /api/fetchMarketData (e.g. "two-wheeler", "passenger vehicle"). */
  segmentName: string;
  title: string;
}

// Sentinel dropdown value for the aggregate "Top 10 brands" view.
const TOP10 = "__top10__";
const TOP_N = 10;

/**
 * Brand → sub-model sales bar chart, shown below the market-share chart on each
 * segment page. Data: /api/flash-reports/model-data (hierarchy models node).
 *
 * The brand dropdown has a "Top 10 brands" option that aggregates each brand's
 * models into a single bar (brand total) and shows the top N brands — plus one
 * entry per brand to drill into that brand's individual models.
 *
 * Rendered as HORIZONTAL bars (rows) so a single model / few brands still read
 * cleanly. The month is driven by the PAGE-level month selector. The whole
 * section renders NOTHING when there is no model data — no empty card is left.
 */
export function BrandModelsChart({ segmentName, title }: BrandModelsChartProps) {
  const { region, month } = useAppContext();

  const [brands, setBrands] = useState<BrandModels[]>([]);
  const [selection, setSelection] = useState<string>(TOP10);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const url = withCountry(
          `/api/flash-reports/model-data?segmentName=${encodeURIComponent(
            segmentName,
          )}&baseMonth=${encodeURIComponent(month)}`,
          region,
        );

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load model data: ${res.status}`);

        const json = await res.json();
        if (!cancelled) {
          setBrands(Array.isArray(json?.brands) ? json.brands : []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setBrands([]);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [segmentName, region, month]);

  // Keep the selection valid across data changes; default to the Top 10 view.
  useEffect(() => {
    if (!brands.length) return;
    setSelection((prev) => {
      if (prev === TOP10) return prev;
      if (prev && brands.some((b) => b.brand === prev)) return prev;
      return TOP10;
    });
  }, [brands]);

  const isTop10 = selection === TOP10;

  const chartData = useMemo(() => {
    if (!brands.length) return [] as ModelPoint[];

    if (isTop10) {
      // One bar per brand = sum of that brand's model values; top N by total.
      return brands
        .map((b) => ({
          name: b.brand,
          value: b.models.reduce(
            (sum, m) => sum + (Number.isFinite(m.value) ? Number(m.value) : 0),
            0,
          ),
        }))
        .filter((row) => row.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, TOP_N);
    }

    const current = brands.find((b) => b.brand === selection);
    return (current?.models ?? []).map((m) => ({
      name: m.name,
      value: m.value,
    }));
  }, [brands, selection, isTop10]);

  const monthLabel = useMemo(() => {
    try {
      return new Date(`${month}-01`).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } catch {
      return month;
    }
  }, [month]);

  // Render NOTHING unless there is actual data to show — no empty card.
  if (chartData.length === 0) return null;

  const summary = isTop10
    ? `Top ${chartData.length} brands by total model sales in ${monthLabel}. Pick a brand to break it down by model.`
    : `${selection}: ${chartData.length} model${
        chartData.length === 1 ? "" : "s"
      } with sales data in ${monthLabel}.`;

  // Height grows per row; maxBarSize keeps each bar a sensible thickness.
  const chartHeight = Math.max(160, chartData.length * 46 + 72);

  return (
    <ChartWrapper
      title={title}
      summary={summary}
      controls={
        brands.length > 0 ? (
          <label className="inline-flex flex-col items-start">
            <select
              value={selection}
              onChange={(e) => setSelection(e.target.value)}
              aria-label="Select brand"
              className="h-9 min-w-[9rem] rounded-lg border border-border bg-card px-2 text-xs font-medium focus-ring hover:bg-accent transition-colors sm:px-3 sm:text-sm"
            >
              <option value={TOP10}>Top {TOP_N} brands</option>
              {brands.map((b) => (
                <option key={b.brand} value={b.brand}>
                  {b.brand}
                </option>
              ))}
            </select>
          </label>
        ) : undefined
      }
    >
      <BarChart
        data={chartData}
        bars={[
          {
            key: "value",
            name: isTop10 ? "Total units" : "Units",
            color: isTop10 ? "#2563EB" : "#7C3AED",
          },
        ]}
        height={chartHeight}
        layout="vertical"
        showLegend={false}
        maxBarSize={34}
      />
    </ChartWrapper>
  );
}
