"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { CHART_ANIMATION, getAnimationConfig } from "@/lib/animationConfig";

interface DonutChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  height?: number;
  className?: string;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

// Darker, muted palette for dark theme (blue/green–friendly)
const DEFAULT_COLORS = [
  "#0369A1", // deep sky blue
  "#15803D", // deep emerald green
  "#0F766E", // dark teal
  "#4338CA", // indigo
  "#6D28D9", // violet
  "#B45309", // dark amber
  "#BE123C", // deep rose
  "#4B5563", // slate neutral
];

export function DonutChart({
  data,
  height = 300,
  className,
  showLegend = true,
  innerRadius = 70,
  outerRadius = 110,
}: DonutChartProps) {
  const isReducedMotion = useReducedMotion();
  const animationConfig = getAnimationConfig(isReducedMotion);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const dataWithMeta = data.map((item, index) => {
    const baseColor =
      item.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    return {
      ...item,
      total,
      _baseColor: baseColor,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percentage = ((item.value / item.payload.total) * 100).toFixed(1);

      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg px-4 py-3 shadow-xl animate-fade-in">
          <p className="text-sm font-semibold mb-1">{item.name}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {percentage}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;

    if (percent < 0.05) return null; // hide tiny slices

    const RADIAN = Math.PI / 180;

    // push label a bit closer to the outer edge for better alignment
    const labelRadius = innerRadius + (outerRadius - innerRadius) * 0.45;

    const x = cx + labelRadius * Math.cos(-midAngle * RADIAN);
    const y = cy + labelRadius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        textAnchor="middle" // center text on the point
        dominantBaseline="central" // vertical centering
        fill="white" // near-white
        style={{
          fontSize: 13,
          fontWeight: 800,
          paintOrder: "stroke", // draw stroke first
          stroke: "rgba(15, 23, 42, 0.9)", // dark outline (good on gradients)
          strokeWidth: 2,
        }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className={cn("w-full flex flex-col", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* 1️⃣ Define a radial gradient for each slice */}
          <defs>
            {dataWithMeta.map((entry, index) => (
              <linearGradient
                id={`donutGradient-${index}`}
                key={`donutGradient-${index}`}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                {/* Top of slice – slightly lighter */}
                <stop
                  offset="0%"
                  stopColor={entry._baseColor}
                  stopOpacity={0.85}
                />
                {/* Middle – full color */}
                <stop
                  offset="50%"
                  stopColor={entry._baseColor}
                  stopOpacity={1}
                />
                {/* Bottom – a bit softer */}
                <stop
                  offset="100%"
                  stopColor={entry._baseColor}
                  stopOpacity={0.8}
                />
              </linearGradient>
            ))}
          </defs>

          <Pie
            data={dataWithMeta}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={3}
            dataKey="value"
            isAnimationActive={animationConfig.isAnimationActive}
            animationDuration={CHART_ANIMATION.duration.slow}
            animationEasing={CHART_ANIMATION.easing.easeInOut}
            animationBegin={0}
            label={CustomLabel}
            labelLine={false}
            stroke="hsl(var(--background))"
            strokeWidth={2}
          >
            {/* 2️⃣ Use the gradients as fills */}
            {dataWithMeta.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={`url(#donutGradient-${index})`}
                className="hover:opacity-80 transition-opacity duration-200"
              />
            ))}
          </Pie>

          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={50}
              iconType="circle"
              wrapperStyle={{
                paddingTop: "20px",
                fontSize: "13px",
              }}
              formatter={(value: string) => (
                <span className="text-foreground font-medium">{value}</span>
              )}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
