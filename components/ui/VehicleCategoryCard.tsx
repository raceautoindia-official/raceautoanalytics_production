"use client";

import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Award,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MiniSparkline } from "@/components/charts/MiniSparkline";
import { MiniBarComparison } from "@/components/charts/MiniBarComparison";
import { ProgressRing } from "@/components/charts/ProgressRing";
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
    topOEM: string;
    evPenetration?: number;
    currentMonthSales: number;
    previousMonthSales: number | null;
    trendData: number[];
    rank: number;
    targetProgress: number;
  };
  index: number;
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
}: VehicleCategoryCardProps) {
  // const isGrowing = metrics.momGrowth >= 0;
  const sparklineData = metrics.trendData.map((value) => ({ value }));

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

    // ≥ 1,000,000 => M
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;

    // ≥ 1,000 => K
    if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;

    // < 1,000 => plain number
    return `${Math.round(value)}`;
  };

  const hasMom = !Number.isNaN(metrics.momGrowth);
  const isGrowing = hasMom && metrics.momGrowth >= 0;

  const hasYoy = !Number.isNaN(metrics.yoyGrowth);

  return (
    <Link
      href={`/flash-reports/${id}`}
      className="group block animate-fade-in hover-lift"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="relative bg-card border border-border rounded-xl p-6 h-full hover:bg-card/80 transition-all duration-300 overflow-hidden hover:shadow-xl hover:border-primary/30">
        {/* Background gradient overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-300"
          style={{
            background: `linear-gradient(135deg, ${chartColor}20 0%, transparent 100%)`,
          }}
        />

        {/* Shine effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div
            className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Header Section */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "p-3 rounded-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                  bgColor
                )}
              >
                <Icon className={cn("w-6 h-6", color)} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                    {title}
                  </h3>
                  {isTopPerformer && <Award className="w-4 h-4 text-warning" />}
                  {isTrending && <Zap className="w-4 h-4 text-success" />}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
          </div>

          {/* Badges Section */}
          <div className="flex flex-wrap gap-2 mb-4">
            {metrics.rank ? (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                #{metrics.rank} in Growth
              </span>
            ) : (
              <span className="text-xs bg-muted px-2 py-1 rounded-full font-medium text-muted-foreground">
                Growth Rank –
              </span>
            )}
            {isTrending && (
              <span
                className={cn(
                  "relative inline-flex items-center gap-2 rounded-full px-2.5 py-1",
                  "text-[11px] font-semibold tracking-wide text-emerald-50",
                  "bg-gradient-to-r from-emerald-600/90 via-emerald-500/80 to-teal-500/90",
                  "shadow-sm shadow-emerald-500/20 ring-1 ring-emerald-300/30",
                  "overflow-hidden"
                )}
              >
                {/* subtle sheen */}
                <span
                  className="pointer-events-none absolute inset-0 opacity-30"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
                    transform: "translateX(-120%)",
                    animation: "shine 2.2s ease-in-out infinite",
                  }}
                />

                {/* pulse dot */}
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-200/80 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-200" />
                </span>

                <Zap className="w-3.5 h-3.5 opacity-90" />
                <span className="relative">Top Gainer</span>
              </span>
            )}

            {subCategories && subCategories.length > 0 && (
              <span className="text-xs bg-muted px-2 py-1 rounded capitalize">
                {subCategories.length} segments
              </span>
            )}
          </div>

          {/* Metrics Grid Section */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                Sales Volume
              </div>
              <div className="text-2xl font-bold">
                {formatUnits(metrics.salesVolume)}
              </div>
              <div className="text-xs text-muted-foreground">units</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">
                MoM Growth
              </div>
              <div
                className={cn(
                  "text-2xl font-bold flex items-center gap-1",
                  hasMom
                    ? isGrowing
                      ? "text-success"
                      : "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {hasMom ? (
                  <>
                    {isGrowing ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                    {formatPct(metrics.momGrowth)}
                  </>
                ) : (
                  <span>–</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">
                Market Share
              </div>
              <div className="text-xl font-bold">
                {metrics.marketShare.toFixed(1)}%
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">
                YoY Growth
              </div>
              <div
                className={cn(
                  "text-xl font-bold",
                  hasYoy
                    ? metrics.yoyGrowth >= 0
                      ? "text-success"
                      : "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {hasYoy ? formatPct(metrics.yoyGrowth) : "–"}
              </div>
            </div>
          </div>

          {/* Top OEM Badge */}
          <div className="mb-4 p-2 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">
              Leading OEM
            </div>
            <div className="text-sm font-semibold">{metrics.topOEM}</div>
          </div>

          {/* Charts Section */}
          <div className="space-y-4 mb-4">
            {/* Sparkline */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  6-Month Trend
                </span>
                {/* <ProgressRing
                  percentage={Math.round(metrics.targetProgress)}
                  size={40}
                  strokeWidth={3}
                  color={chartColor}
                  label={`${Math.round(metrics.targetProgress)}%`}
                /> */}
              </div>
              <MiniSparkline
                data={sparklineData}
                color={chartColor}
                height={48}
              />
            </div>

            {/* Mini Bar Comparison */}
            {/* <MiniBarComparison
              current={metrics.currentMonthSales}
              previous={metrics.previousMonthSales}
              color={chartColor}
              height={28}
            /> */}
          </div>

          {/* Optional EV Penetration */}
          {metrics.evPenetration !== undefined && (
            <div className="mt-auto pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
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
        </div>
      </div>
    </Link>
  );
}
