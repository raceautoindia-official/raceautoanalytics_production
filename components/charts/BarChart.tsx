"use client";

import React from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  CHART_ANIMATION,
  getStaggerDelay,
  getAnimationConfig,
} from "@/lib/animationConfig";
import {
  renderGradientDefs,
  getGradientFillFromColor,
} from "@/lib/gradientConfig";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface BarChartProps {
  data: any[];
  bars: Array<{
    key: string;
    name: string;
    color?: string;
    useGradient?: boolean;
  }>;
  height?: number;
  className?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  layout?: "horizontal" | "vertical";
  tooltipRenderer?: (props: any) => React.ReactNode;
  /**
   * Optional unit suffix for numeric values (e.g., "%").
   * If provided and no custom tooltipRenderer is passed, the default tooltip
   * will append this suffix.
   */
  valueSuffix?: string;

  /**
   * Decimals to show when valueSuffix is provided. Defaults to 1 for "%",
   * otherwise 0.
   */
  valueDecimals?: number;
}

export function BarChart({
  data,
  bars,
  height = 300,
  className,
  showGrid = true,
  showLegend = true,
  layout = "vertical",
  tooltipRenderer,
  valueSuffix,
  valueDecimals,
}: BarChartProps) {
  const isReducedMotion = useReducedMotion();
  const animationConfig = getAnimationConfig(isReducedMotion);

  const isVertical = layout === "vertical";
  const isHorizontal = layout === "horizontal";
  const isMobile = useIsMobile();

  const rowHeight = isMobile ? 28 : 40; // tighter rows on mobile
  const minHeight = isMobile ? Math.min(height, 260) : height;

  const computedHeight = isVertical
    ? Math.max(
        minHeight,
        (data?.length || 1) * rowHeight + (isMobile ? 40 : 80),
      )
    : isMobile
      ? Math.min(height, 260)
      : height;

  const xTickStyle = {
    fontSize: isMobile ? 9 : 11,
    fill: "hsl(var(--muted-foreground))",
  };

  const yTickStyle = {
    fontSize: isMobile ? 9 : 11,
    fill: "hsl(var(--muted-foreground))",
  };

  const DefaultTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const formatValue = (value: any) => {
        if (value == null) return "–";
        const n = Number(value);
        if (!Number.isFinite(n)) return String(value);

        if (valueSuffix) {
          const d =
            valueDecimals != null ? valueDecimals : valueSuffix === "%" ? 1 : 0;
          return `${n.toFixed(d)}${valueSuffix}`;
        }

        return Math.round(n).toLocaleString();
      };

      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg px-4 py-3 shadow-xl animate-fade-in">
          <p className="text-sm font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-baseline gap-2 mb-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <p className="text-xs font-medium" style={{ color: entry.color }}>
                {entry.name}:
              </p>
              <p className="text-sm font-bold">{formatValue(entry.value)}</p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const gradientDirection = layout === "vertical" ? "vertical" : "horizontal";

  return (
    <div className={cn("w-full", className)} style={{ height: computedHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          margin={
            isMobile
              ? { top: 4, right: 8, left: isVertical ? 8 : 4, bottom: 5 }
              : { top: 5, right: 20, left: 20, bottom: 5 }
          }
          layout={layout}
        >
          {renderGradientDefs(gradientDirection, false)}

          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              strokeOpacity={0.3}
            />
          )}
          <XAxis
            type={isHorizontal ? "category" : "number"}
            dataKey={isHorizontal ? "name" : undefined}
            tick={xTickStyle}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={isMobile ? false : { stroke: "hsl(var(--border))" }}
            tickMargin={isMobile ? 0 : 8}
            interval={0}
            angle={isMobile && isHorizontal ? -30 : 0}
            textAnchor={isMobile && isHorizontal ? "end" : "middle"}
            tickFormatter={(value: string | number) => {
              const str = String(value);
              const maxChars = isMobile ? 10 : 16;
              return str.length > maxChars ? `${str.slice(0, maxChars)}…` : str;
            }}
          />

          <YAxis
            type={isHorizontal ? "number" : "category"}
            dataKey={isVertical ? "name" : undefined}
            tick={yTickStyle}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={isMobile ? false : { stroke: "hsl(var(--border))" }}
            interval={0}
            width={
              isVertical
                ? isMobile
                  ? 40 // narrower label column on mobile
                  : 120
                : undefined
            }
            tickFormatter={(value: string | number) => {
              const str = String(value);
              const maxChars = isMobile ? 10 : 12;
              return str.length > maxChars ? `${str.slice(0, maxChars)}…` : str;
            }}
          />

          <Tooltip
            // If a custom tooltipRenderer is provided, use that; else fallback
            content={tooltipRenderer ? tooltipRenderer : DefaultTooltip}
          />

          {showLegend && (
            <Legend
              wrapperStyle={{
                paddingTop: isMobile ? 16 : 20,
                fontSize: isMobile ? 10 : 12,
              }}
              iconSize={isMobile ? 8 : 10}
              iconType="rect"
            />
          )}
          {bars.map((bar, index) => {
            const fillColor = getGradientFillFromColor(
              bar.color,
              bar.useGradient,
            );

            return (
              <Bar
                key={bar.key}
                dataKey={bar.key}
                fill={fillColor}
                name={bar.name}
                radius={layout === "vertical" ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                isAnimationActive={animationConfig.isAnimationActive}
                animationDuration={
                  layout === "vertical"
                    ? CHART_ANIMATION.duration.medium
                    : CHART_ANIMATION.duration.slow
                }
                animationEasing={CHART_ANIMATION.easing.easeOut}
                animationBegin={getStaggerDelay(
                  index,
                  CHART_ANIMATION.stagger.small,
                )}
                className="hover:opacity-80 transition-opacity duration-200"
              />
            );
          })}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
