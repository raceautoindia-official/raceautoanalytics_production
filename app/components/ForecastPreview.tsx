// app/components/ForecastPreview.tsx
"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

/* ------------ helpers ------------ */
const enIN = (n: number) =>
  new Intl.NumberFormat("en-IN").format(Math.round(n));

// shared subtle border (grey-blue hairline)
const softBorder = "ring-1 ring-inset ring-[#2F3949]/40";

const TooltipBox = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value ?? 0;
  return (
    <div className={`rounded-2xl ${softBorder} bg-black/90 px-4 py-3 text-white shadow-2xl backdrop-blur`}>
      <div className="text-base font-semibold leading-none">{label}</div>
      <div className="mt-2 text-sm text-white/70">
        Passenger Vehicles:&nbsp;
        <span className="font-semibold text-white">{enIN(val)}</span>
      </div>
    </div>
  );
};

/* ------------ data ------------ */
const MONTHS_2025 = [
  "January 2025",
  "February 2025",
  "March 2025",
  "April 2025",
  "May 2025",
  "June 2025",
  "July 2025",
  "August 2025",
  "September 2025",
  "October 2025",
  "November 2025",
  "December 2025",
];

// roughly shaped to your screenshot
const series = [
  69000, 80000, 80050, 83000, 86000, 88000, 86000, 75000, 72000, 73000, 79000,
  78000,
];

const chartData = MONTHS_2025.map((m, i) => ({
  month: m,
  pv: series[i],
}));

/* ------------ component ------------ */
const ForecastPreview: React.FC = () => {
  return (
    <section className="w-full bg-[#0b1218] py-10 text-white">
      <div className="mx-auto max-w-7xl px-4">
        {/* Heading */}
        <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">
          12-Month Forecast Preview
        </h2>
        <p className="mt-2 max-w-3xl text-white/70">
          AI-powered sales projections across major vehicle categories
        </p>

        {/* Card (hairline border) */}
        <div className={`mt-6 rounded-3xl ${softBorder} bg-[#0b141f]/70 p-6 shadow-[0_10px_40px_rgba(0,0,0,.55)]`}>
          <h3 className="text-lg font-semibold">Multi-Category Sales Forecast</h3>
          <p className="mt-1 text-white/70">
            All categories showing positive growth trajectory. Two-Wheeler and
            Passenger Vehicles expected to outperform with 7%+ growth rates.
            Commercial Vehicles showing steady recovery post-seasonal
            adjustments.
          </p>

          {/* Chart box (hairline border) */}
          <div className={`mt-6 h-[480px] w-full rounded-2xl ${softBorder} bg-[#06121e] p-3`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 18, left: 12, bottom: 16 }}
              >
                <CartesianGrid
                  strokeDasharray="3 6"
                  stroke="rgba(255,255,255,.08)"
                />
                <XAxis
                  dataKey="month"
                  ticks={MONTHS_2025}
                  interval={0}
                  tick={{ fill: "rgba(255,255,255,.65)", fontSize: 12 }}
                  tickFormatter={(v: string) => {
                    const [m, y] = v.split(" ");
                    return `${m.slice(0, 3)} ${y}`; // "Sep 2025"
                  }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={12}
                  minTickGap={0}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,.65)" }}
                  tickFormatter={(v) => enIN(v as number)}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip
                  content={<TooltipBox />}
                  cursor={{ stroke: "#ffffff", strokeOpacity: 0.08 }}
                />
                {/* vertical marker at July */}
                <ReferenceLine
                  x="July 2025"
                  stroke="#e5e7eb"
                  strokeOpacity={0.45}
                />
                <Line
                  type="monotone"
                  dataKey="pv"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    stroke: "#3B82F6",
                    strokeWidth: 3,
                    fill: "#0b141f",
                  }}
                  activeDot={{
                    r: 6,
                    fill: "#0b141f",
                    stroke: "#ffffff",
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-white/80">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#3B82F6]" />
            Passenger Vehicles
          </div>

          {/* Divider (subtle) */}
          <div className="my-8 h-px w-full bg-[#2F3949]/40" />

          {/* Summary tiles (hairline border) */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <SummaryTile color="#60A5FA" label="Passenger" value="87,148" delta="+9.4%" />
            <SummaryTile color="#22C55E" label="Commercial" value="55,599" delta="+23.5%" />
            <SummaryTile color="#FBBF24" label="Two-Wheeler" value="1,20,947" delta="+20.7%" />
            <SummaryTile color="#EF4444" label="Tractor" value="22,546" delta="+12.5%" />
          </div>
        </div>
      </div>
    </section>
  );
};

const SummaryTile = ({
  color,
  label,
  value,
  delta,
}: {
  color: string;
  label: string;
  value: string;
  delta: string;
}) => (
  <div className={`rounded-2xl ${softBorder} bg-white/5 p-6 text-center`}>
    <div className="flex items-center justify-center gap-2">
      <span
        className="inline-block h-3 w-3 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
    </div>
    <div className="mt-3 text-lg font-semibold">{label}</div>
    <div className="mt-2 text-3xl font-extrabold tabular-nums">{value}</div>
    <div className="mt-2 text-sm text-white/70">{delta}</div>
  </div>
);

export default ForecastPreview;
