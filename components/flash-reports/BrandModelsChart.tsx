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

/**
 * Brand → sub-model sales bar chart, shown below the market-share chart on each
 * segment page. Data: /api/flash-reports/model-data (hierarchy models node).
 *
 * Rendered as HORIZONTAL bars (rows): a brand with a single model reads as one
 * clean labeled row instead of a lone oversized column, and the same layout
 * scales cleanly to many models. The month is driven by the PAGE-level month
 * selector (no separate control here). The whole section renders NOTHING when
 * the segment/country/month has no model data — no empty card is left behind.
 */
export function BrandModelsChart({ segmentName, title }: BrandModelsChartProps) {
  const { region, month } = useAppContext();

  const [brands, setBrands] = useState<BrandModels[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

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

  // Keep the selected brand valid across data changes; default to the brand
  // with the most models so the first impression isn't a single-bar view.
  useEffect(() => {
    if (!brands.length) {
      setSelectedBrand(null);
      return;
    }
    setSelectedBrand((prev) => {
      if (prev && brands.some((b) => b.brand === prev)) return prev;
      return [...brands].sort((a, b) => b.models.length - a.models.length)[0]
        .brand;
    });
  }, [brands]);

  const current = useMemo(
    () => brands.find((b) => b.brand === selectedBrand) || null,
    [brands, selectedBrand],
  );

  const chartData = useMemo(
    () => (current?.models ?? []).map((m) => ({ name: m.name, value: m.value })),
    [current],
  );

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

  // Render NOTHING unless there is actual data to show. No loading box, no
  // empty-state card — so segments/countries/months without model data leave
  // no blank section on the page (per requirement).
  if (!current || chartData.length === 0) return null;

  const summary = `${current.brand}: ${current.models.length} model${
    current.models.length === 1 ? "" : "s"
  } with sales data in ${monthLabel}. Select a brand to compare its models.`;

  // Height grows per row so a single model is a compact row; maxBarSize keeps
  // each bar a sensible thickness.
  const chartHeight = Math.max(160, chartData.length * 46 + 72);

  return (
    <ChartWrapper
      title={title}
      summary={summary}
      controls={
        brands.length > 0 ? (
          <label className="inline-flex flex-col items-start">
            <select
              value={selectedBrand ?? ""}
              onChange={(e) => setSelectedBrand(e.target.value)}
              aria-label="Select brand"
              className="h-9 min-w-[9rem] rounded-lg border border-border bg-card px-2 text-xs font-medium focus-ring hover:bg-accent transition-colors sm:px-3 sm:text-sm"
            >
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
        bars={[{ key: "value", name: "Units", color: "#7C3AED" }]}
        height={chartHeight}
        layout="vertical"
        showLegend={false}
        maxBarSize={34}
      />
    </ChartWrapper>
  );
}
