"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Car,
  Truck,
  Tractor,
  Bus,
  Award,
  ChartBar as BarChart3,
} from "lucide-react";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { ChartWrapper } from "@/components/charts/ChartWrapper";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RegionSelector } from "@/components/ui/RegionSelector";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { VehicleCategoryCard } from "@/components/ui/VehicleCategoryCard";
import { useAppContext } from "@/components/providers/Providers";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  {
    id: "overall-automotive-industry",
    title: "Overall Automotive Industry",
    description: "Comprehensive market analysis across all vehicle categories",
    icon: BarChart3,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  {
    id: "two-wheeler",
    title: "Two Wheeler",
    description: "Motorcycles, scooters, and electric two-wheelers",
    icon: Car,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
  },
  {
    id: "three-wheeler",
    title: "Three Wheeler",
    description: "Auto-rickshaws, goods carriers, and passenger vehicles",
    icon: Car,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
  },
  {
    id: "commercial-vehicles",
    title: "Commercial Vehicles",
    description: "Trucks, buses, and commercial transportation",
    icon: Truck,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    subCategories: ["trucks", "buses"],
  },
  {
    id: "passenger-vehicles",
    title: "Passenger Vehicles",
    description: "Cars, SUVs, and personal transportation",
    icon: Car,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
  },
  {
    id: "tractor",
    title: "Tractor",
    description: "Agricultural and industrial tractors",
    icon: Tractor,
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
  },
  {
    id: "construction-equipment",
    title: "Construction Equipment",
    description:
      "Heavy-duty machines used for excavation, grading, and movement on construction sites",
    icon: Truck, // placeholder, or your Construction icon
    color: "text-teal-400",
    bgColor: "bg-teal-400/10",
  },
];

// The shape returned by /api/flash-reports/overall-chart-data
type OverallApiPoint = {
  month: string; // "YYYY-MM"
  data: {
    [key: string]: number;
  };
};

// Flattened shape we’ll actually use in the dashboard
type OverallRow = {
  month: string; // "YYYY-MM"
  Total: number;
  "2W": number;
  "3W": number;
  PV: number;
  TRAC: number;
  Truck: number;
  Bus: number;
  CV: number;
  CE: number;
  // if backend ever adds new keys, we can still index them
  [key: string]: string | number;
};

// Map category → key from OverallRow.data
const CATEGORY_SERIES_KEYS: Record<string, string> = {
  "overall-automotive-industry": "Total",
  "two-wheeler": "2W",
  "three-wheeler": "3W",
  "commercial-vehicles": "CV",
  "passenger-vehicles": "PV",
  tractor: "TRAC",
  "construction-equipment": "CE",
};

type TopOem = {
  name: string;
  current: number; // share %
  changePercent: number; // MoM change of share (approx)
};

type TileMetrics = {
  salesVolume: number;
  momGrowth: number;
  yoyGrowth: number;
  marketShare: number;
  topOEM: string;
  evPenetration?: number;
  currentMonthSales: number;
  previousMonthSales: number | null;
  trendData: number[];
  rank: number;
  targetProgress: number;
};

