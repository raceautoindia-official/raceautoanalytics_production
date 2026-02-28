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
import { formatNumber } from "@/lib/mockData";
import TipperTable from "@/components/charts/TipperTable";
import TractorTrailerForecast from "@/components/charts/TractorTrailorTable";
import { withCountry } from "@/lib/withCountry";
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

type CvSegmentRow = {
  month: string;
  lcv: number;
  mcv: number;
  hcv: number;
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

// Helper to pick Truck series from overallData, robust to casing + nesting
function pickSeries(row: any, keys: string[]): number {
  if (!row) return 0;

  const source = row.data && typeof row.data === "object" ? row.data : row;
  const lowerMap: Record<string, number> = {};

  for (const [k, v] of Object.entries(source)) {
const num =
  typeof v === "number" ? v : Number(String(v ?? "").replace(/,/g, ""));
if (Number.isFinite(num)) lowerMap[k.toLowerCase()] = num;
  }

  for (const key of keys) {
    const val = lowerMap[key.toLowerCase()];
    if (typeof val === "number") return val;
  }

  return 0;
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
  const [y, m] = (yyyymm || "").split("-");
  const mi = Number(m) - 1;
  return `${MONTHS_TITLE[mi] ?? "Jan"} ${y}`;
}

function sortMonthLabels(a: string, b: string) {
  const [ma, ya] = a.split(" ");
  const [mb, yb] = b.split(" ");

  const ia = MONTHS_TITLE.map((x) => x.toLowerCase()).indexOf(ma.toLowerCase());
  const ib = MONTHS_TITLE.map((x) => x.toLowerCase()).indexOf(mb.toLowerCase());

  const da = new Date(Number(ya), ia === -1 ? 0 : ia, 1);
  const db = new Date(Number(yb), ib === -1 ? 0 : ib, 1);
  return da.getTime() - db.getTime();
}

export default function TrucksPage() {
  const { region, month } = useAppContext();
  const suffix = useMemo(() => {
  const qs = new URLSearchParams();
  if (region) qs.set("country", region);
  if (month) qs.set("month", month);
  const s = qs.toString();
  return s ? `?${s}` : "";
}, [region, month]);
  const [mounted, setMounted] = useState(false);

  // ---- OEM chart (truck market share) ----
  const [oemCompare, setOemCompare] = useState<"mom" | "yoy">("mom");
  const [oemCurrentMonth, setOemCurrentMonth] = useState(month);
  const [oemRaw, setOemRaw] = useState<MarketBackendRow[]>([]);
  const [oemLoading, setOemLoading] = useState(false);
  const [oemError, setOemError] = useState<string | null>(null);

  // ---- Overall timeseries (for Truck forecast) ----
  const [overallData, setOverallData] = useState<any[]>([]);
  const [overallLoading, setOverallLoading] = useState(false);
  const [overallError, setOverallError] = useState<string | null>(null);
  const [overallMeta, setOverallMeta] = useState<any>(null);

  // ---- Segment split donut (LCV/MCV/HCV for trucks) ----
  const [segmentRows, setSegmentRows] = useState<CvSegmentRow[]>([]);
  const [segmentLoading, setSegmentLoading] = useState(false);
  const [segmentError, setSegmentError] = useState<string | null>(null);

  // ---- Application chart (backend via /api/fetchAppData) ----
  const [appRaw, setAppRaw] = useState<any[]>([]);
  const [appLoading, setAppLoading] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [appMonth, setAppMonth] = useState(""); // e.g. 'jan 2025'

  const [graphId, setGraphId] = useState<number | null>(null);

  useEffect(() => {
    setOemCurrentMonth(month);
  }, [month, region]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/flash-reports/config");
      const cfg = await res.json();
      setGraphId(cfg?.truck ?? null);
    })();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ---------- FETCH OEM DATA (truck, market share) ----------
  useEffect(() => {
    let cancelled = false;

    async function loadOemData() {
      try {
        setOemLoading(true);
        setOemError(null);

        const effectiveMonth = oemCurrentMonth || month;
        const shortMonth = getShortMonthFromYyyyMm(effectiveMonth);
        const segmentName = "truck";

        const res = await fetch(
          withCountry(`/api/fetchMarketData?segmentName=${encodeURIComponent(
            segmentName,
          )}&segmentType=market share&mode=${oemCompare}&baseMonth=${encodeURIComponent(
            effectiveMonth,
          )}&selectedMonth=${encodeURIComponent(shortMonth)}`,
            region,
          ),
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch truck OEM data: ${res.status}`);
        }

        const json = (await res.json()) as MarketBackendRow[];
        if (!cancelled) {
          setOemRaw(json || []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setOemError("Failed to load truck OEM market share data");
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
  }, [oemCompare, oemCurrentMonth, month, region]);

useEffect(() => {
  setSegmentRows([]);
  setSegmentError(null);

  setAppRaw([]);
  setAppError(null);
  setAppMonth("");
}, [region]);

  // ---------- PROCESS OEM DATA ----------
  const oemComputed = useMemo(() => {
    if (!oemRaw.length) return null;

    // oemCurrentMonth/month expected "YYYY-MM"
    const effectiveMonth = oemCurrentMonth || month;
    const [yStr, mStr] = (effectiveMonth || "").split("-");
    const baseYear = Number(yStr);
    const baseMonthIndex = Number(mStr) - 1; // 0..11

    if (!baseYear || baseMonthIndex < 0 || baseMonthIndex > 11) return null;

    const shortMonth = MONTHS_SHORT[baseMonthIndex];

    // previous month with rollover (Jan -> Dec prev year)
    const prevMonthIndex = (baseMonthIndex + 11) % 12;
    const prevMonthShort = MONTHS_SHORT[prevMonthIndex];
    const prevMonthYear = baseMonthIndex === 0 ? baseYear - 1 : baseYear;

    const currKey = `${shortMonth} ${baseYear}`;
    const prevKey =
      oemCompare === "mom"
        ? `${prevMonthShort} ${prevMonthYear}`
        : `${shortMonth} ${baseYear - 1}`;

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

    // move "Others" to bottom
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
  }, [oemRaw, oemCurrentMonth, oemCompare, month]);

  const oemSummary = useMemo(() => {
    if (!oemComputed || !oemComputed.chartData.length) {
      return "No truck OEM market share data available for the selected period.";
    }
    const top = oemComputed.chartData[0];
    const delta = top.deltaPct ?? 0;
    const compareLabel =
      oemCompare === "mom" ? "month-on-month" : "year-on-year";

    return `${top.name} leads the truck segment with ${top.current.toFixed(
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

  // ---------- FETCH OVERALL TIMESERIES (for Truck forecast) ----------
  useEffect(() => {
    let cancelled = false;

    async function loadOverall() {
      try {
        setOverallLoading(true);
        setOverallError(null);

        const res = await fetch(
          withCountry(`/api/flash-reports/overall-chart-data?month=${encodeURIComponent(
            month,
          )}&horizon=6`,
            region,
          ),
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
          setOverallError("Failed to load truck volume timeseries data");
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
  }, [month, region]);

  // ---------- FETCH SEGMENT SPLIT (LCV/MCV/HCV for trucks) ----------
  useEffect(() => {
    let cancelled = false;

    async function loadSegments() {
      try {
        setSegmentLoading(true);
        setSegmentError(null);

        const res = await fetch(
         withCountry( `/api/fetchCVSegmentSplit?segmentName=${encodeURIComponent(
            "truck",
          )}&baseMonth=${encodeURIComponent(month)}`,
           region,
          ),
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch truck segment split: ${res.status}`);
        }

        const json = (await res.json()) as CvSegmentRow[];
        if (!cancelled) {
          setSegmentRows(json || []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setSegmentError("Failed to load truck segment split data");
          setSegmentRows([]);
        }
      } finally {
        if (!cancelled) {
          setSegmentLoading(false);
        }
      }
    }

    loadSegments();
    return () => {
      cancelled = true;
    };
  }, [month, region]);

  // ---------- Segment donut data ----------
  const segmentDonutData = useMemo(() => {
    if (!segmentRows.length) return [];

    const wantedLabel = toMonthLabel(month);

    const sorted = [...segmentRows].sort((a, b) =>
      sortMonthLabels(a.month, b.month),
    );

    // pick selected month if present; otherwise fallback to last available
    const picked =
      sorted.find((r) => r.month === wantedLabel) ?? sorted[sorted.length - 1];

    const arr = [
      { name: "LCV", value: Number(picked.lcv ?? 0) || 0 },
      { name: "MCV", value: Number(picked.mcv ?? 0) || 0 },
      { name: "HCV + Others", value: Number(picked.hcv ?? 0) || 0 },
    ]
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);

    return arr;
  }, [segmentRows, month]);

  const segmentTotal = segmentDonutData.reduce(
    (sum, item) => sum + item.value,
    0,
  );
  const leadingSegment = segmentDonutData[0];

  // ---------- FETCH APPLICATION DATA (backend) ----------
  useEffect(() => {
    let cancelled = false;

    async function loadAppData() {
      try {
        setAppLoading(true);
        setAppError(null);

        const res = await fetch(
           withCountry(`/api/fetchAppData?segmentName=${encodeURIComponent(
            "truck",
          )}&segmentType=app&baseMonth=${encodeURIComponent(month)}`,
           region,
          ),
          { cache: "no-store" },
        );

        if (!res.ok) {
          throw new Error(
            `Failed to fetch truck application data: ${res.status}`,
          );
        }

        const json = await res.json();
        if (!cancelled) {
          setAppRaw(json || []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setAppError("Failed to load truck application data");
          setAppRaw([]);
        }
      } finally {
        if (!cancelled) {
          setAppLoading(false);
        }
      }
    }

    loadAppData();
    return () => {
      cancelled = true;
    };
  }, [month, region]);

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
  }, [month, appAvailableMonths, region]);

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

  // ---------- Summary metrics ----------
  const summaryBaseMonth = overallMeta?.baseMonth ?? month;

  const baseIdx = overallData.findIndex((p) => p?.month === summaryBaseMonth);
  const basePoint = baseIdx >= 0 ? overallData[baseIdx] : null;
  const prevPoint = baseIdx > 0 ? overallData[baseIdx - 1] : null;

  const latestTruck = pickSeries(basePoint, ["Truck", "truck"]);
  const prevTruck = pickSeries(prevPoint, ["Truck", "truck"]);

  const growthRate =
    prevTruck > 0
      ? Math.round(((latestTruck - prevTruck) / prevTruck) * 100)
      : 0;

  const pageMonthLabel = new Date(`${month}-01`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

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
              { label: "Flash Reports", href: `/flash-reports${suffix}` },
              {
                label: "Commercial Vehicles",
                href: `/flash-reports/commercial-vehicles${suffix}`,
              },
              { label: "Trucks" },
            ]}
            className="mb-4"
          />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Trucks Market</h1>
              <p className="text-muted-foreground">
                Light, medium, and heavy commercial truck market analysis
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
              <span className="text-muted-foreground">Total Truck Sales:</span>
              <span className="ml-2 font-medium">
                {formatNumber(latestTruck || 0)} units
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Truck Growth Rate:</span>
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

        {/* Charts */}
        <div className="space-y-8">
          {/* 1) OEM Performance – backend market share */}
          <ChartWrapper
            title="Truck OEM Performance"
            summary={oemSummary}
            controls={
              <div className="flex items-center space-x-3">
                <CompareToggle value={oemCompare} onChange={setOemCompare} />
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
                Loading truck OEM market share…
              </div>
            ) : oemChartData.length ? (
              <BarChart
                data={oemChartData}
                bars={[
                  { key: "current", name: "Current Period", color: "#007AFF" },
                  {
                    key: "previous",
                    name:
                      oemCompare === "mom" ? "Previous Month" : "Previous Year",
                    color: "#6B7280",
                  },
                ]}
                height={350}
                layout="horizontal"
                tooltipRenderer={renderOemTooltip}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No truck OEM market share data available for the selected
                period.
              </p>
            )}
          </ChartWrapper>

          {/* 2) Segment split (backend) + 3) Application Chart (backend) */}
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <ChartWrapper
                title="Trucks Segment Contribution"
                summary={
                  leadingSegment
                    ? `${leadingSegment.name} accounts for ${Math.round(
                        ((leadingSegment.value ?? 0) / (segmentTotal || 1)) *
                          100,
                      )}% of truck sales, with other segments supporting freight and construction demand.`
                    : segmentError
                      ? segmentError
                      : "No truck segment distribution data available."
                }
              >
                {segmentError ? (
                  <p className="text-sm text-destructive">{segmentError}</p>
                ) : segmentLoading ? (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    Loading truck segment split…
                  </div>
                ) : segmentDonutData.length ? (
                  <DonutChart
                    data={segmentDonutData}
                    height={330}
                    showLegend={true}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No truck segment distribution data available.
                  </p>
                )}
              </ChartWrapper>
            </div>
            <div className="lg:col-span-2">
              <ChartWrapper
                title="Trucks Application Chart"
                summary={
                  leadingApp && appTotal
                    ? `${leadingApp.name} dominates at ${Math.round(
                        (leadingApp.value / appTotal) * 100,
                      )}% share, with other applications supporting logistics and construction growth.`
                    : appError
                      ? appError
                      : "No application distribution data available."
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
                    Loading truck application data…
                  </div>
                ) : appChartData.length ? (
                  <BarChart
                    data={appChartData}
                    bars={[
                      { key: "value", name: "Applications", color: "#007AFF" },
                    ]}
                    height={350}
                    layout="horizontal"
                    showLegend={false}
                    valueSuffix="%"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No application distribution data available.
                  </p>
                )}
              </ChartWrapper>
            </div>
          </div>

          {/* 4) Forecast (backend) */}
          <ChartWrapper
            title="Trucks Sales Forecast"
            summary={
              overallError
                ? overallError
                : "Forecast based on recent truck volume trends across light, medium, and heavy segments."
            }
          >
            {overallLoading ? (
              <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                Loading truck timeseries…
              </div>
            ) : (
              <LineChart
                overallData={overallData}
                category="Truck"
                height={300}
                allowForecast={!!overallMeta?.allowForecast}
                baseMonth={overallMeta?.baseMonth}
                horizon={overallMeta?.horizon}
                graphId={graphId}
              />
            )}
          </ChartWrapper>

          {/* 5) Tipper & Tractor Trailer (passcode-gated line charts) */}
          <div className="mt-8 space-y-8">
            <TipperTable />
            <TractorTrailerForecast />
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
          <div className="w-80 h-6 bg-muted rounded shimmer mb-4"></div>
          <div className="flex justify-between items-start">
            <div>
              <div className="w-64 h-8 bg-muted rounded shimmer mb-2"></div>
              <div className="w-96 h-5 bg-muted rounded shimmer"></div>
            </div>
            <div className="flex gap-4">
              <div className="w-32 h-10 bg-muted rounded shimmer"></div>
              <div className="w-40 h-10 bg-muted rounded shimmer"></div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {Array.from({ length: 6 }).map((_, i) => (
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
