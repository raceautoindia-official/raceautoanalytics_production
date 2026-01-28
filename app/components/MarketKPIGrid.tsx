"use client";

import React from "react";
import { Activity, Users2, Gauge, Target, TrendingUp } from "lucide-react";

/** Indian-style grouping: 205138 -> 2,05,138 */
function formatIndianNumber(n: number) {
  const s = n.toString();
  const last3 = s.slice(-3);
  const other = s.slice(0, -3);
  return (other ? other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," : "") + last3;
}

/** Minimal sparkline (no external chart lib) */
const Sparkline: React.FC<{
  data: number[];
  stroke: string;
  dot?: string;
  height?: number;
}> = ({ data, stroke, dot = stroke, height = 56 }) => {
  const width = 320;
  const px = 16,
    py = 12;
  const w = width - px * 2;
  const h = height - py * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const rng = max - min || 1;
  const stepX = w / (data.length - 1);

  const pts = data.map((d, i) => [px + i * stepX, py + (1 - (d - min) / rng) * h] as const);
  const dPath = pts.map(([x, y], i) => (i ? `L ${x} ${y}` : `M ${x} ${y}`)).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full" preserveAspectRatio="none">
      <line x1={px} x2={width - px} y1={height - py} y2={height - py} stroke="rgba(255,255,255,.08)" />
      <path d={dPath} fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="black" stroke={dot} strokeWidth="3" />
      ))}
    </svg>
  );
};

/** Card wrapper with colored glow on black bg */
const Card: React.FC<
  React.PropsWithChildren<{ glow: string; className?: string }>
> = ({ glow, className = "", children }) => (
  <div className={`relative rounded-[22px] p-6 ${className}`} style={{ background: "linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.02))", border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 10px 30px rgba(0,0,0,.7)" }}>
    {/* soft outer glow */}
    <div
      className="pointer-events-none absolute -inset-4 -z-10 rounded-[28px] blur-2xl opacity-40"
      style={{ background: `radial-gradient(60% 55% at 50% 35%, ${glow}, transparent 70%)` }}
    />
    {children}
  </div>
);

const MarketKPIGridDark: React.FC = () => {
  const totalSales = 205_138;
  const salesSeries = [220000, 219400, 219300, 219350, 219200];
  const evShareSeries = [4.0, 4.0, 4.0, 4.1, 4.2];

  return (
    <section className="relative  bg-black py-12">
      {/* subtle vignette so cards pop on pure black */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_10%,rgba(255,255,255,.06),transparent)]" />
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {/* Total Sales */}
          <Card glow="rgba(59,130,246,.22)" className="bg-[#0A1020]/60">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/18 text-blue-300">
                <Activity className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-1 text-sm text-blue-200/95">
                <TrendingUp className="h-4 w-4" />
                <span>4.5%</span>
              </div>
            </div>

            <div className="mt-5 text-3xl font-extrabold tracking-tight text-white">
              {formatIndianNumber(totalSales)}
            </div>
            <div className="mt-1 text-white/60">Total Sales</div>

            <div className="mt-5">
              <Sparkline data={salesSeries} stroke="#60A5FA" />
              <div className="mt-1 flex items-center justify-between text-xs text-white/45">
                <span>220000</span>
                <div className="flex gap-12">
                  <span>August 2025</span>
                  <span>December 2025</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Active OEMs */}
          <Card glow="rgba(16,185,129,.22)" className="bg-[#06190f]/60">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                <Users2 className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200 ring-1 ring-emerald-300/20">
                Top 6
              </span>
            </div>

            <div className="mt-5 text-3xl font-extrabold tracking-tight text-white">6</div>
            <div className="mt-1 text-white/60">Active OEMs</div>

            <div className="mt-6 grid grid-cols-2 gap-x-8 text-sm">
              <div className="space-y-2 text-white/70">
                <div>Maruti</div>
                <div>Kia</div>
                <div>Tata</div>
              </div>
              <div className="space-y-2 text-right font-semibold">
                <div className="text-white/90">36.3%</div>
                <div className="text-white/90">10.9%</div>
                <div className="text-white/90">26.7%</div>
              </div>
            </div>
          </Card>

          {/* EV Market Share */}
          <Card glow="rgba(245,158,11,.26)" className="bg-[#221704]/60">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
                <Gauge className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-1 text-sm text-amber-200/95">
                <TrendingUp className="h-4 w-4" />
                <span>0.8pp</span>
              </div>
            </div>

            <div className="mt-5 text-3xl font-extrabold tracking-tight text-white">4.2%</div>
            <div className="mt-1 text-white/60">EV Market Share</div>

            <div className="mt-5">
              <Sparkline data={evShareSeries} stroke="#FBBF24" />
              <div className="mt-1 flex items-center justify-between text-xs text-white/45">
                <span>4</span>
                <div className="flex gap-12">
                  <span>August 2025</span>
                  <span>December 2025</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Forecast Accuracy */}
          <Card glow="rgba(139,92,246,.26)" className="bg-[#160b26]/60">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400/15 text-violet-300">
                <Target className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-violet-400/10 px-3 py-1 text-xs font-medium text-violet-200 ring-1 ring-violet-300/20">
                High
              </span>
            </div>

            <div className="mt-5 text-3xl font-extrabold tracking-tight text-white">94.8%</div>
            <div className="mt-1 text-white/60">Forecast Accuracy</div>

            <div className="mt-5">
              <div className="h-2 w-full rounded-full bg-white/10">
                <div
                  className="relative h-2 rounded-full from-violet-400 to-fuchsia-500 bg-gradient-to-r"
                  style={{ width: "94.8%" }}
                >
                  <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-white shadow ring-2 ring-fuchsia-500" />
                </div>
              </div>
              <div className="mt-2 text-xs text-white/50">Based on 12-month history</div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default MarketKPIGridDark;
