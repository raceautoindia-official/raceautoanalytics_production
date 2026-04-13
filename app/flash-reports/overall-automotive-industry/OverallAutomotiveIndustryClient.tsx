"use client";

import { useEffect, useMemo, useState } from "react";
import { ChartWrapper } from "@/components/charts/ChartWrapper";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RegionSelector } from "@/components/ui/RegionSelector";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { useAppContext } from "@/components/providers/Providers";
import type {
  OverallChartPoint,
  MarketBarRawData,
  OverallAlternatePenetrationResult,
} from "@/lib/flashReportsServer";
import { withCountry } from "@/lib/withCountry";
import { formatGrowthWithYoY } from "@/lib/flashReportSummary";

interface OverallAutomotiveIndustryClientProps {
  initialOverallData: OverallChartPoint[];
  overAllText: any;
  altFuelRaw: MarketBarRawData | null;
  initialOverallAlternatePenetration: OverallAlternatePenetrationResult;
}

const ALT_FUEL_CATEGORIES = ["2W", "3W", "PV", "Tractor", "CV"];

export function OverallAutomotiveIndustryClient({
  initialOverallData,
  overAllText,
  altFuelRaw,
  initialOverallAlternatePenetration,
}: OverallAutomotiveIndustryClientProps) {
  const { region, month } = useAppContext();

  const suffix = useMemo(() => {
    const qs = new URLSearchParams();
    if (region) qs.set("country", region);
    if (month) qs.set("month", month);
    const s = qs.toString();
    return s ? `?${s}` : "";
  }, [region, month]);

  // ---- Line chart data (refetch on month change) ----
  const [overallData, setOverallData] = useState<OverallChartPoint[]>(
    initialOverallData ?? [],
  );
  const [overallMeta, setOverallMeta] = useState<any>(null);
  const [overallLoading, setOverallLoading] = useState(false);
  const [overallTextData, setOverallTextData] = useState<any>(overAllText ?? {});
const [overallTextLoading, setOverallTextLoading] = useState(false);

  const [graphId, setGraphId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const res = await fetch(withCountry("/api/flash-reports/config", region), {
  cache: "no-store",
});
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;

        const id = json?.overall;
        setGraphId(typeof id === "number" ? id : id ? Number(id) : null);
      } catch {
        // ignore
      }
    }

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setOverallLoading(true);
        const res = await fetch(
          withCountry(
            `/api/flash-reports/overall-chart-data?month=${encodeURIComponent(
              month,
            )}&horizon=6`,
            region,
          ),
          { cache: "no-store" },
        );

        const json = await res.json();
        if (cancelled) return;

        setOverallData(json?.data ?? []);
        setOverallMeta(json?.meta ?? null);
      } catch (e) {
        console.error("Failed to refetch overall chart data", e);
        if (!cancelled) {
          setOverallData([]);
          setOverallMeta(null);
        }
      } finally {
        if (!cancelled) setOverallLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [month, region]);

  useEffect(() => {
  let cancelled = false;

  async function loadOverallText() {
    try {
      setOverallTextLoading(true);

      const res = await fetch(
        withCountry("/api/flash-reports/text", region),
        { cache: "no-store" }
      );

      if (!res.ok) {
        throw new Error(`Failed to fetch overall text: ${res.status}`);
      }

      const json = await res.json();

      if (!cancelled) {
        setOverallTextData(json || {});
      }
    } catch (e) {
      console.error("Failed to refetch overall text", e);
      if (!cancelled) {
        setOverallTextData({});
      }
    } finally {
      if (!cancelled) {
        setOverallTextLoading(false);
      }
    }
  }

  loadOverallText();

  return () => {
    cancelled = true;
  };
}, [region]);

const summaryBaseMonth = overallMeta?.baseMonth ?? month;
const baseIdx = overallData.findIndex((p) => p?.month === summaryBaseMonth);
const basePoint = baseIdx >= 0 ? overallData[baseIdx] : null;
const prevPoint = baseIdx > 0 ? overallData[baseIdx - 1] : null;

const prevYearBaseMonth = overallMeta?.prevYearBaseMonth ?? null;
const prevYearBaseData = overallMeta?.prevYearBaseData ?? null;
const prevYearIdx = prevYearBaseMonth
  ? overallData.findIndex((p) => p?.month === prevYearBaseMonth)
  : -1;
const prevYearPoint = prevYearIdx >= 0 ? overallData[prevYearIdx] : null;

const latestTotal = Number(basePoint?.data?.Total ?? NaN);
const previousTotal = Number(prevPoint?.data?.Total ?? NaN);
const previousYearTotal = Number(
  prevYearBaseData?.["Total"] ?? prevYearPoint?.data?.["Total"] ?? NaN,
);