// helper: safe numeric getter
function getValue(row: OverallRow | null | undefined, key: string): number {
  if (!row) return 0;
  const raw = row[key];
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

// helper: "2025-07" -> "jul"
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
function getShortMonthFromYyyyMm(yyyymm: string): string {
  const [year, mm] = yyyymm.split("-");
  if (!year || !mm) {
    const now = new Date();
    return MONTHS_SHORT[now.getMonth()];
  }
  const idx = parseInt(mm, 10) - 1;
  return MONTHS_SHORT[idx] ?? MONTHS_SHORT[0];
}

// CONFIG: what segmentName your OEM market share backend expects for overall
// Adjust this to match your existing PieChart usage, e.g. "overall" or "overall industry"
const OVERALL_OEM_SEGMENT_NAME = "overall";

export default function FlashReportsPage() {
  const { region, month } = useAppContext();
  const [mounted, setMounted] = useState(false);

  const [overallData, setOverallData] = useState<OverallRow[]>([]);
  const [overallLoading, setOverallLoading] = useState(false);
  const [overallError, setOverallError] = useState<string | null>(null);
  const [overallMeta, setOverallMeta] = useState<any>(null);

  const [topOEMs, setTopOEMs] = useState<TopOem[]>([]);
  const [topOemError, setTopOemError] = useState<string | null>(null);
  const [topOemLoading, setTopOemLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadOverall() {
      try {
        setOverallLoading(true);
        setOverallError(null);

        const res = await fetch(
          `/api/flash-reports/overall-chart-data?month=${encodeURIComponent(
            month,
          )}&horizon=6&forceHistorical=1`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          throw new Error(`Failed to fetch overall chart data: ${res.status}`);
        }

        const json = await res.json();
        const apiData = (json?.data || []) as OverallApiPoint[];
        setOverallMeta(json?.meta || null);

        if (cancelled) return;

        // flatten: { month, Total, 2W, 3W, PV, TRAC, Truck, Bus, CV }
        const flattened: OverallRow[] = apiData.map((pt) => ({
          month: pt.month,
          Total: pt.data["Total"] ?? 0,
          "2W": pt.data["2W"] ?? 0,
          "3W": pt.data["3W"] ?? 0,
          PV: pt.data["PV"] ?? 0,
          TRAC: pt.data["TRAC"] ?? 0,
          Truck: pt.data["Truck"] ?? 0,
          Bus: pt.data["Bus"] ?? 0,
          CV: pt.data["CV"] ?? 0,
          CE: pt.data["CE"] ?? 0,
        }));

        // sort by month
        flattened.sort((a, b) => a.month.localeCompare(b.month));
        setOverallData(flattened);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setOverallError(
            "Failed to load overall industry volumes from backend.",
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

  // Fetch overall OEM market share for "Top OEM Performance" widget
  useEffect(() => {
    let cancelled = false;

    async function loadTopOems() {
      try {
        setTopOemLoading(true);
        setTopOemError(null);

        const shortMonth = getShortMonthFromYyyyMm(month);
        const res = await fetch(
          `/api/fetchMarketData?segmentName=${encodeURIComponent(
            OVERALL_OEM_SEGMENT_NAME,
          )}&selectedMonth=${shortMonth}&mode=mom&segmentType=market share`,
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch overall OEM data: ${res.status}`);
        }

        const json = (await res.json()) as any[];
        if (!cancelled && Array.isArray(json)) {
          const y = month.split("-")[0]; // current year
          const monthIdx = MONTHS_SHORT.indexOf(shortMonth);
          const prevShort = monthIdx > 0 ? MONTHS_SHORT[monthIdx - 1] : "dec";
          const currKey = `${shortMonth} ${y}`;
          const prevKey = `${prevShort} ${y}`;

          const processed: TopOem[] = json
            .map((row) => {
              const current = Number(row[currKey] ?? 0) || 0;
              const prev = Number(row[prevKey] ?? 0) || 0;
              const changePercent =
                prev > 0 ? ((current - prev) / prev) * 100 : 0;
              return {
                name: row.name as string,
                current,
                changePercent,
              };
            })
            .sort((a, b) => b.current - a.current);

          setTopOEMs(processed.slice(0, 6));
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setTopOemError(
            "Failed to load overall OEM market share from backend.",
          );
          setTopOEMs([]);
        }
      } finally {
        if (!cancelled) setTopOemLoading(false);
      }
    }

    loadTopOems();
    return () => {
      cancelled = true;
    };
  }, [month]);

  // Derived: selected month row, previous row, last 6 months, etc.
  const {
    selectedRow,
    prevRow,
    lastYearRow,
    recentTotalSeries,
    overallGrowthRate,
  } = useMemo(() => {
    if (!overallData.length) {
      return {
        selectedRow: null,
        prevRow: null,
        lastYearRow: null,
        recentTotalSeries: [] as { month: string; actual: number }[],
        overallGrowthRate: 0,
      };
    }

    const sorted = overallData;

    // 1) Find the row matching the selected month; fallback to latest data
    let selectedIndex = sorted.findIndex((r) => r.month === month);
    if (selectedIndex === -1) {
      selectedIndex = sorted.length - 1;
    }

    const selected = sorted[selectedIndex];

    // Parse "YYYY-MM"
    const [selYearStr, selMonthStr] = selected.month.split("-");
    const selYear = Number(selYearStr);
    const selMonth = Number(selMonthStr); // 1..12

    // 2) Previous calendar month key
    const prevDate = new Date(selYear, selMonth - 2); // JS months 0..11
    const prevKey = `${prevDate.getFullYear()}-${String(
      prevDate.getMonth() + 1,
    ).padStart(2, "0")}`;

    const prevRow = sorted.find((r) => r.month === prevKey) ?? null;

    // 3) Same month last year key
    const lastYearKey = `${selYear - 1}-${selMonthStr}`;
    const lastYearRow = sorted.find((r) => r.month === lastYearKey) ?? null;

    // 4) History window: last 6 months ending at selectedIndex
    const windowEndIndex = selectedIndex;
    const windowStartIndex = Math.max(0, windowEndIndex - 5);

    // 5) Series for chart: from windowStartIndex → end of dataset
    const recent = sorted.slice(windowStartIndex).map((row) => ({
      month: row.month,
      actual: getValue(row, "Total"),
    }));

    const currTotal = getValue(selected, "Total");
    const prevTotal = getValue(prevRow, "Total");
    const overallGrowthRate =
      prevTotal > 0 ? ((currTotal - prevTotal) / prevTotal) * 100 : 0;

    return {
      selectedRow: selected,
      prevRow,
      lastYearRow,
      recentTotalSeries: recent,
      overallGrowthRate,
    };
  }, [overallData, month]);

  console.log("recentTotalSeries", recentTotalSeries);

  // Build category tiles from overallData
  const categoryMetricsMap: Record<string, TileMetrics> = useMemo(() => {
    if (!overallData.length || !selectedRow) return {};

    const sorted = overallData;
    const selectedIndex = sorted.indexOf(selectedRow);
    const prev = prevRow;
    const lastYear = lastYearRow;
    const totalCurrent = getValue(selectedRow, "Total");

    const base: Record<string, TileMetrics> = {};

    for (const category of CATEGORIES) {
      const key = CATEGORY_SERIES_KEYS[category.id];
      if (!key) {
        // No real data yet for this category
        base[category.id] = {
          salesVolume: 0,
          momGrowth: 0,
          yoyGrowth: 0,
          marketShare: 0,
          topOEM: "Coming soon",
          evPenetration: undefined,
          currentMonthSales: 0,
          previousMonthSales: 0,
          trendData: [],
          rank: CATEGORIES.length,
          targetProgress: 0,
        };
        continue;
      }

      const current = getValue(selectedRow, key);
      const prevVal = prevRow ? getValue(prevRow, key) : null;
      const lastYearVal = lastYearRow ? getValue(lastYearRow, key) : null;

      // Only compute if we have a positive base; else treat as "not available"
      const momGrowth =
        prevVal !== null && prevVal > 0
          ? ((current - prevVal) / prevVal) * 100
          : Number.NaN;

      const yoyGrowth =
        lastYearVal !== null && lastYearVal > 0
          ? ((current - lastYearVal) / lastYearVal) * 100
          : Number.NaN;

      const marketShare =
        key === "Total" || totalCurrent === 0
          ? 100
          : (current / totalCurrent) * 100;

      const trendSlice = sorted.slice(
        Math.max(0, selectedIndex - 5),
        selectedIndex + 1,
      );
      const trendData = trendSlice.map((row) => getValue(row, key));

      // EV penetration: only meaningful for some categories; for now, hard-code known ones or fill later
      const evPenetrationLookup: Record<string, number | undefined> = {
        "two-wheeler": undefined,
        "three-wheeler": undefined,
        "passenger-vehicles": undefined, // you can plug real PV EV share later
        "commercial-vehicles": undefined,
        tractor: undefined,
      };

      base[category.id] = {
        salesVolume: current,
        momGrowth,
        yoyGrowth,
        marketShare,
        topOEM: "See OEM breakdown", // optional: wire actual top OEM per segment later via fetchMarketData
        evPenetration: evPenetrationLookup[category.id],
        currentMonthSales: current,
        previousMonthSales: prevVal,
        trendData,
        rank: 0, // fill below
        targetProgress: Math.max(60, Math.min(95, marketShare + momGrowth / 2)), // synthetic, purely visual
      };
    }

    // Rank ALL categories that have a real series key.
    // If MoM is missing (NaN / Infinity), push it to the bottom.
    // Rank ALL categories that have a real series key (including overall)
    const rankableIds = CATEGORIES.filter(
      (c) => !!CATEGORY_SERIES_KEYS[c.id],
    ).map((c) => c.id);

    rankableIds.sort((a, b) => {
      const ga = base[a]?.momGrowth;
      const gb = base[b]?.momGrowth;

      const va = Number.isFinite(ga) ? ga : -Infinity;
      const vb = Number.isFinite(gb) ? gb : -Infinity;

      return vb - va;
    });

    rankableIds.forEach((id, idx) => {
      base[id].rank = idx + 1;
    });

    // ✅ REMOVE the special-case rank=0 block entirely

    return base;
  }, [overallData, selectedRow, prevRow, lastYearRow]);

  // Key Highlights should be fully dynamic. Use segment momentum (best MoM)
  // as the middle highlight so it updates with the global month selector.
  const bestSegment = useMemo(() => {
    const candidates = CATEGORIES.filter(
      (c) =>
        !!CATEGORY_SERIES_KEYS[c.id] && c.id !== "overall-automotive-industry",
    );

    let best: {
      id: string;
      title: string;
      momGrowth: number;
      salesVolume: number;
      marketShare: number;
    } | null = null;

    for (const c of candidates) {
      const m = categoryMetricsMap[c.id];
      if (!m) continue;
      const g = m.momGrowth;
      if (!Number.isFinite(g)) continue;

      if (!best || g > best.momGrowth) {
        best = {
          id: c.id,
          title: c.title,
          momGrowth: g,
          salesVolume: m.salesVolume,
          marketShare: m.marketShare,
        };
      }
    }

    return best;
  }, [categoryMetricsMap]);

  const bestYoYSegment = useMemo(() => {
    const candidates = CATEGORIES.filter(
      (c) =>
        !!CATEGORY_SERIES_KEYS[c.id] && c.id !== "overall-automotive-industry",
    );

    let best: {
      id: string;
      title: string;
      yoyGrowth: number;
      salesVolume: number;
      marketShare: number;
    } | null = null;

    for (const c of candidates) {
      const m = categoryMetricsMap[c.id];
      if (!m) continue;

      const g = m.yoyGrowth;
      if (!Number.isFinite(g)) continue;

      if (!best || g > best.yoyGrowth) {
        best = {
          id: c.id,
          title: c.title,
          yoyGrowth: g,
          salesVolume: m.salesVolume,
          marketShare: m.marketShare,
        };
      }
    }

    return best;
  }, [categoryMetricsMap]);

  if (!mounted) {
    return <FlashReportsPageSkeleton />;
  }

  const selectedMonthLabel = new Date(`${month}-01`).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );

  const topOemName = topOEMs[0]?.name;
  const topOemDelta = topOEMs[0]?.changePercent ?? 0;

  return (
    <div className="min-h-screen py-0">
      <div className="mx-auto w-[95vw] xl:w-[93vw] 2xl:w-[90vw] max-w-none px-2 sm:px-3 lg:px-4">
        {/* Header */}
        <div className="mb-8">
          <Breadcrumbs
            items={[{ label: "Flash Reports", href: "/flash-reports" }]}
            className="mb-4"
          />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Flash Reports Dashboard
              </h1>
              <p className="text-muted-foreground">
                Monthly automotive market insights with backend-driven analytics
                across all vehicle categories
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <RegionSelector />
              <MonthSelector />
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="mb-12">
          {/* <h2 className="text-xl font-semibold mb-6">
            Market Summary – {selectedMonthLabel}
          </h2> */}

          <div className="grid lg:grid-cols-1 gap-8">
            <div className="lg:col-span-2">
              <ChartWrapper
                title="Cross-Category Sales Performance"
                summary={
                  overallError
                    ? overallError
                    : `Overall automotive market ${
                        overallGrowthRate >= 0 ? "expanded" : "contracted"
                      } by ${
                        overallGrowthRate >= 0 ? "+" : ""
                      }${overallGrowthRate.toFixed(
                        1,
                      )}% month-on-month based on total industry volumes.`
                }
              >
                {overallLoading ? (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    Loading industry volumes…
                  </div>
                ) : recentTotalSeries.length ? (
                  <LineChart
                    overallData={recentTotalSeries.map((row) => ({
                      month: row.month,
                      Total: row.actual,
                    }))}
                    category="Total"
                    height={300}
                    allowForecast={!!overallMeta?.allowForecast}
                  />
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    No overall volume data available.
                  </div>
                )}
              </ChartWrapper>
            </div>

            <div>
              {/* <ChartWrapper
                title="Top OEM Performance"
                summary={
                  topOemError
                    ? topOemError
                    : topOemName
                    ? `${topOemName} leads the overall market by share, with ${
                        topOemDelta >= 0 ? "+" : ""
                      }${topOemDelta.toFixed(
                        1
                      )}% change in share vs previous month.`
                    : "OEM market share data will appear here when available."
                }
              >
                {topOemLoading ? (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    Loading OEM shares…
                  </div>
                ) : topOEMs.length ? (
                  <BarChart
                    data={topOEMs.map((oem) => ({
                      name: oem.name.split(" ")[0],
                      value: oem.current,
                    }))}
                    bars={[
                      {
                        key: "value",
                        name: "Market Share (%)",
                        color: "#007AFF",
                      },
                    ]}
                    height={300}
                    layout="horizontal"
                    showLegend={false}
                  />
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    No OEM share data available for the selected period.
                  </div>
                )}
              </ChartWrapper> */}
            </div>
          </div>
        </div>

        {/* Category Grid */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-6">Vehicle Categories</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {CATEGORIES.map((category, index) => {
              const metrics = categoryMetricsMap[category.id];
              if (!metrics) return null;

              return (
                <VehicleCategoryCard
                  key={category.id}
                  id={category.id}
                  title={category.title}
                  description={category.description}
                  icon={category.icon}
                  color={category.color}
                  bgColor={category.bgColor}
                  subCategories={category.subCategories}
                  metrics={metrics}
                  index={index}
                />
              );
            })}
          </div>
        </div>

        {/* Key Highlights (fully dynamic) */}
        <div className="bg-card/30 rounded-xl p-8">
          <h2 className="text-xl font-semibold mb-6">Key Highlights</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3 animate-fade-in">
              <TrendingUp className="w-5 h-5 text-success mt-0.5" />
              <div>
                <p className="font-medium mb-1">Overall Growth</p>
                <p className="text-sm text-muted-foreground">
                  {overallGrowthRate >= 0 ? "Expansion" : "Contraction"} of{" "}
                  {overallGrowthRate >= 0 ? "+" : ""}
                  {overallGrowthRate.toFixed(1)}% in total automotive sales vs
                  the previous month.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 animate-fade-in delay-100">
              <Car className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium mb-1">Top Segment Momentum</p>
                <p className="text-sm text-muted-foreground">
                  {bestSegment
                    ? `${bestSegment.title} posted the strongest month-on-month growth at ${bestSegment.momGrowth >= 0 ? "+" : ""}${bestSegment.momGrowth.toFixed(1)}%, reaching ${Math.round(
                        bestSegment.salesVolume,
                      ).toLocaleString()} units and accounting for ${bestSegment.marketShare.toFixed(
                        1,
                      )}% of total volume.`
                    : "Segment momentum will appear here once category series data is available for the selected period."}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 animate-fade-in delay-200">
              <Award className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium mb-1">Strongest YoY Segment</p>
                <p className="text-sm text-muted-foreground">
                  {bestYoYSegment
                    ? `${bestYoYSegment.title} leads year-on-year growth at ${
                        bestYoYSegment.yoyGrowth >= 0 ? "+" : ""
                      }${bestYoYSegment.yoyGrowth.toFixed(1)}%, delivering ${Math.round(
                        bestYoYSegment.salesVolume,
                      ).toLocaleString()} units and holding ${bestYoYSegment.marketShare.toFixed(
                        1,
                      )}% share in the selected period.`
                    : "YoY leadership will appear here once category series data is available for the selected period."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlashReportsPageSkeleton() {
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="w-48 h-6 bg-muted rounded shimmer mb-4" />
          <div className="flex justify-between items-start">
            <div>
              <div className="w-80 h-8 bg-muted rounded shimmer mb-2" />
              <div className="w-96 h-5 bg-muted rounded shimmer" />
            </div>
            <div className="flex gap-4">
              <div className="w-32 h-10 bg-muted rounded shimmer" />
              <div className="w-40 h-10 bg-muted rounded shimmer" />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="w-full h-[520px] bg-muted rounded-lg shimmer"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
