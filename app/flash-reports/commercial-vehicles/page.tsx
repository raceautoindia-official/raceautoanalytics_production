"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChartWrapper } from "@/components/charts/ChartWrapper";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RegionSelector } from "@/components/ui/RegionSelector";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { CompareToggle } from "@/components/ui/CompareToggle";
import { useAppContext } from "@/components/providers/Providers";
import { formatNumber } from "@/lib/mockData";
import { Truck, Bus, ChevronRight } from "lucide-react";

const SUB_CATEGORIES = [
  {
    id: "trucks",
    title: "Trucks",
    description: "Light, medium, and heavy commercial trucks",
    icon: Truck,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  {
    id: "buses",
    title: "Buses",
    description: "Public transport, school, and commercial buses",
    icon: Bus,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
  },
];

const MONTHS_SHORT = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

type MarketBackendRow = {
  name: string;
  [key: string]: string | number;
};

type CompareRow = {
  name: string;
  current: number;
  previous: number;
  symbol: "" | "▲" | "▼";
  deltaPct: number | null;
};

type SegmentDonutPoint = {
  name: string;
  value: number;
};

type CvSegmentRow = {
  month: string; // e.g. "Apr 2025"
  lcv?: number;
  mcv?: number;
  hcv?: number;
  [key: string]: string | number | undefined;
};

// Helper: "YYYY-MM" → "jan" etc.
function getShortMonthFromYyyyMm(yyyymm: string): string {
  const parts = yyyymm.split("-");
  if (parts.length !== 2) {
    const now = new Date();
    return MONTHS_SHORT[now.getMonth()];
  }
  const idx = parseInt(parts[1], 10) - 1;
  return MONTHS_SHORT[idx] ?? MONTHS_SHORT[0];
}

// Sort labels like "Apr 2025" chronologically
function sortMonthLabels(a: string, b: string): number {
  const [ma, ya] = a.split(" ");
  const [mb, yb] = b.split(" ");
  const maIdx = MONTHS_SHORT.indexOf(ma.toLowerCase());
  const mbIdx = MONTHS_SHORT.indexOf(mb.toLowerCase());

  const da = new Date(`${ya}-${String(maIdx + 1).padStart(2, "0")}-01`);
  const db = new Date(`${yb}-${String(mbIdx + 1).padStart(2, "0")}-01`);
  return da.getTime() - db.getTime();
}

const MONTHS_TITLE = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function toMonthLabel(yyyymm: string) {
  const [y, m] = yyyymm.split("-");
  const mi = Number(m) - 1;
  return `${MONTHS_TITLE[mi]} ${y}`;
}

export default function CommercialVehiclesPage() {
  const { region, month } = useAppContext();
  const [mounted, setMounted] = useState(false);

  // ---- OEM chart (market share) ----
  const [oemCompare, setOemCompare] = useState<"mom" | "yoy">("mom");
  const [oemCurrentMonth, setOemCurrentMonth] = useState(month);
  const [oemRaw, setOemRaw] = useState<MarketBackendRow[]>([]);
  const [oemLoading, setOemLoading] = useState(false);
  const [oemError, setOemError] = useState<string | null>(null);

  // ---- Forecast line chart data (overall timeseries; CV series) ----
  const [overallData, setOverallData] = useState<any[]>([]);
  const [overallLoading, setOverallLoading] = useState(false);
  const [overallError, setOverallError] = useState<string | null>(null);
  const [overallMeta, setOverallMeta] = useState<any>(null);

  // ---- Segment donut (REAL backend via /api/fetchCVSegmentSplit) ----
  const [segmentData, setSegmentData] = useState<SegmentDonutPoint[]>([]);
  const [segmentLoading, setSegmentLoading] = useState(false);
  const [segmentError, setSegmentError] = useState<string | null>(null);
  const [segmentMonthLabel, setSegmentMonthLabel] = useState<string | null>(
    null,
  );

  const [graphId, setGraphId] = useState<number | null>(null);

  useEffect(() => {
    setOemCurrentMonth(month);
  }, [month]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/flash-reports/config");
      const cfg = await res.json();
      setGraphId(cfg?.cv ?? null);
    })();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ---------- FETCH OEM DATA (commercial vehicle, market share) ----------
  useEffect(() => {
    let cancelled = false;

    async function loadOemData() {
      try {
        setOemLoading(true);
        setOemError(null);

        const effectiveMonth = oemCurrentMonth || month;
        const shortMonth = getShortMonthFromYyyyMm(effectiveMonth);
        const segmentName = "commercial vehicle";

        const res = await fetch(
          `/api/fetchMarketData?segmentName=${encodeURIComponent(
            segmentName,
          )}&segmentType=market share&mode=${oemCompare}&baseMonth=${encodeURIComponent(
            effectiveMonth,
          )}&selectedMonth=${shortMonth}`,
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch CV OEM data: ${res.status}`);
        }

        const json = (await res.json()) as MarketBackendRow[];
        if (!cancelled) {
          setOemRaw(json || []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setOemError(
            "Failed to load commercial vehicle OEM market share data",
          );
          setOemRaw([]);
        }
      } finally {
        if (!cancelled) {
          setOemLoading(false);
        }
      }
    }

    loadOemData();
    return () => {
      cancelled = true;
    };
  }, [oemCompare, oemCurrentMonth, month]);

  // ---------- PROCESS OEM DATA ----------
  const oemComputed = useMemo(() => {
    if (!oemRaw.length) return null;

    const effectiveMonth = oemCurrentMonth || month; // expected "YYYY-MM"
    const [yStr, mStr] = effectiveMonth.split("-");
    const baseYear = Number(yStr);
    const baseMonthIndex = Number(mStr) - 1; // 0..11

    const shortMonth = MONTHS_SHORT[baseMonthIndex] ?? "jan";

    // Previous month (with year rollover)
    const prevMonthIndex = (baseMonthIndex + 11) % 12;
    const prevMonthShort = MONTHS_SHORT[prevMonthIndex];
    const prevMonthYear = baseMonthIndex === 0 ? baseYear - 1 : baseYear;

    const currKey = `${shortMonth} ${baseYear}`;
    const prevKey =
      oemCompare === "mom"
        ? `${prevMonthShort} ${prevMonthYear}` // ✅ handles Jan -> Dec prev year
        : `${shortMonth} ${baseYear - 1}`; // ✅ YoY

    const rows: CompareRow[] = oemRaw
      .map((item) => {
        const prev = parseFloat(String(item[prevKey] ?? "0")) || 0;
        const curr = parseFloat(String(item[currKey] ?? "0")) || 0;

        let symbol: "" | "▲" | "▼" = "";
        if (curr > prev) symbol = "▲";
        else if (curr < prev) symbol = "▼";

        const deltaPct = curr - prev;

        return {
          name: item.name,
          current: curr,
          previous: prev,
          symbol,
          deltaPct,
        };
      })
      .sort((a, b) => b.current - a.current);

    return {
      chartData: rows,
      totalCurrent: rows.reduce((s, r) => s + r.current, 0),
      totalPrev: rows.reduce((s, r) => s + r.previous, 0),
      prevKey,
      currKey,
    };
  }, [oemRaw, oemCurrentMonth, oemCompare, month]);

  const oemSummary = useMemo(() => {
    if (!oemComputed || !oemComputed.chartData.length) {
      return "No commercial vehicle OEM market share data available for the selected period.";
    }
    const top = oemComputed.chartData[0];
    const delta = top.deltaPct ?? 0;
    const compareLabel =
      oemCompare === "mom" ? "month-on-month" : "year-on-year";

    return `${top.name} leads commercial vehicles with ${top.current.toFixed(
      1,
    )}% market share, showing ${
      Number.isNaN(delta)
        ? "no"
        : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`
    } ${compareLabel} change versus ${
      oemCompare === "mom" ? "previous month" : "same month last year"
    }.`;
  }, [oemComputed, oemCompare]);

  const renderOemTooltip = (props: any) => {
    const { active, payload } = props;
    if (!active || !payload || !payload.length || !oemComputed) return null;

    const row = payload[0].payload as CompareRow;
    const delta = row.deltaPct ?? 0;
    const symbol = row.symbol || (delta > 0 ? "▲" : delta < 0 ? "▼" : "•");

    const colorClass =
      delta > 0
        ? "text-emerald-400"
        : delta < 0
          ? "text-rose-400"
          : "text-muted-foreground";

    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg px-4 py-3 shadow-xl">
        <p className="text-sm font-semibold mb-2">{row.name}</p>
        <div className="space-y-1 text-xs">
          <div className="flex items-baseline gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" />
            <span className="font-medium">
              {oemComputed.prevKey.toUpperCase()}:
            </span>
            <span className="font-semibold">{row.previous.toFixed(1)}%</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            <span className="font-medium">
              {oemComputed.currKey.toUpperCase()}:
            </span>
            <span className="font-semibold">{row.current.toFixed(1)}%</span>
          </div>
          <div className={`flex items-baseline gap-2 ${colorClass}`}>
            <span className="font-bold">{symbol}</span>
            <span className="font-medium">Change:</span>
            <span className="font-semibold">
              {delta == null || Number.isNaN(delta)
                ? "–"
                : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ---------- FETCH OVERALL TIMESERIES FOR FORECAST (CV series) ----------
  useEffect(() => {
    let cancelled = false;

    async function loadOverall() {
      try {
        setOverallLoading(true);
        setOverallError(null);

        const res = await fetch(
          `/api/flash-reports/overall-chart-data?month=${encodeURIComponent(
            month,
          )}&horizon=6`,
          { cache: "no-store" },
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch overall chart data: ${res.status}`);
        }

        const json = await res.json();
        if (!cancelled) {
          setOverallData(json?.data || []);
          setOverallMeta(json?.meta || null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setOverallError("Failed to load commercial vehicle timeseries data");
          setOverallData([]);
        }
      } finally {
        if (!cancelled) {
          setOverallLoading(false);
        }
      }
    }

    loadOverall();
    return () => {
      cancelled = true;
    };
  }, [month]);

  // ---------- FETCH SEGMENT SPLIT (REAL backend via /api/fetchCVSegmentSplit) ----------
  useEffect(() => {
    let cancelled = false;

    async function loadSegmentData() {
      try {
        setSegmentLoading(true);
        setSegmentError(null);

        const segmentName = "commercial vehicle";

        const res = await fetch(
          `/api/fetchCVSegmentSplit?segmentName=${encodeURIComponent(
            segmentName,
          )}&baseMonth=${encodeURIComponent(month)}`,
          { cache: "no-store" },
        );

        if (!res.ok) {
          throw new Error(
            `Failed to fetch commercial vehicle segment split: ${res.status}`,
          );
        }

        const rows = (await res.json()) as CvSegmentRow[];
        if (cancelled) return;

        if (!rows || !rows.length) {
          setSegmentData([]);
          setSegmentMonthLabel(null);
          return;
        }

        // Sort by month label "Apr 2025", "May 2025", etc.
        const sortedRows = [...rows].sort((a, b) =>
          sortMonthLabels(a.month, b.month),
        );

        const wantedLabel = toMonthLabel(month);
        const picked =
          sortedRows.find((r) => r.month === wantedLabel) ??
          sortedRows[sortedRows.length - 1]; // fallback

        const pickedLabel = picked.month;

        const donut: SegmentDonutPoint[] = [
          { name: "LCV", value: Number(picked.lcv ?? 0) || 0 },
          { name: "MCV", value: Number(picked.mcv ?? 0) || 0 },
          { name: "HCV + Others", value: Number(picked.hcv ?? 0) || 0 },
        ].filter((x) => x.value > 0);

        setSegmentData(donut);
        setSegmentMonthLabel(pickedLabel);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setSegmentError(
            "Failed to load commercial vehicle segment split data",
          );
          setSegmentData([]);
          setSegmentMonthLabel(null);
        }
      } finally {
        if (!cancelled) {
          setSegmentLoading(false);
        }
      }
    }

    loadSegmentData();
    return () => {
      cancelled = true;
    };
  }, [month]);

  // ---------- SUMMARY METRICS (CV volumes + segment split) ----------
  const summaryBaseMonth = overallMeta?.baseMonth ?? month;

  const baseIdx = overallData.findIndex((p) => p?.month === summaryBaseMonth);
  const basePoint = baseIdx >= 0 ? overallData[baseIdx] : null;
  const prevPoint = baseIdx > 0 ? overallData[baseIdx - 1] : null;

  const latestCV = basePoint?.data?.["CV"] ?? 0;
  const prevCV = prevPoint?.data?.["CV"] ?? 0;

  const growthRate =
    prevCV > 0 ? Math.round(((latestCV - prevCV) / prevCV) * 100) : 0;

  const pageMonthLabel = new Date(`${month}-01`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const leadingSegment = segmentData[0];

  const segmentSummary = useMemo(() => {
    if (!segmentData.length) {
      return "No commercial vehicle segment split data available for the latest period.";
    }

    const top = segmentData[0];
    const total = segmentData.reduce((sum, r) => sum + (r.value || 0), 0);
    const share = total > 0 ? Math.round((top.value / total) * 100) : 0;
    const labelSuffix = segmentMonthLabel ? ` in ${segmentMonthLabel}` : "";

    return `${top.name} dominates commercial vehicle volumes with ~${share}% share${labelSuffix}.`;
  }, [segmentData, segmentMonthLabel]);

  if (!mounted) {
    return <PageSkeleton />;
  }

  const oemChartData = oemComputed?.chartData.slice(0, 6) ?? [];

  return (
    <div className="min-h-screen py-0">
      <div className="mx-auto w-[95vw] xl:w-[93vw] 2xl:w-[90vw] max-w-none px-2 sm:px-3 lg:px-4">
        {/* Header */}
        <div className="mb-8">
          <Breadcrumbs
            items={[
              { label: "Flash Reports", href: "/flash-reports" },
              { label: "Commercial Vehicles" },
            ]}
            className="mb-4"
          />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Commercial Vehicles</h1>
              <p className="text-muted-foreground">
                Trucks, buses, and commercial transportation market analysis
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
            Market Summary - {pageMonthLabel}
          </h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total CV Sales:</span>
              <span className="ml-2 font-medium">
                {formatNumber(latestCV || 0)} units
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">CV Growth Rate:</span>
              <span
                className={`ml-2 font-medium ${
                  growthRate >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {growthRate >= 0 ? "+" : ""}
                {growthRate}% MoM
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Leading Segment:</span>
              <span className="ml-2 font-medium text-primary">
                {leadingSegment?.name ?? "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Sub-categories (Truck / Bus) */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-6">
            Commercial Vehicle Categories
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {SUB_CATEGORIES.map((category, index) => {
              const Icon = category.icon;
              return (
                <Link
                  key={category.id}
                  href={`/flash-reports/commercial-vehicles/${category.id}`}
                  className="group block animate-fade-in hover-lift"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="bg-card border border-border rounded-lg p-6 h-full hover:bg-card/80 transition-all duration-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg ${category.bgColor}`}>
                        <Icon className={`w-6 h-6 ${category.color}`} />
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
                    </div>

                    <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                      {category.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {category.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-8">
          <ChartWrapper
            title="Commercial Vehicles Sales Forecast"
            summary={
              overallError
                ? overallError
                : "Forecast based on recent commercial vehicle volume trends across trucks and buses."
            }
          >
            {overallLoading ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                Loading commercial vehicle timeseries…
              </div>
            ) : (
              <LineChart
                overallData={overallData}
                category="CV"
                height={350}
                allowForecast={!!overallMeta?.allowForecast}
                baseMonth={overallMeta?.baseMonth}
                horizon={overallMeta?.horizon}
                graphId={graphId}
              />
            )}
          </ChartWrapper>
          {/* 2) Segmental split (backend → donut) + 3) Forecast (backend timeseries) */}
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <ChartWrapper
                title="Commercial Vehicles Segmental Split"
                summary={segmentSummary}
              >
                {segmentError ? (
                  <p className="text-sm text-destructive">{segmentError}</p>
                ) : segmentLoading ? (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    Loading segment split…
                  </div>
                ) : segmentData.length ? (
                  <DonutChart
                    data={segmentData}
                    height={300}
                    showLegend={true}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No commercial vehicle segment split data available for this
                    period.
                  </p>
                )}
              </ChartWrapper>
            </div>
            <div className="lg:col-span-2">
              {/* 1) OEM Performance – backend, market share */}
              <ChartWrapper
                title="Commercial Vehicle OEM Performance"
                summary={oemSummary}
                controls={
                  <div className="flex items-center space-x-3">
                    <CompareToggle
                      value={oemCompare}
                      onChange={setOemCompare}
                    />
                    <MonthSelector
                      value={oemCurrentMonth}
                      onChange={setOemCurrentMonth}
                      label="Current Month"
                    />
                  </div>
                }
              >
                {oemError ? (
                  <p className="text-sm text-destructive">{oemError}</p>
                ) : oemLoading ? (
                  <div className="h-[350px] flex items-center justify-center text-sm text-muted-foreground">
                    Loading commercial vehicle OEM market share…
                  </div>
                ) : oemChartData.length ? (
                  <BarChart
                    data={oemChartData}
                    bars={[
                      {
                        key: "current",
                        name: "Current Period",
                        color: "#007AFF",
                      },
                      {
                        key: "previous",
                        name:
                          oemCompare === "mom"
                            ? "Previous Month"
                            : "Previous Year",
                        color: "#6B7280",
                      },
                    ]}
                    height={300}
                    layout="horizontal"
                    tooltipRenderer={renderOemTooltip}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No commercial vehicle OEM market share data available for
                    the selected period.
                  </p>
                )}
              </ChartWrapper>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen py-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="w-64 h-6 bg-muted rounded shimmer mb-4"></div>
          <div className="flex justify-between items-start">
            <div>
              <div className="w-80 h-8 bg-muted rounded shimmer mb-2"></div>
              <div className="w-96 h-5 bg-muted rounded shimmer"></div>
            </div>
            <div className="flex gap-4">
              <div className="w-32 h-10 bg-muted rounded shimmer"></div>
              <div className="w-40 h-10 bg-muted rounded shimmer"></div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="w-full h-32 bg-muted rounded-lg shimmer"
              ></div>
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="w-full h-96 bg-muted rounded-lg shimmer"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