const growthSummary = formatGrowthWithYoY(
  latestTotal,
  previousTotal,
  previousYearTotal,
  1,
);

  const pageMonth = useMemo(() => {
    try {
      return new Date(`${month}-01`).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } catch {
      return month;
    }
  }, [month, region]);

  // ---- Alt-fuel bar data (now refetches on month/region change) ----
  const [altFuelData, setAltFuelData] = useState<MarketBarRawData | null>(
    altFuelRaw ?? null,
  );
  const [altFuelLoading, setAltFuelLoading] = useState(false);

  const [overallAlternatePenetration, setOverallAlternatePenetration] =
    useState<OverallAlternatePenetrationResult>(
      initialOverallAlternatePenetration ?? { value: null, baseMonth: month },
    );
  const [overallAlternatePenetrationLoading, setOverallAlternatePenetrationLoading] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAltFuel() {
      try {
        setAltFuelLoading(true);

        const res = await fetch(
          withCountry(
            `/api/fetchMarketBarData?segmentName=alternative%20fuel&baseMonth=${encodeURIComponent(
              month,
            )}`,
            region,
          ),
          { cache: "no-store" },
        );

        const json = await res.json();
        if (cancelled) return;

        setAltFuelData(json && Object.keys(json).length ? json : null);
      } catch (e) {
        console.error("Failed to refetch alt-fuel comparison data", e);
        if (!cancelled) setAltFuelData(null);
      } finally {
        if (!cancelled) setAltFuelLoading(false);
      }
    }

    loadAltFuel();
    return () => {
      cancelled = true;
    };
  }, [month, region]);

  useEffect(() => {
    let cancelled = false;

    async function loadOverallAlternatePenetration() {
      try {
        setOverallAlternatePenetrationLoading(true);

        const res = await fetch(
          withCountry(
            `/api/flash-reports/overall-alternate-penetration?month=${encodeURIComponent(
              month,
            )}`,
            region,
          ),
          { cache: "no-store" },
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch overall alternate penetration: ${res.status}`);
        }

        const json = await res.json();
        if (cancelled) return;

        setOverallAlternatePenetration({
          value:
            typeof json?.value === "number" && Number.isFinite(json.value)
              ? json.value
              : null,
          baseMonth: json?.baseMonth || month,
        });
      } catch (error) {
        console.error("Failed to refetch overall alternate penetration", error);
        if (!cancelled) {
          setOverallAlternatePenetration({
            value: null,
            baseMonth: month,
          });
        }
      } finally {
        if (!cancelled) setOverallAlternatePenetrationLoading(false);
      }
    }

    loadOverallAlternatePenetration();

    return () => {
      cancelled = true;
    };
  }, [month, region]);

  const overallAlternatePenetrationLabel = useMemo(() => {
    const value = Number(overallAlternatePenetration?.value);
    if (!Number.isFinite(value)) return "—";
    return `${value.toFixed(1)}%`;
  }, [overallAlternatePenetration]);

  const altFuelComparison = useMemo(() => {
    if (!altFuelData) return null;

    const firstCatKey = ALT_FUEL_CATEGORIES.find((cat) => altFuelData[cat]);
    if (!firstCatKey) return null;

    const firstCat = altFuelData[firstCatKey];
    const monthKeys = Object.keys(firstCat);

    if (monthKeys.length === 0) return null;

    const rightMonth = monthKeys[monthKeys.length - 1];
    const leftMonth =
      monthKeys.length > 1 ? monthKeys[monthKeys.length - 2] : null;

    const data = ALT_FUEL_CATEGORIES.map((cat) => {
      const current = altFuelData[cat]?.[rightMonth] ?? 0;
      const previous = leftMonth ? (altFuelData[cat]?.[leftMonth] ?? 0) : 0;
      const delta = leftMonth ? parseFloat((current - previous).toFixed(1)) : 0;

      return {
        name: cat,
        previous,
        current,
        delta,
      };
    }).filter((row) => row.previous !== 0 || row.current !== 0);

    if (!data.length) return null;

    return {
      leftMonth,
      rightMonth,
      data,
    };
  }, [altFuelData]);

  const renderAltFuelTooltip = (props: any) => {
    const { active, payload } = props;
    if (!active || !payload || !payload.length) return null;

    const row = payload[0].payload as {
      name: string;
      previous: number;
      current: number;
      delta: number;
    };

    const delta = row.delta ?? 0;
    const symbol = delta > 0 ? "▲" : delta < 0 ? "▼" : "•";
    const colorClass =
      delta > 0
        ? "text-emerald-400"
        : delta < 0
          ? "text-rose-400"
          : "text-muted-foreground";

    const hasPrev = !!altFuelComparison?.leftMonth;

    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg px-4 py-3 shadow-xl">
        <p className="text-sm font-semibold mb-2">{row.name}</p>
        <div className="space-y-1 text-xs">
          {hasPrev && (
            <div className="flex items-baseline gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" />
              <span className="font-medium">
                {altFuelComparison?.leftMonth}:
              </span>
              <span className="font-semibold">{row.previous.toFixed(1)}%</span>
            </div>
          )}
          <div className="flex items-baseline gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            <span className="font-medium">
              {altFuelComparison?.rightMonth}:
            </span>
            <span className="font-semibold">{row.current.toFixed(1)}%</span>
          </div>
          {hasPrev && (
            <div className={`flex items-baseline gap-2 ${colorClass}`}>
              <span className="font-bold">{symbol}</span>
              <span className="font-medium">Change:</span>
              <span className="font-semibold">
                {Math.abs(delta).toFixed(1)} %
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen py-0">
      <div className="mx-auto w-[95vw] xl:w-[93vw] 2xl:w-[90vw] max-w-none px-2 sm:px-3 lg:px-4">
        {/* Header */}
        <div className="mb-8">
          <Breadcrumbs
            items={[
              { label: "Flash Reports", href: `/flash-reports${suffix}` },
              { label: "Overall Automotive Industry" },
            ]}
            className="mb-4"
          />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Overall Automotive Industry
              </h1>
              <p className="text-muted-foreground">
                Comprehensive market analysis across all vehicle categories and
                segments
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <RegionSelector />
              <MonthSelector />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-8 p-6 bg-card/30 rounded-lg border border-border/50">
          <h2 className="text-lg font-semibold mb-3">
            Market Summary - {pageMonth}
          </h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Market Size:</span>
              <span className="ml-2 font-medium">
                {latestTotal.toLocaleString()} units
              </span>
            </div>
            <div>
  <span className="text-muted-foreground">Growth Rate:</span>
  <span
    className={`ml-2 font-medium ${
      (growthSummary.mom ?? 0) < 0 ? "text-destructive" : "text-success"
    }`}
  >
    {growthSummary.text}
  </span>
</div>
            <div>
  <span className="text-muted-foreground">Overall Alternate Penetration:</span>
  <span className="ml-2 font-medium text-primary">
    {overallAlternatePenetrationLoading && overallAlternatePenetrationLabel === "—"
      ? "Loading…"
      : overallAlternatePenetrationLabel}
  </span>
</div>
          </div>
        </div>

        {/* Charts + content */}
        <div className="space-y-8">
          {/* Line chart */}
          <ChartWrapper
            title="Sales & Forecast"
            summary="Forecast indicates trajectory based on historical volumes and computed projections. Tractors and Construction Equipment are excluded."
          >
            <LineChart
              overallData={overallData}
              category="Total"
              height={350}
              allowForecast={!!overallMeta?.allowForecast}
              country={region}
              baseMonth={overallMeta?.baseMonth}
              horizon={overallMeta?.horizon}
              graphId={graphId}
            />
          </ChartWrapper>

          {/* Main text block below first chart (from old page) */}
          {overallTextData?.overall_oem_main && (
  <div
    className="mt-4 prose prose-invert max-w-none text-sm text-muted-foreground"
    dangerouslySetInnerHTML={{ __html: overallTextData.overall_oem_main }}
  />
)}

          {/* Alt-fuel bar chart from backend */}
          <ChartWrapper
            title="Alternative Fuel Adoption – Segment-wise Comparison"
            summary={
              altFuelComparison
                ? altFuelComparison.leftMonth
                  ? `Comparison of segment-wise alternative fuel share between ${altFuelComparison.leftMonth} and ${altFuelComparison.rightMonth}.`
                  : `Segment-wise alternative fuel share for ${altFuelComparison.rightMonth}.`
                : "Detailed data is available on request. Reach us at info@raceautoindia.com"
            }
          >
            {altFuelLoading ? (
              <div className="h-[350px] flex items-center justify-center text-sm text-muted-foreground">
                Loading alternative fuel comparison…
              </div>
            ) : altFuelComparison ? (
              <BarChart
                data={altFuelComparison.data}
                bars={
                  altFuelComparison.leftMonth
                    ? [
                        {
                          key: "previous",
                          name: altFuelComparison.leftMonth,
                          color: "#6B7280",
                        },
                        {
                          key: "current",
                          name: altFuelComparison.rightMonth,
                          color: "#007AFF",
                        },
                      ]
                    : [
                        {
                          key: "current",
                          name: altFuelComparison.rightMonth,
                          color: "#007AFF",
                        },
                      ]
                }
                height={350}
                layout="vertical"
                showLegend
                tooltipRenderer={renderAltFuelTooltip}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
               
              </p>
            )}
          </ChartWrapper>
{/* 
        {overallTextData?.overall_oem_secondary && (
  <div
    className="mt-4 prose prose-invert max-w-none text-sm text-muted-foreground"
    dangerouslySetInnerHTML={{ __html: overallTextData.overall_oem_secondary }}
  />
)} */}
           
        </div>
      </div>
    </div>
  );
}