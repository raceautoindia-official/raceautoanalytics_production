"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LineChart as RechartsLineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Brush,
} from "recharts";
import { Sparkles, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  CHART_ANIMATION,
  getStaggerDelay,
  getAnimationConfig,
} from "@/lib/animationConfig";
import {
  renderGradientDefs,
  getGradientFillFromColor,
  getGradientIdFromColor,
} from "@/lib/gradientConfig";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useFlashForecastStack } from "@/app/hooks/useFlashForecastStack";

const monthNames = [
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

const catColors: Record<string, string> = {
  "2W": "#846cff",
  "3W": "#ff1f23",
  PV: "#FFCE56",
  TRAC: "#4BC0C0",
  Truck: "#00CED1",
  Bus: "#DC143C",
  CV: "#9966FF",
  CE: "#65f89b",
  Total: "#FF9F40",
};

const forecastColors = {
  linear: "#00BFFF",
  score: "#FF69B4",
  byof: "#f1ff58",
  ai: "#00d800",
  race: "#ffffff",
};

const legendHelp: Record<string, string> = {
  Historical: "Actual historical volumes for the selected segment.",
  "Forecast (Survey – ML Avg)":
    "Forecast based on market survey inputs curated using a machine-learning blend.",
  "Forecast (BYF)":
    "Build your own forecast arrived user scoring",
  "Forecast (AI)":
    "Forecast produced by AI model using historical patterns and learned seasonality.",
  "Forecast (Race)":
    "Survey input based on expert opinion",
  // If you ever re-enable:
  "Forecast (Stats)": "Forecast based on statistical trend fitting from historical data.",
};

const abbreviate = (v: number) =>
  v >= 1e9
    ? `${(v / 1e9).toFixed(1)}B`
    : v >= 1e6
      ? `${(v / 1e6).toFixed(1)}M`
      : v >= 1e3
        ? `${(v / 1e3).toFixed(1)}K`
        : `${v}`;

function isYYYYMM(s?: string | null) {
  return !!s && /^\d{4}-\d{2}$/.test(s);
}


function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

function decodeJwtEmail(token?: string | null) {
  try {
    if (!token) return null;
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const obj = JSON.parse(json);
    return obj?.email ? String(obj.email) : null;
  } catch {
    return null;
  }
}

function round(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

type AnyRow = {
  month: string;
  data?: Record<string, number>;
  [k: string]: any;
};

interface LineChartProps {
  overallData: AnyRow[];
  category: string;
  height?: number;
  className?: string;
country?: string | null;
  allowForecast?: boolean; // meta.allowForecast
  baseMonth?: string | null; // meta.baseMonth (YYYY-MM)
  horizon?: number | null; // meta.horizon
  graphId?: number | null; // from /api/flash-reports/config

  // Score entry point (Flash)
  showSubmitScore?: boolean;
  submitScoreLabel?: string;
}

export function LineChart({
  overallData,
  category,
  height = 400,
  className,
  allowForecast = false,
  baseMonth = null,
  horizon = 6,
  graphId = null,
    country = null,
  showSubmitScore = true,
  submitScoreLabel = "BYF Score",
}: LineChartProps) {
  const selectedCat = category;

  const isReducedMotion = useReducedMotion();
  const animationConfig = getAnimationConfig(isReducedMotion);
  const isMobile = useIsMobile();

  const effectiveHeight = isMobile ? Math.min(height, 260) : height;
  const chartMargin = isMobile
    ? { top: 4, right: 8, left: 4, bottom: 4 }
    : { top: 5, right: 20, left: 20, bottom: 5 };

  const xTickStyle = {
    fontSize: isMobile ? 9 : 11,
    fill: "hsl(var(--muted-foreground))",
  };
  const yTickStyle = {
    fontSize: isMobile ? 9 : 11,
    fill: "hsl(var(--muted-foreground))",
  };

  // Normalize incoming data so we can read both:
  // - { month, data: {Total:..} }
  // - { month, Total: .. }
  const normalized = useMemo(() => {
    const rows = Array.isArray(overallData) ? overallData : [];
    return rows
      .map((r) => {
        const m = String(r?.month || "");
        if (!isYYYYMM(m)) return null;

        const data = r.data && typeof r.data === "object" ? r.data : {};
        const flatVal = (r as any)[selectedCat];
        const valFromFlat =
          flatVal == null || Number.isNaN(Number(flatVal))
            ? null
            : Number(flatVal);

        const valFromData =
          data[selectedCat] == null || Number.isNaN(Number(data[selectedCat]))
            ? null
            : Number(data[selectedCat]);

        // keep best available
        const value = valFromData ?? valFromFlat;

        return { month: m, data: { ...data, [selectedCat]: value } };
      })
      .filter(Boolean) as { month: string; data: Record<string, number> }[];
  }, [overallData, selectedCat]);

  // True only when the loaded data contains at least one non-zero value for the
  // selected category. Used purely for render-gating (show placeholder vs chart).
  // Intentionally separate from allowForecastByData — see note below.
  const hasMeaningfulData = useMemo(
    () =>
      normalized.some((p) => {
        const val = p.data?.[selectedCat];
        return val != null && Number.isFinite(Number(val)) && Number(val) !== 0;
      }),
    [normalized, selectedCat],
  );

  // Do not gate on normalized.some(…) here: that check flips false while overallData
  // is being refetched (month/region change), which disables the hook and clears all
  // forecast state. Forecast values for months not present in overallData are simply
  // empty, so the lines stay invisible — no stale data is shown.
  const allowForecastByData =
    !!allowForecast &&
    !!graphId &&
    isYYYYMM(baseMonth);

  const userEmail = useMemo(() => {
    const token = getCookie("authToken");
    return decodeJwtEmail(token);
  }, []);

  const pathname = usePathname();
  const sp = useSearchParams();

  const returnTo = useMemo(() => {
    const qs = sp?.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }, [pathname, sp]);

  const scoreCardHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("graphId", String(graphId));
    if (isYYYYMM(baseMonth)) params.set("baseMonth", String(baseMonth));
    params.set(
      "horizon",
      String(Number.isFinite(Number(horizon)) ? (horizon ?? 6) : 6),
    );
    if (returnTo) params.set("returnTo", returnTo);
    const c = String(country || "").trim();
    if (c) params.set("country", c);
    return `/score-card?${params.toString()}`;
  }, [graphId, baseMonth, horizon, returnTo, country]);

  const { forecastByMonth, loading: forecastLoading } = useFlashForecastStack({
    enabled: allowForecastByData,
    graphId,
    baseMonth: baseMonth ?? null,
    horizon: horizon ?? 6,
    overallData: normalized as any,
    category: selectedCat,
    userEmail,
    country
  });

  const enabledTypes = forecastByMonth?.enabledTypes;

  const chartData = useMemo(() => {
    if (!normalized.length) return [];

    return normalized.map((p) => {
      const date = new Date(`${p.month}-01`);
      const label = `${monthNames[date.getMonth()]}${date
        .getFullYear()
        .toString()
        .slice(-2)}`;

      const base = isYYYYMM(baseMonth) ? String(baseMonth) : null;
      const isFuture = base ? p.month > base : false;
      const isBase = base ? p.month === base : false;

      const actual = round(p.data?.[selectedCat]);

      const row: any = {
        month: label,
        __yyyymm: p.month,
        [selectedCat]: !isFuture ? actual : null,
      };

      // Historical-only mode
      if (!allowForecastByData || !forecastByMonth) return row;

      // Continuity point at baseMonth
      const anchor = isBase ? actual : null;

      const setForecast = (key: string, value: any, enabled: boolean) => {
        row[key] = enabled ? (isFuture ? round(value) : anchor) : null;
      };

      setForecast(
        `${selectedCat}_forecast_linear`,
        forecastByMonth.linear?.[p.month],
        !!enabledTypes?.has("linear"),
      );
      setForecast(
        `${selectedCat}_forecast_score`,
        forecastByMonth.score?.[p.month],
        !!enabledTypes?.has("score"),
      );
      setForecast(
        `${selectedCat}_forecast_byof`,
        forecastByMonth.byof?.[p.month],
        !!enabledTypes?.has("byof"),
      );
      setForecast(
        `${selectedCat}_forecast_ai`,
        forecastByMonth.ai?.[p.month],
        !!enabledTypes?.has("ai"),
      );
      setForecast(
        `${selectedCat}_forecast_race`,
        forecastByMonth.race?.[p.month],
        !!enabledTypes?.has("race"),
      );

      return row;
    });
  }, [
    normalized,
    selectedCat,
    baseMonth,
    allowForecastByData,
    forecastByMonth,
    enabledTypes,
  ]);

  const baseMonthLabel = useMemo(() => {
    if (!isYYYYMM(baseMonth)) return null;
    const date = new Date(`${baseMonth}-01`);
    return `${monthNames[date.getMonth()]}${date.getFullYear().toString().slice(-2)}`;
  }, [baseMonth]);

  const [hoveredMonth, setHoveredMonth] = useState<string | null>(baseMonthLabel);

  useEffect(() => {
    setHoveredMonth(baseMonthLabel);
  }, [baseMonthLabel]);

  const monthWiseGrowth = useMemo(() => {
    const getFiniteValue = (dataKey: string, index: number) => {
  const raw = chartData[index]?.[dataKey];
  if (raw == null || raw === "") return null;

  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

const calcChangeAtIndex = (dataKey: string, index: number) => {
  if (index < 0 || index >= chartData.length) return null;

  const current = getFiniteValue(dataKey, index);
  if (current == null) return null;

  for (let i = index - 1; i >= 0; i--) {
    const previous = getFiniteValue(dataKey, i);
    if (previous == null) continue;
    if (previous === 0) return null;
    return ((current / previous) - 1) * 100;
  }

  return null;
};

const latestIndexForKey = (dataKey: string) => {
  for (let i = chartData.length - 1; i >= 0; i--) {
    const value = getFiniteValue(dataKey, i);
    if (value != null) return i;
  }
  return -1;
};

    const hoveredIndex = hoveredMonth
      ? chartData.findIndex((row) => row.month === hoveredMonth)
      : -1;

    const resolveIndex = (dataKey: string) => {
      if (hoveredIndex >= 0) {
  const hoveredValue = getFiniteValue(dataKey, hoveredIndex);
  if (hoveredValue != null) return hoveredIndex;
}
      return latestIndexForKey(dataKey);
    };

    return {
      historical: calcChangeAtIndex(selectedCat, resolveIndex(selectedCat)),
      linear: calcChangeAtIndex(
        `${selectedCat}_forecast_linear`,
        resolveIndex(`${selectedCat}_forecast_linear`),
      ),
      score: calcChangeAtIndex(
        `${selectedCat}_forecast_score`,
        resolveIndex(`${selectedCat}_forecast_score`),
      ),
      byof: calcChangeAtIndex(
        `${selectedCat}_forecast_byof`,
        resolveIndex(`${selectedCat}_forecast_byof`),
      ),
      ai: calcChangeAtIndex(
        `${selectedCat}_forecast_ai`,
        resolveIndex(`${selectedCat}_forecast_ai`),
      ),
      race: calcChangeAtIndex(
        `${selectedCat}_forecast_race`,
        resolveIndex(`${selectedCat}_forecast_race`),
      ),
    };
  }, [chartData, hoveredMonth, selectedCat]);

  const formatGrowth = (value: number | null) =>
    value == null || Number.isNaN(value) ? "–" : `${value.toFixed(1)}%`;


  

  const ForecastTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const currentIndex = chartData.findIndex((row) => row.month === label);
    const forecastStartIndex = chartData.findIndex(
      (row) =>
        row[`${selectedCat}_forecast_linear`] != null ||
        row[`${selectedCat}_forecast_score`] != null ||
        row[`${selectedCat}_forecast_byof`] != null ||
        row[`${selectedCat}_forecast_ai`] != null ||
        row[`${selectedCat}_forecast_race`] != null,
    );

    const filteredPayload =
      currentIndex === forecastStartIndex
        ? payload.filter((p: any) => p.dataKey === selectedCat)
        : payload;

    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg px-4 py-3 shadow-xl animate-fade-in">
        <p className="text-sm font-semibold mb-2">{label}</p>
        {filteredPayload.map((entry: any, index: number) => (
          <div key={index} className="flex items-baseline gap-2 mb-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <p className="text-xs font-medium" style={{ color: entry.color }}>
              {entry.name}:
            </p>
            <p className="text-sm font-bold">
              {Math.round(entry.value).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    );
  };

  // Only include lines that are currently enabled. Combined with a narrow
  // `key` on RechartsLineChart, this lets Recharts animate all lines fresh
  // whenever the set changes (e.g. when forecast data arrives or
  // category/country switches). The `hide` prop approach was removed because
  // it suppresses animation — Recharts animates hidden lines immediately on
  // mount, so lines "pop in" without animation when later unhidden.
  const lines = useMemo(() => {
    const base = [
      {
        key: selectedCat,
        name: "Historical",
        color: catColors[selectedCat] ?? "#ffffff",
        showArea: true,
        strokeDasharray: undefined as string | undefined,
      },
    ];

    if (!allowForecastByData) return base;

    const enabled = enabledTypes ?? new Set<string>();
    const out: any[] = [...base];

    if (enabled.has("linear"))
      out.push({
        key: `${selectedCat}_forecast_linear`,
        name: "Forecast (Stats)",
        color: forecastColors.linear,
        strokeDasharray: "5 5",
      });

    if (enabled.has("score"))
      out.push({
        key: `${selectedCat}_forecast_score`,
        name: "Forecast (Survey – ML Avg)",
        color: forecastColors.score,
        strokeDasharray: "2 2",
      });

    if (enabled.has("byof"))
      out.push({
        key: `${selectedCat}_forecast_byof`,
        name: "Forecast (BYF)",
        color: forecastColors.byof,
        strokeDasharray: undefined,
      });

    if (enabled.has("ai"))
      out.push({
        key: `${selectedCat}_forecast_ai`,
        name: "Forecast (AI)",
        color: forecastColors.ai,
        strokeDasharray: "4 4",
      });

    if (enabled.has("race"))
      out.push({
        key: `${selectedCat}_forecast_race`,
        name: "Forecast (Race)",
        color: forecastColors.race,
        strokeDasharray: undefined,
      });

    return out;
  }, [selectedCat, allowForecastByData, enabledTypes]);

  // Force chart remount when the set of lines changes so all lines animate
  // fresh together. Without this, dynamically added lines animate out-of-sync.
  const chartKey = useMemo(() => {
    const hasForecastLines = lines.length > 1;
    return `${selectedCat}|${String(country || "india")}|${hasForecastLines ? "1" : "0"}`;
  }, [selectedCat, country, lines]);

const yAxisDomain = useMemo(() => {
    const numericValues = chartData
      .flatMap((row) =>
        lines.map((line) => {
          const raw = row?.[line.key];
          if (raw == null) return null;
          const n = Number(raw);
          return Number.isFinite(n) ? n : null;
        }),
      )
      .filter((value): value is number => value != null);

    if (!numericValues.length) return [0, "auto"] as const;

    const minValue = Math.min(...numericValues);
    const maxValue = Math.max(...numericValues);

    if (minValue === maxValue) {
      const singlePad = Math.max(Math.abs(minValue) * 0.1, 1);
      return [Math.max(0, Math.floor(minValue - singlePad)), Math.ceil(maxValue + singlePad)] as const;
    }

    const range = maxValue - minValue;
    const pad = Math.max(range * 0.18, maxValue * 0.03, 1);
    const lower = Math.max(0, Math.floor(minValue - pad));
    const upper = Math.ceil(maxValue + pad);

    return [lower, upper] as const;
  }, [chartData, lines]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: catColors[selectedCat] ?? "#fff" }}
          />
          <span>{selectedCat}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-3 text-xs sm:text-sm">
            <span
              className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 border border-border/70"
              style={{ color: catColors[selectedCat] ?? "#fff" }}
            >
              <span className="font-semibold">
                {formatGrowth(monthWiseGrowth.historical)}
              </span>
              <span className="opacity-80">Δ Historical MoM</span>
            </span>

            {allowForecastByData && (
              <>
                {/* <span
                  className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 border border-border/70"
                  style={{ color: forecastColors.linear }}
                >
                  <span className="font-semibold">
                    {formatGrowth(growthRates.linear)}
                  </span>
                  <span className="opacity-80">Stats</span>
                </span> */}
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 border border-border/70"
                  style={{ color: forecastColors.score }}
                >
                  <span className="font-semibold">
                    {formatGrowth(monthWiseGrowth.score)}
                  </span>
                  <span className="opacity-80">ML Survey</span>
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 border border-border/70"
                  style={{ color: forecastColors.byof }}
                >
                  <span className="font-semibold">
                    {formatGrowth(monthWiseGrowth.byof)}
                  </span>
                  <span className="opacity-80">BYF</span>
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 border border-border/70"
                  style={{ color: forecastColors.ai }}
                >
                  <span className="font-semibold">
                    {formatGrowth(monthWiseGrowth.ai)}
                  </span>
                  <span className="opacity-80">Δ AI MoM</span>
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 border border-border/70"
                  style={{ color: forecastColors.race }}
                >
                  <span className="font-semibold">
                    {formatGrowth(monthWiseGrowth.race)}
                  </span>
                  <span className="opacity-80">Δ Race MoM</span>
                </span>
                {forecastLoading ? (
                  <span className="text-xs text-muted-foreground self-center">
                    Loading forecast…
                  </span>
                ) : null}
              </>
            )}
          </div>

          {showSubmitScore && graphId && allowForecastByData ? (
            <div className="group relative">
              <Link href={scoreCardHref} prefetch={false}>
                <Button
                  size="xs"
                  variant="secondary"
                  // title="Predict your own forecast"
                  aria-label="Predict your own forecast"
                 className={cn(
  "group relative overflow-hidden rounded-full h-7 px-2.5 text-xs",
  "shadow-[0_8px_22px_rgba(239,68,68,0.38)] hover:shadow-[0_10px_26px_rgba(239,68,68,0.48)] transition-all duration-200",
  "ring-1 ring-red-400 border border-red-300/80",
  "bg-red-600 text-white hover:bg-red-500",
  "translate-y-[1px]",
)}
                >
                  <span className="pointer-events-none absolute inset-0">
                    <span className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent opacity-70" />
                  </span>

                  <span className="pointer-events-none absolute inset-0">
                    <span
                      className={cn(
                        "absolute -inset-6 rounded-full bg-red-500/20 blur-xl",
                        isReducedMotion
                          ? "opacity-70"
                          : "animate-pulse opacity-90",
                      )}
                    />
                  </span>

                  <span className="pointer-events-none absolute inset-0">
                    <span
                      className={cn(
                        "absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent",
                        isReducedMotion
                          ? "opacity-0"
                          : "-translate-x-[120%] animate-[shine_3.2s_linear_infinite]",
                      )}
                    />
                  </span>

                  <span className="relative z-10 inline-flex items-center gap-1.5">
                    <Sparkles
  className={cn(
    "h-3.5 w-3.5 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.45)]",
    isReducedMotion
      ? ""
      : "animate-[twinkle_2.2s_ease-in-out_infinite]",
  )}
/>
                    <span className="font-semibold">{submitScoreLabel}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Button>
              </Link>

              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 rounded-md border border-border bg-popover/95 px-2.5 py-1.5 text-[11px] font-medium text-foreground opacity-0 shadow-lg backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100 whitespace-nowrap">
                Predict your own forecast
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Chart */}
      <div className="w-full" style={{ height: effectiveHeight }}>
        {normalized.length > 0 && !hasMeaningfulData ? (
          <div className="h-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20">
            <div className="mb-2 text-sm font-semibold text-foreground">No data available</div>
            <div className="text-xs text-muted-foreground text-center max-w-md px-4">
              Sales forecast data is not yet available for this segment and country.
            </div>
          </div>
        ) : allowForecastByData && forecastLoading ? (
          // Hold the chart back until forecast data is ready, otherwise the
          // chart would render historical-only first and re-render a moment
          // later with the forecast lines added — visible as a flash.
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Loading forecast…
          </div>
        ) : (
        <ResponsiveContainer width="100%" height={effectiveHeight}>
          <RechartsLineChart
            key={chartKey}
            data={chartData}
            margin={chartMargin}
            onMouseMove={(state: any) => {
              const label = state?.activeLabel;
              setHoveredMonth(typeof label === "string" ? label : null);
            }}
            onMouseLeave={() => setHoveredMonth(baseMonthLabel)}
          >
            {renderGradientDefs("vertical", true)}

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              strokeOpacity={0.3}
            />

            <XAxis
              dataKey="month"
              tick={xTickStyle}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={isMobile ? false : { stroke: "hsl(var(--border))" }}
              minTickGap={isMobile ? 10 : 0}
            />

            <YAxis
              tick={yTickStyle}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={isMobile ? false : { stroke: "hsl(var(--border))" }}
              tickFormatter={abbreviate}
              width={isMobile ? 40 : 60}
              domain={yAxisDomain as any}
              allowDataOverflow={false}
            />

            <Tooltip content={<ForecastTooltip />} />

            <Legend
  verticalAlign="bottom"
  align="center"
  content={({ payload }: any) => {
    if (!payload?.length) return null;
    // Filter to only the lines that are currently enabled; Recharts may or
    // may not exclude hide=true lines from payload depending on version.
    const enabledKeys = new Set(lines.map((l) => l.key));
    const visiblePayload = payload.filter((item: any) => enabledKeys.has(item.dataKey));
    if (!visiblePayload.length) return null;

    return (
      <div
        className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
        style={{ fontSize: isMobile ? 10 : 12 }}
      >
        {visiblePayload.map((item: any) => {
          const name = String(item.value || item.dataKey);
          const help = legendHelp[name] || "—";
          const color = item.color;

          return (
            <div key={name} className="relative group inline-flex items-center">
              {/* line icon */}
              <span
                className="mr-2 inline-block h-[2px] w-5 rounded-full"
                style={{ backgroundColor: color }}
              />

              {/* label */}
              <span
                className="cursor-help select-none"
                style={{ color }}
                aria-label={help}
               
              >
                {name}
              </span>

              {/* custom hover tooltip */}
              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max max-w-[280px] -translate-x-1/2 rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs text-foreground opacity-0 shadow-lg backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100">
                {help}
              </div>
            </div>
          );
        })}
      </div>
    );
  }}
/>

            <Brush
              dataKey="month"
              height={isMobile ? 12 : 16}
              stroke="hsl(var(--border))"
              fill="hsl(var(--background))"
            />

            {lines.map((line, index) => {
              const strokeColor = getGradientFillFromColor(line.color, true);
              const areaGradientId =
                line.showArea && line.color
                  ? `${getGradientIdFromColor(line.color)}-area`
                  : undefined;

              return (
                <React.Fragment key={line.key}>
                  {line.showArea && areaGradientId && (
                    <Area
                      type="monotone"
                      dataKey={line.key}
                      stroke="none"
                      fill={`url(#${areaGradientId})`}
                      isAnimationActive={animationConfig.isAnimationActive}
                      animationDuration={CHART_ANIMATION.duration.medium}
                      animationEasing={CHART_ANIMATION.easing.easeOut}
                      animationBegin={getStaggerDelay(
                        index,
                        CHART_ANIMATION.stagger.medium,
                      )}
                    />
                  )}

                  <Line
                    type="monotone"
                    dataKey={line.key}
                    stroke={strokeColor}
                    strokeDasharray={line.strokeDasharray}
                    strokeWidth={
                      line.key === selectedCat ||
                      line.key === `${selectedCat}_forecast_byof` ||
                      line.key === `${selectedCat}_forecast_race`
                        ? 3
                        : 2
                    }
                    dot={
                      line.key === `${selectedCat}_forecast_byof` ||
                      line.key === `${selectedCat}_forecast_race`
                        ? false
                        : { r: 4, strokeWidth: 2 }
                    }
                    activeDot={
                      line.key === `${selectedCat}_forecast_byof` ||
                      line.key === `${selectedCat}_forecast_race`
                        ? false
                        : { r: 6, strokeWidth: 2 }
                    }
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    name={line.name}
                    isAnimationActive={animationConfig.isAnimationActive}
                    animationDuration={CHART_ANIMATION.duration.medium}
                    animationEasing={CHART_ANIMATION.easing.easeOut}
                    animationBegin={getStaggerDelay(
                      index,
                      CHART_ANIMATION.stagger.medium,
                    )}
                  />
                </React.Fragment>
              );
            })}
          </RechartsLineChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
