"use client";

import { useState, useEffect, useMemo } from "react";
import { ChartWrapper } from "@/components/charts/ChartWrapper";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RegionSelector } from "@/components/ui/RegionSelector";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { CompareToggle } from "@/components/ui/CompareToggle";
import { useAppContext } from "@/components/providers/Providers";
import {
  formatMonthForDisplay,
  formatNumber,
  generateSegmentData,
} from "@/lib/mockData";
import { ChartSummary } from "@/components/charts/ChartSummary";

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

// Helper to build compare rows from /api/fetchMarketData
function buildCompareData(
  raw: MarketBackendRow[],
  effectiveMonthYyyyMm: string,
  compareMode: "mom" | "yoy",
): {
  chartData: CompareRow[];
  totalCurrent: number;
  totalPrev: number;
  prevKey: string;
  currKey: string;
} | null {
  if (!raw.length) return null;

  // effectiveMonthYyyyMm expected "YYYY-MM"
  const [yStr, mStr] = (effectiveMonthYyyyMm || "").split("-");
  const baseYear = Number(yStr);
  const baseMonthIndex = Number(mStr) - 1; // 0..11

  if (!baseYear || baseMonthIndex < 0 || baseMonthIndex > 11) return null;

  const shortMonth = MONTHS_SHORT[baseMonthIndex];

  // previous month with rollover
  const prevMonthIndex = (baseMonthIndex + 11) % 12;
  const prevMonthShort = MONTHS_SHORT[prevMonthIndex];
  const prevMonthYear = baseMonthIndex === 0 ? baseYear - 1 : baseYear;

  const currKey = `${shortMonth} ${baseYear}`;
  const prevKey =
    compareMode === "mom"
      ? `${prevMonthShort} ${prevMonthYear}`
      : `${shortMonth} ${baseYear - 1}`;

  const rows: CompareRow[] = raw
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

  const othersIndex = rows.findIndex(
    (r) => r.name.toLowerCase().trim() === "others",
  );
  if (othersIndex !== -1) {
    const [others] = rows.splice(othersIndex, 1);
    others.name = "Others";
    rows.push(others);
  }

  const totalCurrent = rows.reduce((sum, r) => sum + r.current, 0);
  const totalPrev = rows.reduce((sum, r) => sum + r.previous, 0);

  return { chartData: rows, totalCurrent, totalPrev, prevKey, currKey };
}

// Helper to pick PV series from overallData, robust to casing + nesting
function pickSeries(row: any, keys: string[]): number {
  if (!row) return 0;

  const source = row.data && typeof row.data === "object" ? row.data : row;
  const lowerMap: Record<string, number> = {};

  for (const [k, v] of Object.entries(source)) {
    if (typeof v === "number") {
      lowerMap[k.toLowerCase()] = v;
    }
  }

  for (const key of keys) {
    const val = lowerMap[key.toLowerCase()];
    if (typeof val === "number") return val;
  }

  return 0;
}

