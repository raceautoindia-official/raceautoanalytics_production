"use client";

import { useState, useEffect, useMemo } from "react";
import { ChartWrapper } from "@/components/charts/ChartWrapper";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RegionSelector } from "@/components/ui/RegionSelector";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { LastPublishedHint } from "@/components/ui/LastPublishedHint";
import { CompareToggle } from "@/components/ui/CompareToggle";
import { useAppContext } from "@/components/providers/Providers";
import { generateSegmentData, formatNumber } from "@/lib/mockData";
import { withCountry } from "@/lib/withCountry";
import { buildLeadershipGrowthSummary, formatAltFuelHeaderLabel, formatGrowthWithYoY, formatLeadingOemLabel } from "@/lib/flashReportSummary";
import { SegmentCmsText } from "@/components/flash-reports/SegmentCmsText";

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

export default function ThreeWheelerPage() {
  const { region, month, maxMonth } = useAppContext();
  const suffix = useMemo(() => {
  const qs = new URLSearchParams();
  if (region) qs.set("country", region);
  if (month) qs.set("month", month);
  const s = qs.toString();
  return s ? `?${s}` : "";
}, [region, month]);
  const [mounted, setMounted] = useState(false);

  // ---- OEM chart (market share) ----
  const [oemCompare, setOemCompare] = useState<"mom" | "yoy">("mom");
  const [oemCurrentMonth, setOemCurrentMonth] = useState(month);

  // Sync chart-level month with global month when top MonthSelector changes
  useEffect(() => {
    setOemCurrentMonth(month);
  }, [month, region]);
  const [oemRaw, setOemRaw] = useState<MarketBackendRow[]>([]);
  const [oemLoading, setOemLoading] = useState(false);
  const [oemError, setOemError] = useState<string | null>(null);

  // ---- EV chart (segmentType=ev) ----
  const [evCompare, setEvCompare] = useState<"mom" | "yoy">("mom");
  const [evCurrentMonth, setEvCurrentMonth] = useState(month);

  // Sync chart-level month with global month when top MonthSelector changes
  useEffect(() => {
    setEvCurrentMonth(month);
  }, [month, region]);
  const [evRaw, setEvRaw] = useState<MarketBackendRow[]>([]);
  const [evLoading, setEvLoading] = useState(false);
  const [evError, setEvError] = useState<string | null>(null);

  // ---- Forecast line chart data (overall timeseries; we will use 3W series) ----
  const [overallData, setOverallData] = useState<any[]>([]);
  const [overallLoading, setOverallLoading] = useState(false);
  const [overallError, setOverallError] = useState<string | null>(null);
  const [overallMeta, setOverallMeta] = useState<any>(null);
  const [altFuelSummaryData, setAltFuelSummaryData] = useState<Record<string, Record<string, number>> | null>(null);

  // ---- Application chart ----
  const [appMonth, setAppMonth] = useState(month);

  // Sync chart-level month with global month when top MonthSelector changes
  useEffect(() => {
    setAppMonth(month);
  }, [month, region]);
  const [appRaw, setAppRaw] = useState<any[]>([]);
  const [appAvailableMonths, setAppAvailableMonths] = useState<string[]>([]);
  const [appSelectedKey, setAppSelectedKey] = useState<string | null>(null);
  const [appLoading, setAppLoading] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  const [graphId, setGraphId] = useState<number | null>(null);
    const [segmentText, setSegmentText] = useState<any>(null);
const [segmentTextLoading, setSegmentTextLoading] = useState(false);
const [segmentTextError, setSegmentTextError] = useState<string | null>(null);


  // ---- Segment donut: still mock ----
  const segmentData = generateSegmentData("three-wheeler", region);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ---------- FETCH OEM DATA (three wheeler, market share) ----------
  useEffect(() => {
    let cancelled = false;

    async function loadOemData() {
      try {
        setOemLoading(true);
        setOemError(null);

        const effectiveMonth = oemCurrentMonth || month;
        const shortMonth = getShortMonthFromYyyyMm(effectiveMonth);
        const segmentName = "three wheeler";

        const res = await fetch(
          withCountry(
            `/api/fetchMarketData?segmentName=${encodeURIComponent(
              segmentName,
            )}&segmentType=market share&mode=${oemCompare}&baseMonth=${encodeURIComponent(
              effectiveMonth,
            )}&selectedMonth=${shortMonth}`,
            region,
          ),
        );

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
          setOemError("Failed to load three-wheeler OEM market share data");
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
  let cancelled = false;

  async function loadSegmentText() {
    try {
      setSegmentTextLoading(true);
      setSegmentTextError(null);

      const res = await fetch(withCountry("/api/flash-reports/text", region), {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Failed to load segment text: ${res.status}`);
      }

      const json = await res.json();

      if (!cancelled) {
        setSegmentText(json || {});
      }
    } catch (err) {
      console.error(err);
      if (!cancelled) {
        setSegmentTextError("Failed to load segment text");
        setSegmentText({});
      }
    } finally {
      if (!cancelled) {
        setSegmentTextLoading(false);
      }
    }
  }

  loadSegmentText();

  return () => {
    cancelled = true;
  };
}, [region]);
  // ---------- PROCESS OEM DATA ----------
  const oemComputed = useMemo(() => {
    if (!oemRaw.length) return null;

    const effectiveMonth = oemCurrentMonth || month; // "YYYY-MM"
    const [yStr, mStr] = (effectiveMonth || "").split("-");
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

  const oemSummary = useMemo(
  () =>
    buildLeadershipGrowthSummary({
      rows: oemComputed?.chartData ?? [],
      compareMode: oemCompare,
      emptyMessage: "No three-wheeler OEM market share data available for the selected period.",
      metricLabel: "market share",
    }),
  [oemComputed, oemCompare],
);

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

  // ---------- FETCH EV DATA (three wheeler, segmentType=ev) ----------
  useEffect(() => {
    let cancelled = false;

    async function loadEvData() {
      try {
        setEvLoading(true);
        setEvError(null);

        const effectiveMonth = evCurrentMonth || month;
        const shortMonth = getShortMonthFromYyyyMm(effectiveMonth);
        const segmentName = "three wheeler";

        const res = await fetch(
          withCountry(
            `/api/fetchMarketData?segmentName=${encodeURIComponent(
              segmentName,
            )}&segmentType=ev&mode=${evCompare}&baseMonth=${encodeURIComponent(
              effectiveMonth,
            )}&selectedMonth=${shortMonth}`,
            region,
          ),
        );

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
          setEvError("Failed to load three-wheeler EV / alt-fuel share data");
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
  }, [evCompare, evCurrentMonth, month, region]);

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

    const topRow = rows[0] || null;

    return {
      chartData: rows,
      prevKey,
      currKey,
      topCurrent: topRow?.current ?? null,
      topPrevious: topRow?.previous ?? null,
      topName: topRow?.name ?? null,
    };
  }, [evRaw, evCurrentMonth, evCompare, month]);

  const evSummary = useMemo(
  () =>
    buildLeadershipGrowthSummary({
      rows: evComputed?.chartData ?? [],
      compareMode: evCompare,
      emptyMessage: "No alternative fuel / EV share data available for the selected period.",
      metricLabel: "share",
    }),
  [evComputed, evCompare],
);

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

  // ---------- FETCH FORECAST GRAPH CONFIG (ONCE on mount, India-default) ----------
  useEffect(() => {
    let cancelled = false;
    async function loadConfig() {
      try {
        const res = await fetch("/api/flash-reports/config?country=india", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const cfg = await res.json();
        if (!cancelled) setGraphId(cfg?.threew ?? null);
      } catch (err) {
        console.error("Failed to load flash chart config", err);
      }
    }
    loadConfig();
    return () => { cancelled = true; };
  }, []);

  // ---------- FETCH OVERALL TIMESERIES FOR FORECAST (3W series) ----------
  useEffect(() => {
    let cancelled = false;

    async function loadOverall() {
      try {
        setOverallLoading(true);
        setOverallError(null);

        const isHistoricalView = !!maxMonth && !!month && month !== maxMonth;
        const dataRes = await fetch(
          withCountry(
            `/api/flash-reports/overall-chart-data?month=${encodeURIComponent(
              month,
            )}&horizon=6${isHistoricalView ? "&forceHistorical=1" : ""}`,
            region,
          ),
          { cache: "no-store" },
        );

        if (!dataRes.ok) {
          throw new Error(`Failed to fetch overall chart data: ${dataRes.status}`);
        }

        const json = await dataRes.json();
        if (!cancelled) {
          setOverallData(json?.data || []);
          setOverallMeta(json?.meta || null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setOverallError("Failed to load three-wheeler timeseries data");
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

  useEffect(() => {
    let cancelled = false;

    async function loadAltFuelSummary() {
      try {
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
        if (!cancelled) {
          setAltFuelSummaryData(json && Object.keys(json).length ? json : null);
        }
      } catch (err) {
        console.error("Failed to load alternate fuel summary", err);
        if (!cancelled) {
          setAltFuelSummaryData(null);
        }
      }
    }

    loadAltFuelSummary();
    return () => {
      cancelled = true;
    };
  }, [month, region]);

  // ---------- FETCH APPLICATION DATA ----------
  useEffect(() => {
    let cancelled = false;

    async function loadApp() {
      try {
        setAppLoading(true);
        setAppError(null);

        const base = appMonth || month;

        const res = await fetch(
  withCountry(
    `/api/fetchAppData?segmentName=${encodeURIComponent(
      "three wheeler",
    )}&segmentType=app&baseMonth=${encodeURIComponent(base)}`,
    region,
  ),
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
          const [yearStr] = baseMonth.split("-");
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
          setAppError("Failed to load three-wheeler application data");
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
  }, [appMonth, month, region]);

  // Update selected app month when MonthSelector changes
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
    return "No three-wheeler application split data available for the selected month.";
  }
  const sorted = [...appBarData].sort((a, b) => b.value - a.value);
  const top = sorted[0];
  const total = sorted.reduce((sum, r) => sum + (r.value || 0), 0);
  const share = total > 0 ? (top.value / total) * 100 : 0;
  const shareText = Number(share.toFixed(2)).toString();

  return `${top.name} Application leads three-wheeler usage with ${shareText}% share in ${appSelectedKey}.`;
}, [appBarData, appSelectedKey]);

  // ---------- SUMMARY METRICS (3W volumes + EV adoption) ----------
  const summaryBaseMonth = overallMeta?.baseMonth ?? month;
  const baseIdx = overallData.findIndex((p) => p?.month === summaryBaseMonth);
  const basePoint = baseIdx >= 0 ? overallData[baseIdx] : null;
  const prevPoint = baseIdx > 0 ? overallData[baseIdx - 1] : null;
  const prevYearMonthKey = `${String(summaryBaseMonth || month).slice(0, 4) - 1}-${String(summaryBaseMonth || month).slice(5, 7)}`;
  const prevYearPoint = overallData.find((p) => p?.month === prevYearMonthKey) ?? null;
  const prevYearBaseData = overallMeta?.prevYearBaseData ?? null;

  const latest3W = basePoint?.data?.["3W"] ?? 0;
  const prev3W = prevPoint?.data?.["3W"] ?? 0;

  const growthSummary = formatGrowthWithYoY(latest3W, prev3W, prevYearBaseData?.["3W"] ?? prevYearPoint?.data?.["3W"] ?? null);

  const topEvHeaderLabel =
    evComputed?.topName && evComputed?.topCurrent != null && !Number.isNaN(evComputed.topCurrent)
      ? `${evComputed.topName} (${evComputed.topCurrent.toFixed(1)}%)`
      : "—";

  const altFuelHeaderLabel = formatAltFuelHeaderLabel(altFuelSummaryData, "3W", month);

  const pageMonthLabel = new Date(`${month}-01`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const showOemChartSection =
  oemLoading || !!oemError || !!(oemComputed && oemComputed.chartData.length);
  const oemHasMeaningfulData = oemComputed?.chartData.some((r) => r.current !== 0) ?? false;

const showEvChartSection =
  evLoading || !!evError || !!(evComputed && evComputed.chartData.length);
  const evHasMeaningfulData = evComputed?.chartData.some((r) => r.current !== 0) ?? false;

const showApplicationChartSection =
  appLoading || !!appError || appBarData.length > 0;

  if (!mounted) {
    return <PageSkeleton />;
  }

  const segmentTotal = segmentData.reduce((sum, item) => sum + item.value, 0);
  const leadingSegment = segmentData[0];

  return (
    <div className="min-h-screen py-0">
      <div className="mx-auto w-[95vw] xl:w-[93vw] 2xl:w-[90vw] max-w-none px-2 sm:px-3 lg:px-4">
        {/* Header */}
        <div className="mb-8">
          <Breadcrumbs
            items={[
              { label: "Flash Reports", href: `/flash-reports${suffix}` },
              { label: "Three Wheeler" },
            ]}
            className="mb-4"
          />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Three Wheeler Market</h1>
              <p className="text-muted-foreground">
                Passenger auto-rickshaws, goods carriers, and e-rickshaws market
                analysis
              </p>
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center space-x-4">
                <RegionSelector />
                <MonthSelector />
              </div>
              <LastPublishedHint />
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
              <span className="text-muted-foreground">Total 3W Sales:</span>
              <span className="ml-2 font-medium">
                {formatNumber(latest3W || 0)} units
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">3W Growth Rate:</span>
              <span
                className={`ml-2 font-medium ${
                  growthSummary.mom != null && growthSummary.mom >= 0
                    ? "text-success"
                    : "text-destructive"
                }`}
              >
                {growthSummary.text}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Alternate Fuel Adoption:</span>
              <span className="ml-2 font-medium text-primary">
{altFuelHeaderLabel}
              </span>
            </div>
          </div>
        </div>



        {/* Charts */}
        <div className="space-y-8">
          {/* 1) OEM Performance – backend, market share */}
          {showOemChartSection && (
  <ChartWrapper
    title="Three-Wheeler OEM Segment Share"
    summary={oemHasMeaningfulData ? oemSummary : undefined}
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
        Loading three-wheeler OEM market share…
      </div>
    ) : oemComputed && oemComputed.chartData.length ? (
      oemHasMeaningfulData ? (
        <BarChart
          data={oemComputed.chartData}
          bars={[
            { key: "current", name: "Current Period", color: "#007AFF" },
            {
              key: "previous",
              name: oemCompare === "mom" ? "Previous Month" : "Previous Year",
              color: "#6B7280",
            },
          ]}
          height={350}
          layout="horizontal"
          tooltipRenderer={renderOemTooltip}
        />
      ) : (
        <div className="flex h-[350px] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20">
          <div className="mb-2 text-sm font-semibold text-foreground">No data available</div>
          <div className="text-xs text-muted-foreground text-center max-w-md px-4">
            OEM market share data is not yet available for this period and country.
          </div>
        </div>
      )
    ) : null}
    <p style={{margin:0, padding:0}} className="text-sm text-muted-foreground">
  Note: Includes petrol, diesel, CNG, electric (EV), and other alternative-fuel vehicles.
</p>
  </ChartWrapper>
)}

          {/* 2) EV / alternative fuel share comparison */}
         {showEvChartSection && (
  <ChartWrapper
    title="Three-Wheeler EV Electric OEM Market Share"
    summary={evHasMeaningfulData ? evSummary : undefined}
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
        Loading three-wheeler EV / alt-fuel share…
      </div>
    ) : evComputed && evComputed.chartData.length ? (
      evHasMeaningfulData ? (
        <BarChart
          data={evComputed.chartData}
          bars={[
            { key: "current", name: "Current Period", color: "#2ECC71" },
            {
              key: "previous",
              name: evCompare === "mom" ? "Previous Month" : "Previous Year",
              color: "#6B7280",
            },
          ]}
          height={300}
          layout="vertical"
          tooltipRenderer={renderEvTooltip}
        />
      ) : (
        <div className="flex h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20">
          <div className="mb-2 text-sm font-semibold text-foreground">No data available</div>
          <div className="text-xs text-muted-foreground text-center max-w-md px-4">
            EV / alternative fuel share data is not yet available for this period and country.
          </div>
        </div>
      )
    ) : null}
  </ChartWrapper>
)}

          {/* 3) 3W Sales Forecast – from overall timeseries, 3W series */}
          <ChartWrapper
            title="Three-Wheeler Sales Forecast"
            summary={
              overallError
                ? overallError
                : "Forecast based on recent three-wheeler volume trends across passenger and goods segments."
            }
          >
            {overallLoading ? (
              <div className="h-[350px] flex items-center justify-center text-sm text-muted-foreground">
                Loading three-wheeler timeseries…
              </div>
            ) : (
              <LineChart
                overallData={overallData}
                category="3W"
                height={350}
                allowForecast={!!overallMeta?.allowForecast}
                country={region}
                baseMonth={overallMeta?.baseMonth}
                horizon={overallMeta?.horizon}
                graphId={graphId}
              />
            )}
          </ChartWrapper>

          {/* 4) Application + segment charts */}
          {showApplicationChartSection && (
  <div className="grid">
    <ChartWrapper
      title="Three-Wheeler Application Chart"
      summary={appBarData.length ? appSummary : undefined}
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
          Loading three-wheeler application split…
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
      ) : null}
    <p style={{margin:0, padding:0}} className="text-sm text-muted-foreground">
  Note: Includes petrol, diesel, CNG, electric (EV), and other alternative-fuel vehicles.
</p>
  </ChartWrapper>
  </div>
)}
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
