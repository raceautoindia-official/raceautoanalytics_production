"use client";

import { useEffect, useMemo, useState } from "react";
import { ChartWrapper } from "@/components/charts/ChartWrapper";
import { BarChart } from "@/components/charts/BarChart";
import { MonthSelector } from "@/components/ui/MonthSelector";
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
 * scales cleanly to many models. The whole section is hidden when the segment/
 * country/month has no model data (no node, no brands, or all-null values).
 */
export function BrandModelsChart({ segmentName, title }: BrandModelsChartProps) {
  const { region, month } = useAppContext();

  const [chartMonth, setChartMonth] = useState(month);
  const [brands, setBrands] = useState<BrandModels[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  // Follow the global month/region selector (same pattern as the OEM chart).
  useEffect(() => {
    setChartMonth(month);
  }, [month, region]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const url = withCountry(
          `/api/flash-reports/model-data?segmentName=${encodeURIComponent(
            segmentName,
          )}&baseMonth=${encodeURIComponent(chartMonth)}`,
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
        if (!cancelled) {
          setError("Failed to load model data");
          setBrands([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [segmentName, region, chartMonth]);

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
      return new Date(`${chartMonth}-01`).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } catch {
      return chartMonth;
    }
  }, [chartMonth]);

  // Hide the whole section when there's nothing to show (matches the OEM/EV
  // chart's showXChartSection pattern) — the user asked for this explicitly.
  const showSection = loading || !!error || brands.length > 0;
  if (!showSection) return null;

  const summary = current
    ? `${current.brand}: ${current.models.length} model${
        current.models.length === 1 ? "" : "s"
      } with sales data in ${monthLabel}. Select a brand to compare its models.`
    : undefined;

  // Height grows per row so a single model is a compact row, many models scroll
  // out naturally; maxBarSize keeps each bar a sensible thickness.
  const chartHeight = Math.max(160, chartData.length * 46 + 72);

  return (
    <ChartWrapper
      title={title}
      summary={summary}
      controls={
        <div className="flex items-center space-x-3">
          {brands.length > 0 && (
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
          )}
          <MonthSelector value={chartMonth} onChange={setChartMonth} label="Month" />
        </div>
      }
    >
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : loading ? (
        <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
          Loading model data…
        </div>
      ) : chartData.length ? (
        <BarChart
          data={chartData}
          bars={[{ key: "value", name: "Units", color: "#7C3AED" }]}
          height={chartHeight}
          layout="vertical"
          showLegend={false}
          maxBarSize={34}
        />
      ) : (
        <div className="flex h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20">
          <div className="mb-2 text-sm font-semibold text-foreground">
            No model data available
          </div>
          <div className="max-w-md px-4 text-center text-xs text-muted-foreground">
            Model-level sales are not yet available for this brand in {monthLabel}.
          </div>
        </div>
      )}
    </ChartWrapper>
  );
}