// Tooltip factory for compare charts
function createCompareTooltip(computed: any) {
  return (props: any) => {
    const { active, payload } = props;
    if (!active || !payload || !payload.length || !computed) return null;

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
              {computed.prevKey.toUpperCase()}:
            </span>
            <span className="font-semibold">{row.previous.toFixed(1)}%</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            <span className="font-medium">
              {computed.currKey.toUpperCase()}:
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
}

export default function PassengerVehiclesPage() {
  const { region, month } = useAppContext();
  const [mounted, setMounted] = useState(false);

  // ---- Market OEM (PV) ----
  const [marketCompare, setMarketCompare] = useState<"mom" | "yoy">("mom");
  const [marketCurrentMonth, setMarketCurrentMonth] = useState(month);

  // Sync chart-level month with global month when top MonthSelector changes
  useEffect(() => {
    setMarketCurrentMonth(month);
  }, [month]);
  const [marketRaw, setMarketRaw] = useState<MarketBackendRow[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);

  // ---- EV OEM (PV EV) ----
  const [evCompare, setEvCompare] = useState<"mom" | "yoy">("mom");
  const [evCurrentMonth, setEvCurrentMonth] = useState(month);

  // Sync chart-level month with global month when top MonthSelector changes
  useEffect(() => {
    setEvCurrentMonth(month);
  }, [month]);
  const [evRaw, setEvRaw] = useState<MarketBackendRow[]>([]);
  const [evLoading, setEvLoading] = useState(false);
  const [evError, setEvError] = useState<string | null>(null);

  // ---- Overall timeseries (for PV forecast & summary) ----
  const [overallData, setOverallData] = useState<any[]>([]);
  const [overallLoading, setOverallLoading] = useState(false);
  const [overallError, setOverallError] = useState<string | null>(null);
  const [overallMeta, setOverallMeta] = useState<any>(null);

  // ---- Application chart (backend /api/fetchAppData) ----
  const [appRaw, setAppRaw] = useState<any[]>([]);
  const [appLoading, setAppLoading] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [appMonth, setAppMonth] = useState(""); // 'jan 2025' style

  const [graphId, setGraphId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/flash-reports/config");
      const cfg = await res.json();
      setGraphId(cfg?.pv ?? null);
    })();
  }, []);

  // ---- Segment donut (still mock, no legacy backend for PV split) ----
  const segmentData = generateSegmentData("passenger-vehicles", region);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ---------- FETCH MARKET OEM DATA (PV, market share) ----------
  useEffect(() => {
    let cancelled = false;

    async function loadMarketData() {
      try {
        setMarketLoading(true);
        setMarketError(null);

        const effectiveMonth = marketCurrentMonth || month;
        const shortMonth = getShortMonthFromYyyyMm(effectiveMonth);

        const res = await fetch(
          `/api/fetchMarketData?segmentName=${encodeURIComponent(
            "passenger vehicle",
          )}&segmentType=market share&mode=${marketCompare}&baseMonth=${encodeURIComponent(
            effectiveMonth,
          )}&selectedMonth=${shortMonth}`,
        );

        if (!res.ok) {
          throw new Error(
            `Failed to fetch passenger vehicle OEM data: ${res.status}`,
          );
        }

        const json = (await res.json()) as MarketBackendRow[];
        if (!cancelled) {
          setMarketRaw(json || []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setMarketError(
            "Failed to load passenger vehicle OEM market share data",
          );
          setMarketRaw([]);
        }
      } finally {
        if (!cancelled) setMarketLoading(false);
      }
    }

    loadMarketData();
    return () => {
      cancelled = true;
    };
  }, [marketCompare, marketCurrentMonth, month]);

  // ---------- FETCH EV OEM DATA (PV EV) ----------
  useEffect(() => {
    let cancelled = false;

    async function loadEvData() {
      try {
        setEvLoading(true);
        setEvError(null);

        const effectiveMonth = evCurrentMonth || month;
        const shortMonth = getShortMonthFromYyyyMm(effectiveMonth);

        const res = await fetch(
          `/api/fetchMarketData?segmentName=${encodeURIComponent(
            "passenger vehicle",
          )}&segmentType=ev&mode=${evCompare}&baseMonth=${encodeURIComponent(
            effectiveMonth,
          )}&selectedMonth=${shortMonth}`,
        );

        if (!res.ok) {
          throw new Error(
            `Failed to fetch passenger vehicle EV data: ${res.status}`,
          );
        }

        const json = (await res.json()) as MarketBackendRow[];
        if (!cancelled) {
          setEvRaw(json || []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setEvError("Failed to load passenger vehicle EV share data");
          setEvRaw([]);
        }
      } finally {
        if (!cancelled) setEvLoading(false);
      }
    }

    loadEvData();
    return () => {
      cancelled = true;
    };
  }, [evCompare, evCurrentMonth, month]);

  // ---------- PROCESS MARKET OEM DATA ----------
  const marketComputed = useMemo(
    () =>
      buildCompareData(marketRaw, marketCurrentMonth || month, marketCompare),
    [marketRaw, marketCurrentMonth, marketCompare, month],
  );

  const marketChartData = marketComputed?.chartData.slice(0, 8) ?? [];
  const marketTop = marketComputed?.chartData[0];
  const marketTopDelta = marketTop?.deltaPct ?? 0;

  const marketSummary = useMemo(() => {
    if (!marketComputed || !marketComputed.chartData.length) {
      return "No passenger vehicle OEM market share data available for the selected period.";
    }
    const top = marketComputed.chartData[0];
    const delta = top.deltaPct ?? 0;
    const compareLabel =
      marketCompare === "mom" ? "month-on-month" : "year-on-year";

    return `${
      top.name
    } maintains leadership in passenger vehicles with ${top.current.toFixed(
      1,
    )}% market share, showing ${
      Number.isNaN(delta)
        ? "no"
        : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`
    } ${compareLabel} change versus ${
      marketCompare === "mom" ? "previous month" : "same month last year"
    }.`;
  }, [marketComputed, marketCompare]);

  const renderMarketTooltip = useMemo(
    () => createCompareTooltip(marketComputed),
    [marketComputed],
  );

  // ---------- PROCESS EV OEM DATA ----------
  const evComputed = useMemo(
    () => buildCompareData(evRaw, evCurrentMonth || month, evCompare),
    [evRaw, evCurrentMonth, evCompare, month],
  );

  const evChartData = evComputed?.chartData.slice(0, 8) ?? [];
  const evTop = evComputed?.chartData[0];
  const evTopDelta = evTop?.deltaPct ?? 0;

  const evSummary = useMemo(() => {
    if (!evComputed || !evComputed.chartData.length) {
      return "No passenger vehicle EV share data available for the selected period.";
    }
    const top = evComputed.chartData[0];
    const delta = top.deltaPct ?? 0;
    const compareLabel =
      evCompare === "mom" ? "month-on-month" : "year-on-year";

    return `${
      top.name
    } leads the passenger vehicle EV segment with ${top.current.toFixed(
      1,
    )}% share, showing ${
      Number.isNaN(delta)
        ? "no"
        : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`
    } ${compareLabel} change versus ${
      evCompare === "mom" ? "previous month" : "same month last year"
    }.`;
  }, [evComputed, evCompare]);

  const renderEvTooltip = useMemo(
    () => createCompareTooltip(evComputed),
    [evComputed],
  );

  // ---------- FETCH OVERALL TIMESERIES (for PV forecast & summary) ----------
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
          setOverallError(
            "Failed to load passenger vehicle volume timeseries data",
          );
          setOverallData([]);
        }
      } finally {
        if (!cancelled) setOverallLoading(false);
      }
    }

    loadOverall();
    return () => {
      cancelled = true;
    };
  }, [month]);

  // ---------- FETCH APPLICATION DATA (PV) ----------
  useEffect(() => {
    let cancelled = false;

    async function loadAppData() {
      try {
        setAppLoading(true);
        setAppError(null);

        const res = await fetch(
          `/api/fetchAppData?segmentName=${encodeURIComponent(
            "passenger vehicle",
          )}&segmentType=app&baseMonth=${encodeURIComponent(month)}`,
          { cache: "no-store" },
        );

        if (!res.ok) {
          throw new Error(
            `Failed to fetch passenger vehicle application data: ${res.status}`,
          );
        }

        const json = await res.json();
        if (!cancelled) {
          setAppRaw(json || []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setAppError("Failed to load passenger vehicle application data");
          setAppRaw([]);
        }
      } finally {
        if (!cancelled) setAppLoading(false);
      }
    }

    loadAppData();
    return () => {
      cancelled = true;
    };
  }, [month]);

  const appAvailableMonths = useMemo(() => {
    if (!appRaw.length) return [] as string[];

    const first = appRaw[0] || {};
    return Object.keys(first)
      .filter((key) => key !== "name")
      .sort((a, b) => {
        const [ma, ya] = a.split(" ");
        const [mb, yb] = b.split(" ");

        const ia = MONTHS_SHORT.indexOf(ma.toLowerCase());
        const ib = MONTHS_SHORT.indexOf(mb.toLowerCase());

        const da = new Date(Number(ya), ia === -1 ? 0 : ia, 1);
        const db = new Date(Number(yb), ib === -1 ? 0 : ib, 1);

        return da.getTime() - db.getTime();
      });
  }, [appRaw]);

  // default application month (previous month if present, else latest)
  // default application month: keep in sync with global MonthSelector
  useEffect(() => {
    if (!appAvailableMonths.length) return;

    const [yStr, mStr] = (month || "").split("-");
    const year = Number(yStr);
    const idx = Number(mStr) - 1;

    const key =
      year && idx >= 0 && idx <= 11 ? `${MONTHS_SHORT[idx]} ${year}` : "";

    const fallback =
      key && appAvailableMonths.includes(key)
        ? key
        : appAvailableMonths[appAvailableMonths.length - 1];

    setAppMonth(fallback);
  }, [month, appAvailableMonths]);

  const appChartData = useMemo(() => {
    if (!appMonth || !appRaw.length) return [];

    return appRaw
      .map((item: any) => ({
        name: item.name,
        value: Number(item[appMonth] ?? 0) || 0,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [appRaw, appMonth]);

  const appTotal = appChartData.reduce((sum, item) => sum + item.value, 0);
  const leadingApp = appChartData[0];
  const secondApp = appChartData[1];

  // ---------- Summary metrics ----------
  const summaryBaseMonth = overallMeta?.baseMonth ?? month;
  const baseIdx = overallData.findIndex((p) => p?.month === summaryBaseMonth);
  const basePoint = baseIdx >= 0 ? overallData[baseIdx] : null;
  const prevPoint = baseIdx > 0 ? overallData[baseIdx - 1] : null;

  const latestPV = pickSeries(basePoint, [
    "PV",
    "passenger",
    "passenger vehicle",
  ]);
  const prevPV = pickSeries(prevPoint, [
    "PV",
    "passenger",
    "passenger vehicle",
  ]);

  const growthRate =
    prevPV > 0 ? Math.round(((latestPV - prevPV) / prevPV) * 100) : 0;

  const pageMonthLabel = formatMonthForDisplay(month);

  const segmentTotal = segmentData.reduce((sum, item) => sum + item.value, 0);
  const leadingSegment = segmentData[0];

  const topEvHeaderLabel = evTop
    ? `${evTop.name} (${evTop.current.toFixed(1)}%)`
    : "—";

  if (!mounted) {
    return <PageSkeleton />;
  }

  return (
    <div className="min-h-screen py-0">
      <div className="mx-auto w-[95vw] xl:w-[93vw] 2xl:w-[90vw] max-w-none px-2 sm:px-3 lg:px-4">
        {/* Header */}
        <div className="mb-8">
          <Breadcrumbs
            items={[
              { label: "Flash Reports", href: "/flash-reports" },
              { label: "Passenger Vehicles" },
            ]}
            className="mb-4"
          />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Passenger Vehicles Market
              </h1>
              <p className="text-muted-foreground">
                Cars, SUVs, and personal transportation market analysis
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
              <span className="text-muted-foreground">Total PV Sales:</span>
              <span className="ml-2 font-medium">
                {formatNumber(latestPV || 0)} units
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">PV Growth Rate:</span>
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
              <span className="text-muted-foreground">Top EV OEM:</span>
              <span className="ml-2 font-medium text-primary">
                {topEvHeaderLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-8">
          {/* 1) PV Market OEM Performance */}
          <ChartWrapper
            title="Passenger Vehicle Market Performance"
            summary={marketSummary}
            controls={
              <div className="flex items-center space-x-3">
                <CompareToggle
                  value={marketCompare}
                  onChange={setMarketCompare}
                />
                <MonthSelector
                  value={marketCurrentMonth}
                  onChange={setMarketCurrentMonth}
                  label="Current Month"
                />
              </div>
            }
          >
            {marketError ? (
              <p className="text-sm text-destructive">{marketError}</p>
            ) : marketLoading ? (
              <div className="h-[350px] flex items-center justify-center text-sm text-muted-foreground">
                Loading passenger vehicle OEM market share…
              </div>
            ) : marketChartData.length ? (
              <>
                <BarChart
                  data={marketChartData}
                  bars={[
                    {
                      key: "current",
                      name: "Current Period",
                      color: "#007AFF",
                      useGradient: true,
                    },
                    {
                      key: "previous",
                      name:
                        marketCompare === "mom"
                          ? "Previous Month"
                          : "Previous Year",
                      color: "#6B7280",
                    },
                  ]}
                  height={350}
                  layout="horizontal"
                  tooltipRenderer={renderMarketTooltip}
                />
                {/* <ChartSummary
                  summary={marketSummary}
                  trend={marketTopDelta >= 0 ? "up" : "down"}
                /> */}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No passenger vehicle OEM market share data available for the
                selected period.
              </p>
            )}
          </ChartWrapper>

          {/* 2) PV EV OEM Share Comparison */}
          <ChartWrapper
            title="Passenger Vehicle EV Electric Share Comparison"
            summary={evSummary}
            controls={
              <div className="flex items-center space-x-3">
                <CompareToggle value={evCompare} onChange={setEvCompare} />
                <MonthSelector
                  value={evCurrentMonth}
                  onChange={setEvCurrentMonth}
                  label="Current Month"
                />
              </div>
            }
          >
            {evError ? (
              <p className="text-sm text-destructive">{evError}</p>
            ) : evLoading ? (
              <div className="h-[350px] flex items-center justify-center text-sm text-muted-foreground">
                Loading passenger vehicle EV share…
              </div>
            ) : evChartData.length ? (
              <>
                <BarChart
                  data={evChartData}
                  bars={[
                    {
                      key: "current",
                      name: "Current EV Share",
                      color: "#22C55E",
                      useGradient: true,
                    },
                    {
                      key: "previous",
                      name:
                        evCompare === "mom"
                          ? "Previous Month"
                          : "Previous Year",
                      color: "#6B7280",
                    },
                  ]}
                  height={350}
                  layout="horizontal"
                  tooltipRenderer={renderEvTooltip}
                />
                {/* <ChartSummary
                  summary={evSummary}
                  trend={evTopDelta >= 0 ? "up" : "down"}
                /> */}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No passenger vehicle EV share data available for the selected
                period.
              </p>
            )}
          </ChartWrapper>

          {/* 3) PV Sales Forecast (from overallData) */}
          <ChartWrapper
            title="Passenger Vehicle Sales Forecast"
            summary={
              overallError
                ? overallError
                : "Premium and electric segment growth drives positive forecast trajectory with SUV category leading market expansion."
            }
          >
            {overallLoading ? (
              <div className="h-[350px] flex items-center justify-center text-sm text-muted-foreground">
                Loading passenger vehicle timeseries…
              </div>
            ) : (
              <>
                <LineChart
                  overallData={overallData}
                  category="PV"
                  height={350}
                  allowForecast={!!overallMeta?.allowForecast}
                  baseMonth={overallMeta?.baseMonth}
                  horizon={overallMeta?.horizon}
                  graphId={graphId}
                />
                {/* <ChartSummary
                  summary="Strong consumer confidence, new model launches, and EV adoption support sustained momentum through year-end."
                  trend={growthRate >= 0 ? "up" : "flat"}
                /> */}
              </>
            )}
          </ChartWrapper>

          {/* 4) Application + 5) Segment Distribution */}
          <div className="grid">
            <ChartWrapper
              title="Passenger Vehicle Application Chart"
              summary={
                leadingApp && appTotal
                  ? `${leadingApp.name} dominates at ${Math.round(
                      (leadingApp.value / appTotal) * 100,
                    )}% of passenger vehicle applications, with ${
                      secondApp?.name ?? "other uses"
                    } gaining traction.`
                  : appError
                    ? appError
                    : "No passenger vehicle application distribution data available."
              }
              // controls={
              //   appAvailableMonths.length > 1 && (
              //     <select
              //       value={appMonth}
              //       onChange={(e) => setAppMonth(e.target.value)}
              //       className="border border-border bg-background rounded-md px-3 py-1 text-xs sm:text-sm"
              //     >
              //       {appAvailableMonths.map((m) => (
              //         <option key={m} value={m}>
              //           {m.toUpperCase()}
              //         </option>
              //       ))}
              //     </select>
              //   )
              // }
            >
              {appError ? (
                <p className="text-sm text-destructive">{appError}</p>
              ) : appLoading ? (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  Loading passenger vehicle application data…
                </div>
              ) : appChartData.length ? (
                <>
                  <BarChart
                    data={appChartData}
                    bars={[
                      {
                        key: "value",
                        name: "Applications",
                        color: "#007AFF",
                        useGradient: true,
                      },
                    ]}
                    height={300}
                    layout="horizontal"
                    showLegend={false}
                    valueSuffix="%"
                  />
                  {/* <ChartSummary
                    summary={
                      leadingApp && appTotal
                        ? `${leadingApp.name} remains the primary use case, while ${
                            secondApp?.name ?? "other segments"
                          } show emerging growth opportunities.`
                        : "Application mix remains stable across key use cases."
                    }
                    trend="flat"
                  /> */}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No passenger vehicle application distribution data available.
                </p>
              )}
            </ChartWrapper>

            {/* <ChartWrapper
              title="Passenger Vehicle Segment Distribution"
              summary={
                leadingSegment
                  ? `${leadingSegment.name} leads with ${Math.round(
                      ((leadingSegment.value ?? 0) / (segmentTotal || 1)) * 100
                    )}% share, with SUV-oriented body styles showing the strongest growth momentum.`
                  : "No passenger vehicle segment distribution data available."
              }
            >
              <DonutChart data={segmentData} height={300} showLegend={true} />
              <ChartSummary
                summary={
                  leadingSegment
                    ? "Body-style mix continues to skew toward SUVs and crossovers, while entry hatchbacks remain under pressure."
                    : "Awaiting segment distribution data for deeper mix analysis."
                }
                trend="up"
              />
            </ChartWrapper> */}
          </div>
        </div>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen py-8">
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
          {Array.from({ length: 4 }).map((_, i) => (
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
