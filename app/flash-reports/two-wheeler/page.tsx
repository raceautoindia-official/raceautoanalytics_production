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
import { generateSegmentData, formatNumber } from "@/lib/mockData";

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

const MONTHS_ORDER = [
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

// Helper: convert "YYYY-MM" → "jan" etc.
function getShortMonthFromYyyyMm(yyyymm: string): string {
  const parts = yyyymm.split("-");
  if (parts.length !== 2) {
    const now = new Date();
    return MONTHS_SHORT[now.getMonth()];
  }
  const idx = parseInt(parts[1], 10) - 1;
  return MONTHS_SHORT[idx] ?? MONTHS_SHORT[0];
}

// Helper: map backend volume key → canonical category for LineChart
function mapVolumeKeyToCategory(rawKey: string): string | null {
  const k = rawKey.toLowerCase().trim();

  if (
    k === "two wheeler" ||
    k === "two-wheeler" ||
    k === "2 wheeler" ||
    k === "2-wheeler" ||
    k === "2w"
  )
    return "2W";

  if (
    k === "three wheeler" ||
    k === "three-wheeler" ||
    k === "3 wheeler" ||
    k === "3-wheeler" ||
    k === "3w"
  )
    return "3W";

  if (k.startsWith("passeng") || k === "pv") return "PV";

  if (k.includes("tractor") || k === "trac") return "TRAC";

  if (k === "cv" || k.includes("commercial vehicle")) return "CV";

  if (k.includes("truck")) return "Truck";

  if (k.includes("bus")) return "Bus";

  return null;
}

// Client-side version of old transformOverallChartData,
// but returns data in shape expected by new LineChart:
// [{ month: "YYYY-MM", data: { '2W', '3W', 'PV', 'TRAC', 'Truck', 'Bus', 'CV', 'Total' } }]

export default function TwoWheelerPage() {
  const { region, month } = useAppContext();
  const [mounted, setMounted] = useState(false);

  // ---- OEM chart (backend: segmentType=market share) ----
  const [oemCompare, setOemCompare] = useState<"mom" | "yoy">("mom");
  const [oemCurrentMonth, setOemCurrentMonth] = useState(month);

  // Sync chart-level month with global month when top MonthSelector changes
  useEffect(() => {
    setOemCurrentMonth(month);
  }, [month]);
  const [oemRaw, setOemRaw] = useState<MarketBackendRow[]>([]);
  const [oemLoading, setOemLoading] = useState(false);
  const [oemError, setOemError] = useState<string | null>(null);

  // ---- EV chart (backend: segmentType=ev) ----
  const [evCompare, setEvCompare] = useState<"mom" | "yoy">("mom");
  const [evCurrentMonth, setEvCurrentMonth] = useState(month);

  // Sync chart-level month with global month when top MonthSelector changes
  useEffect(() => {
    setEvCurrentMonth(month);
  }, [month]);
  const [evRaw, setEvRaw] = useState<MarketBackendRow[]>([]);
  const [evLoading, setEvLoading] = useState(false);
  const [evError, setEvError] = useState<string | null>(null);

  // ---- Forecast line chart data (overall timeseries, then 2W series inside) ----
  const [overallData, setOverallData] = useState<any[]>([]);
  const [overallLoading, setOverallLoading] = useState(false);
  const [overallError, setOverallError] = useState<string | null>(null);
  const [overallMeta, setOverallMeta] = useState<any>(null);

  // ---- Application chart (backend: fetchAppData) ----
  const [appMonth, setAppMonth] = useState(month);

  // Sync chart-level month with global month when top MonthSelector changes
  useEffect(() => {
    setAppMonth(month);
  }, [month]);
  const [appRaw, setAppRaw] = useState<any[]>([]);
  const [appAvailableMonths, setAppAvailableMonths] = useState<string[]>([]);
  const [appSelectedKey, setAppSelectedKey] = useState<string | null>(null);
  const [appLoading, setAppLoading] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  const [graphId, setGraphId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/flash-reports/config");
      const cfg = await res.json();
      setGraphId(cfg?.tw ?? null);
    })();
  }, []);

  // ---- Segment donut: still mock ----
  const segmentData = generateSegmentData("two-wheeler", region);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ---------- FETCH OEM DATA (market share) ----------
  useEffect(() => {
    let cancelled = false;

    async function loadOemData() {
      try {
        setOemLoading(true);
        setOemError(null);

        const effectiveMonth = oemCurrentMonth || month;
        const shortMonth = getShortMonthFromYyyyMm(effectiveMonth);

        const url = `/api/fetchMarketData?segmentName=two-wheeler&selectedMonth=${shortMonth}&mode=${oemCompare}&segmentType=market share`;

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch OEM data: ${res.status}`);
        }

        const json = (await res.json()) as MarketBackendRow[];
        if (!cancelled) {
          setOemRaw(json || []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setOemError("Failed to load OEM market share data");
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

    const effectiveMonth = oemCurrentMonth || month; // "YYYY-MM"
    const [yStr, mStr] = (effectiveMonth || "").split("-");
    const baseYear = Number(yStr);
    const baseMonthIndex = Number(mStr) - 1;

    if (!baseYear || baseMonthIndex < 0 || baseMonthIndex > 11) return null;

    const shortMonth = MONTHS_SHORT[baseMonthIndex];

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

    const othersIndex = rows.findIndex(
      (r) => r.name.toLowerCase().trim() === "others",
    );
    if (othersIndex !== -1) {
      const [others] = rows.splice(othersIndex, 1);
      others.name = "Others";
      rows.push(others);
    }

    return {
      chartData: rows,
      totalCurrent: rows.reduce((sum, r) => sum + r.current, 0),
      totalPrev: rows.reduce((sum, r) => sum + r.previous, 0),
      prevKey,
      currKey,
    };
  }, [oemRaw, oemCurrentMonth, oemCompare, month]);

  const oemSummary = useMemo(() => {
    if (!oemComputed || !oemComputed.chartData.length) {
      return "No OEM market share data available for the selected period.";
    }
    const top = oemComputed.chartData[0];
    const delta = top.deltaPct ?? 0;
    const compareLabel =
      oemCompare === "mom" ? "month-on-month" : "year-on-year";

    return `${top.name} leads with ${top.current.toFixed(
      1,
    )}% market share, showing ${
      Number.isNaN(delta)
        ? "no"
        : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`
    } ${compareLabel} change versus ${
      oemCompare === "mom" ? "previous month" : "same month last year"
    }`;
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

  // ---------- FETCH EV DATA (segmentType=ev) ----------
  useEffect(() => {
    let cancelled = false;

    async function loadEvData() {
      try {
        setEvLoading(true);
        setEvError(null);

        const effectiveMonth = evCurrentMonth || month;
        const shortMonth = getShortMonthFromYyyyMm(effectiveMonth);

        const url = `/api/fetchMarketData?segmentName=two-wheeler&selectedMonth=${shortMonth}&mode=${evCompare}&segmentType=ev`;

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to fetch EV data: ${res.status}`);
        }
        const json = (await res.json()) as MarketBackendRow[];
        if (!cancelled) {
          setEvRaw(json || []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setEvError("Failed to load EV share data");
          setEvRaw([]);
        }
      } finally {
        if (!cancelled) {
          setEvLoading(false);
        }
      }
    }

    loadEvData();
    return () => {
      cancelled = true;
    };
  }, [evCompare, evCurrentMonth, month]);

  // ---------- PROCESS EV DATA ----------
  const evComputed = useMemo(() => {
    if (!evRaw.length) return null;

    const effectiveMonth = evCurrentMonth || month; // "YYYY-MM"
    const [yStr, mStr] = (effectiveMonth || "").split("-");
    const baseYear = Number(yStr);
    const baseMonthIndex = Number(mStr) - 1;

    if (!baseYear || baseMonthIndex < 0 || baseMonthIndex > 11) return null;

    const shortMonth = MONTHS_SHORT[baseMonthIndex];

    const prevMonthIndex = (baseMonthIndex + 11) % 12;
    const prevMonthShort = MONTHS_SHORT[prevMonthIndex];
    const prevMonthYear = baseMonthIndex === 0 ? baseYear - 1 : baseYear;

    const currKey = `${shortMonth} ${baseYear}`;
    const prevKey =
      evCompare === "mom"
        ? `${prevMonthShort} ${prevMonthYear}`
        : `${shortMonth} ${baseYear - 1}`;

    const rows: CompareRow[] = evRaw
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

    const evRow =
      rows.find(
        (r) =>
          r.name.toLowerCase().includes("ev") ||
          r.name.toLowerCase().includes("electric"),
      ) || null;

    return {
      chartData: rows,
      prevKey,
      currKey,
      evCurrent: evRow?.current ?? null,
      evPrevious: evRow?.previous ?? null,
    };
  }, [evRaw, evCurrentMonth, evCompare, month]);

  const evSummary = useMemo(() => {
    if (!evComputed || !evComputed.chartData.length) {
      return "No alternative fuel / EV share data available for the selected period.";
    }

    const evRow =
      evComputed.chartData.find(
        (r) =>
          r.name.toLowerCase().includes("ev") ||
          r.name.toLowerCase().includes("electric"),
      ) || evComputed.chartData[0];

    const delta =
      evRow.deltaPct == null || Number.isNaN(evRow.deltaPct)
        ? 0
        : evRow.deltaPct;
    const compareLabel =
      evCompare === "mom" ? "month-on-month" : "year-on-year";

    return `${evRow.name} share is ${evRow.current.toFixed(
      1,
    )}% vs ${evRow.previous.toFixed(1)}% in ${
      evCompare === "mom" ? "previous month" : "same month last year"
    }, a ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}% ${compareLabel} change.`;
  }, [evComputed, evCompare]);

  const renderEvTooltip = (props: any) => {
    const { active, payload } = props;
    if (!active || !payload || !payload.length || !evComputed) return null;

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
              {evComputed.prevKey.toUpperCase()}:
            </span>
            <span className="font-semibold">{row.previous.toFixed(1)}%</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            <span className="font-medium">
              {evComputed.currKey.toUpperCase()}:
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

  // ---------- FETCH OVERALL TIMESERIES FOR FORECAST (2W series) ----------
  useEffect(() => {
    let cancelled = false;

    async function loadOverall() {
      try {
        setOverallLoading(true);
        setOverallError(null);

        // ✅ call your own Next API, which uses getOverallChartData() on the server
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
          setOverallError("Failed to load 2W timeseries data");
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

  // ---------- FETCH APPLICATION DATA ----------
  useEffect(() => {
    let cancelled = false;

    async function loadApp() {
      try {
        setAppLoading(true);
        setAppError(null);

        const base = appMonth || month;

        const res = await fetch(
          `/api/fetchAppData?segmentName=two-wheeler&segmentType=app&baseMonth=${encodeURIComponent(
            base,
          )}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          throw new Error(`Failed to fetch application data: ${res.status}`);
        }
        const json = await res.json();
        if (cancelled) return;

        setAppRaw(json || []);

        if (json && json.length) {
          const first = json[0] || {};
          const allKeys = Object.keys(first).filter((k) => k !== "name");

          const sorted = allKeys.sort((a, b) => {
            const [ma, ya] = a.split(" ");
            const [mb, yb] = b.split(" ");
            const maIdx = MONTHS_ORDER.indexOf(ma.toLowerCase());
            const mbIdx = MONTHS_ORDER.indexOf(mb.toLowerCase());

            const da = new Date(
              `${ya}-${String(maIdx + 1).padStart(2, "0")}-01`,
            );
            const db = new Date(
              `${yb}-${String(mbIdx + 1).padStart(2, "0")}-01`,
            );
            return da.getTime() - db.getTime();
          });

          setAppAvailableMonths(sorted);

          const baseMonth = appMonth || month;
          const [yearStr, mmStr] = baseMonth.split("-");
          const short = getShortMonthFromYyyyMm(baseMonth);
          const candidate = `${short} ${yearStr}`;

          const fallback = sorted.includes(candidate)
            ? candidate
            : sorted[sorted.length - 1];

          setAppSelectedKey(fallback);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setAppError("Failed to load application data");
          setAppRaw([]);
          setAppAvailableMonths([]);
          setAppSelectedKey(null);
        }
      } finally {
        if (!cancelled) {
          setAppLoading(false);
        }
      }
    }

    loadApp();
    return () => {
      cancelled = true;
    };
  }, [appMonth, month]);

  // Update selected application month when user changes MonthSelector
  useEffect(() => {
    if (!appAvailableMonths.length) return;

    const baseMonth = appMonth || month;
    const [yearStr] = baseMonth.split("-");
    const short = getShortMonthFromYyyyMm(baseMonth);
    const candidate = `${short} ${yearStr}`;

    const fallback = appAvailableMonths.includes(candidate)
      ? candidate
      : appAvailableMonths[appAvailableMonths.length - 1];

    setAppSelectedKey(fallback);
  }, [appMonth, month, appAvailableMonths]);

  const appBarData = useMemo(() => {
    if (!appSelectedKey || !appRaw.length) return [];
    return appRaw.map((item: any) => ({
      name: item.name,
      value: item[appSelectedKey] ?? 0,
    }));
  }, [appRaw, appSelectedKey]);

  const appSummary = useMemo(() => {
    if (!appBarData.length) {
      return "No application split data available for the selected month.";
    }
    const sorted = [...appBarData].sort((a, b) => b.value - a.value);
    const top = sorted[0];
    const total = sorted.reduce((sum, r) => sum + (r.value || 0), 0);
    const share = total > 0 ? Math.round((top.value / total) * 100) : 0;

    return `${top.name} leads two-wheeler usage with ~${share}% share in ${appSelectedKey}.`;
  }, [appBarData, appSelectedKey]);

  // ---------- SUMMARY METRICS (2W volumes + EV adoption) ----------
  const summaryBaseMonth = overallMeta?.baseMonth ?? month;
  const baseIdx = overallData.findIndex((p) => p?.month === summaryBaseMonth);
  const basePoint = baseIdx >= 0 ? overallData[baseIdx] : null;
  const prevPoint = baseIdx > 0 ? overallData[baseIdx - 1] : null;

  const latest2W = basePoint?.data?.["2W"] ?? 0;
  const prev2W = prevPoint?.data?.["2W"] ?? 0;

  const growthRate =
    prev2W > 0 ? Math.round(((latest2W - prev2W) / prev2W) * 100) : 0;

  const evAdoptionCurrent =
    evComputed?.evCurrent != null && !Number.isNaN(evComputed.evCurrent)
      ? evComputed.evCurrent
      : null;

  const pageMonthLabel = new Date(`${month}-01`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

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
              { label: "Two Wheeler" },
            ]}
            className="mb-4"
          />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Two Wheeler Market</h1>
              <p className="text-muted-foreground">
                Scooters, motorcycles, mopeds, and electric two-wheelers market
                analysis
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
              <span className="text-muted-foreground">Total 2W Sales:</span>
              <span className="ml-2 font-medium">
                {formatNumber(latest2W || 0)} units
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">2W Growth Rate:</span>
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
              <span className="text-muted-foreground">EV Adoption:</span>
              <span className="ml-2 font-medium text-primary">
                {evAdoptionCurrent != null
                  ? `${evAdoptionCurrent.toFixed(1)}%`
                  : "–"}
              </span>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-8">
          {/* 1) OEM Performance – backend, market share */}
          <ChartWrapper
            title="Two-Wheeler OEM Performance"
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
                Loading OEM market share…
              </div>
            ) : oemComputed && oemComputed.chartData.length ? (
              <BarChart
                data={oemComputed.chartData}
                bars={[
                  {
                    key: "current",
                    name: "Current Period",
                    color: "#007AFF",
                  },
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
                No OEM market share data available for the selected period.
              </p>
            )}
          </ChartWrapper>

          {/* 2) EV / alternative fuel share comparison – backend, segmentType=ev */}
          <ChartWrapper
            title="Two-Wheeler EV Electric Share Comparison"
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
              <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                Loading EV / alternative fuel share…
              </div>
            ) : evComputed && evComputed.chartData.length ? (
              <BarChart
                data={evComputed.chartData}
                bars={[
                  {
                    key: "current",
                    name: "Current Period",
                    color: "#2ECC71",
                  },
                  {
                    key: "previous",
                    name:
                      evCompare === "mom" ? "Previous Month" : "Previous Year",
                    color: "#6B7280",
                  },
                ]}
                height={300}
                layout="vertical"
                tooltipRenderer={renderEvTooltip}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No EV / alternative fuel share data available for this period.
              </p>
            )}
          </ChartWrapper>

          {/* 3) 2W Sales Forecast – backend timeseries via contentHierarchy + volumeData */}
          <ChartWrapper
            title="Two-Wheeler Sales Forecast"
            summary={
              overallError
                ? overallError
                : "Forecast based on recent two-wheeler volume trends across all segments."
            }
          >
            {overallLoading ? (
              <div className="h-[350px] flex items-center justify-center text-sm text-muted-foreground">
                Loading two-wheeler timeseries…
              </div>
            ) : (
              <LineChart
                overallData={overallData}
                category="2W"
                height={350}
                allowForecast={!!overallMeta?.allowForecast}
                baseMonth={overallMeta?.baseMonth}
                horizon={overallMeta?.horizon}
                graphId={graphId}
              />
            )}
          </ChartWrapper>

          {/* 4) Application + segment charts */}
          <div className="grid">
            <ChartWrapper
              title="Two-Wheeler Application Chart"
              summary={appSummary}
              controls={
                <MonthSelector
                  value={appMonth}
                  onChange={setAppMonth}
                  label="Application Month"
                />
              }
            >
              {appError ? (
                <p className="text-sm text-destructive">{appError}</p>
              ) : appLoading ? (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  Loading application split…
                </div>
              ) : appBarData.length ? (
                <BarChart
                  data={appBarData}
                  bars={[
                    {
                      key: "value",
                      name: "Usage",
                      color: "#007AFF",
                    },
                  ]}
                  height={300}
                  layout="horizontal"
                  showLegend={false}
                  valueSuffix="%"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No application data available for this period.
                </p>
              )}
            </ChartWrapper>

            {/* <ChartWrapper
              title="Two-Wheeler Segment Distribution"
              summary={`${
                segmentData[0]?.name ?? "Segment"
              } leads with ${Math.round(
                ((segmentData[0]?.value ?? 0) /
                  segmentData.reduce((sum, item) => sum + item.value, 0)) *
                  100
              )}% share, with scooters gaining popularity in urban markets.`}
            >
              <DonutChart data={segmentData} height={300} showLegend={true} />
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
