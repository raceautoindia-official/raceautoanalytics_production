"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAppContext } from "@/components/providers/Providers";
import {
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Award,
  Zap,
  Lock,
  Clock3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface VehicleCategoryCardProps {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  subCategories?: string[];
  metrics: {
    salesVolume: number;
    momGrowth: number;
    yoyGrowth: number;
    marketShare: number;
    topOEM?: string;
    evPenetration?: number;
    altPenetration?: number;
    currentMonthSales: number;
    previousMonthSales: number | null;
    trendData: number[];
    rank: number;
    targetProgress: number;
  };
  index: number;
  disabled?: boolean;
  disabledMessage?: string;
}

function buildSuffix(country?: string, month?: string) {
  const qs = new URLSearchParams();
  const c = String(country || "").trim();
  const m = String(month || "").trim();
  if (c) qs.set("country", c);
  if (m) qs.set("month", m);
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export function VehicleCategoryCard({
  id,
  title,
  description,
  icon: Icon,
  color,
  bgColor,
  subCategories,
  metrics,
  index,
  disabled = false,
  disabledMessage,
}: VehicleCategoryCardProps) {
  const { region, month } = useAppContext();

  const suffix = useMemo(() => buildSuffix(region, month), [region, month]);
  const href = useMemo(() => `/flash-reports/${id}${suffix}`, [id, suffix]);


  const colorMap: Record<string, string> = {
    "text-blue-400": "#007AFF",
    "text-green-400": "#2ECC71",
    "text-purple-400": "#8B5CF6",
    "text-amber-400": "#FFC043",
    "text-red-400": "#FF5B5B",
    "text-orange-400": "#FF8C42",
    "text-teal-400": "#1ABC9C",
  };

  const chartColor = colorMap[color] || "#007AFF";
  const isOverall = id === "overall-automotive-industry";
  const shouldShowLeader =
    !isOverall && !!String(metrics.topOEM || "").trim();
  const isTopPerformer = metrics.rank > 0 && metrics.rank <= 2;
  const isTrending =
    metrics.rank === 1 &&
    Number.isFinite(metrics.momGrowth) &&
    metrics.momGrowth > 0;

  const formatPct = (value: number) =>
    Number.isNaN(value) ? "–" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

  const formatUnits = (value: number) => {
    if (value == null || Number.isNaN(value)) return "–";

    const abs = Math.abs(value);

    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;

    return `${Math.round(value)}`;
  };

  const hasMom = !Number.isNaN(metrics.momGrowth);
  const isGrowing = hasMom && metrics.momGrowth >= 0;
  const hasYoy = !Number.isNaN(metrics.yoyGrowth);

  const disabledCopy =
    disabledMessage ||
    "Data for this segment will be available soon for the selected country.";

  const cardContent = (
    <div
      className={cn(
        "relative h-full overflow-hidden rounded-2xl border transition-all duration-300",
        isOverall ? "p-5 md:p-6" : "p-6",
        disabled
          ? "cursor-not-allowed border-border/70 bg-card/70 opacity-95"
          : "border-border bg-card hover:border-primary/30 hover:bg-card/90 hover:shadow-2xl",
      )}
    >
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          background: `radial-gradient(circle at top left, ${chartColor}55 0%, transparent 40%)`,
        }}
      />

      {disabled && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-background/10 via-transparent to-background/20" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 2px, transparent 2px, transparent 10px)",
            }}
          />
          <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
            <Lock className="h-3.5 w-3.5" />
            Available Soon
          </div>
        </>
      )}

      {!disabled && (
        <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
              transform: "translateX(-100%)",
              animation: "none",
            }}
          />
        </div>
      )}

      <div className="relative z-10 flex h-full flex-col">
        <div className={cn("flex items-start justify-between gap-4", isOverall ? "mb-3" : "mb-4")}>
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "rounded-xl p-3 transition-transform duration-300",
                bgColor,
                !disabled && "group-hover:scale-105",
                disabled && "saturate-50",
              )}
            >
              <Icon
                className={cn("h-6 w-6", color, disabled && "opacity-70")}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h3
                  className={cn(
                    "text-xl font-semibold",
                    disabled
                      ? "text-foreground/90"
                      : "group-hover:text-primary",
                  )}
                >
                  {title}
                </h3>

                {/* {!disabled && isTopPerformer && (
                  <Award className="h-4 w-4 text-warning" />
                )}
                {!disabled && isTrending && (
                  <Zap className="h-4 w-4 text-success" />
                )} */}
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          </div>

          <ChevronRight
            className={cn(
              "mt-1 h-5 w-5 flex-shrink-0 transition-all duration-200",
              disabled
                ? "text-muted-foreground/40"
                : "text-muted-foreground group-hover:translate-x-1 group-hover:text-primary",
            )}
          />
        </div>

        <div className={cn("flex flex-wrap gap-2", isOverall ? "" : "")}>
          {disabled ? (
            <>
              {/* <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
                Not clickable
              </span> */}
              <span className="rounded-full bg-muted/70 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                Country-specific data pending
              </span>
            </>
          ) : (
            <>
              {/* {metrics.rank ? (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  #{metrics.rank} in Growth
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  Growth Rank –
                </span>
              )} */}

              {/* {isTrending && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                  <Zap className="h-3.5 w-3.5" />
                  Top Gainer
                </span>
              )} */}

              {/* {subCategories && subCategories.length > 0 && (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
                  {subCategories.length} segments
                </span>
              )} */}
            </>
          )}
        </div>

        {disabled ? (
          <>
            <div className="rounded-xl border border-dashed border-amber-400/20 bg-amber-500/5 p-4">
              <div className=" flex items-center gap-2 text-sm font-semibold text-foreground">
                <Clock3 className="h-4 w-4 text-amber-300" />
                Segment not released for this market
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {disabledCopy}
              </p>
            </div>

            {/* <div className="mb-5 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="mb-1 text-xs text-muted-foreground">
                  Sales Volume
                </div>
                <div className="text-2xl font-bold text-foreground/60">–</div>
                <div className="text-xs text-muted-foreground">units</div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="mb-1 text-xs text-muted-foreground">
                  MoM Growth
                </div>
                <div className="text-2xl font-bold text-foreground/60">–</div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="mb-1 text-xs text-muted-foreground">
                  Market Share
                </div>
                <div className="text-xl font-bold text-foreground/60">–</div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="mb-1 text-xs text-muted-foreground">
                  YoY Growth
                </div>
                <div className="text-xl font-bold text-foreground/60">–</div>
              </div>
            </div> */}

            {/* <div className="mb-5 rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="mb-1 text-xs text-muted-foreground">Status</div>
              <div className="text-sm font-semibold text-foreground/85">
                Waiting for market share / EV share / application chart release
              </div>
            </div> */}

            {/* <div className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  6-Month Trend
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Unavailable
                </span>
              </div>
              <div className="relative h-14 overflow-hidden rounded-xl border border-dashed border-border/60 bg-muted/20">
                <div className="absolute inset-x-4 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-border/50" />
                <div className="absolute left-4 right-4 top-1/2 h-2 -translate-y-1/2 rounded-full bg-muted/40" />
              </div>
            </div> */}

            {/* <div className="mt-auto border-t border-border/50 pt-4">
              <div className="flex items-start gap-2 rounded-lg bg-muted/20 p-3">
                <Info className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  This card is disabled because the selected country does not
                  yet have usable flash report data for this segment.
                </p>
              </div>
            </div> */}
          </>
        ) : (
          <>
            <div
              className={cn(
                "grid gap-4",
                isOverall ? "mb-3 grid-cols-2 md:grid-cols-4" : "mb-5 grid-cols-2",
              )}
            >
              <div>
                <div className="mb-1 text-xs text-muted-foreground">
                  Sales Volume
                </div>
                <div className="text-3xl font-bold">
                  {formatUnits(metrics.salesVolume)}
                </div>
                <div className="text-xs text-muted-foreground">units</div>
              </div>

              <div>
                <div className="mb-1 text-xs text-muted-foreground">
                  Month on Month Growth
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1 text-3xl font-bold",
                    hasMom
                      ? isGrowing
                        ? "text-success"
                        : "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {hasMom ? (
                    <>
                      {isGrowing ? (
                        <TrendingUp className="h-5 w-5" />
                      ) : (
                        <TrendingDown className="h-5 w-5" />
                      )}
                      {formatPct(metrics.momGrowth)}
                    </>
                  ) : (
                    "–"
                  )}
                </div>
              </div>

              {!isOverall && (
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">
                    Market Share
                  </div>
                  <div className="text-xl font-bold">
                    {metrics.marketShare.toFixed(1)}%
                  </div>
                </div>
              )}

              <div>
                <div className="mb-1 text-xs text-muted-foreground">
                  Year on Year Growth
                </div>
                <div
                  className={cn(
                    "text-xl font-bold",
                    hasYoy
                      ? metrics.yoyGrowth >= 0
                        ? "text-success"
                        : "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {hasYoy ? formatPct(metrics.yoyGrowth) : "–"}
                </div>
              </div>

              {isOverall && (
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">
                    Alt. Penetration
                  </div>
                  <div className="text-xl font-bold">
                    {metrics.altPenetration != null && Number.isFinite(metrics.altPenetration)
                      ? `${metrics.altPenetration.toFixed(1)}%`
                      : "–"}
                  </div>
                </div>
              )}
            </div>

            {shouldShowLeader && (
              <div className="mb-5 rounded-xl bg-muted/50 p-3">
                <div className="mb-1 text-xs text-muted-foreground">
                  Leading OEM
                </div>
                <div className="text-sm font-semibold">{metrics.topOEM}</div>
              </div>
            )}

            {metrics.evPenetration !== undefined && (
              <div className="mt-auto border-t border-border/50 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    <span className="text-xs text-muted-foreground">
                      EV Share
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-success">
                    {metrics.evPenetration.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (disabled) {
    return (
      <div
        className="group block animate-fade-in"
        style={{ animationDelay: `${index * 100}ms` }}
        aria-disabled="true"
      >
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="group block animate-fade-in hover-lift"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {cardContent}
    </Link>
  );
}
