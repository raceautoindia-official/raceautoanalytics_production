// app/components/OEMLeaderboardAndSegmentsEqualized.tsx
"use client";

import React from "react";
import { PieChart, Pie, ResponsiveContainer, Cell } from "recharts";
import { ArrowUpRight, ArrowDownRight, BadgeCheck, TrendingUp } from "lucide-react";

/* ====== equal height for both top cards ====== */
const TOP_CARD_H = 360;

/* ---------- helpers ---------- */
const indian = (n: number) => {
  const s = Math.round(n).toString();
  const last3 = s.slice(-3);
  const other = s.slice(0, -3);
  return (other ? other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," : "") + last3;
};

const DeltaPill = ({ delta }: { delta: number }) => {
  const up = delta >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold
        ${up ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25" : "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/25"}`}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(delta)}%
    </span>
  );
};

type Leader = { rank: number; name: string; value: number; share: number; deltaPct: number; deltaAbs: number };
type Segment = { name: string; value: number; color: string };

/* ---------- demo data ---------- */
const LEADERS: Leader[] = [
  { rank: 1, name: "Maruti Suzuki", value: 51482, share: 36.3, deltaPct: -2.6, deltaAbs: -1348 },
  { rank: 2, name: "Kia",           value: 33975, share: 10.9, deltaPct:  3.8, deltaAbs: +1240 },
  { rank: 3, name: "Tata Motors",   value: 27464, share: 26.7, deltaPct: -6.0, deltaAbs: -1739 },
  { rank: 4, name: "Hyundai",       value: 23559, share: 30.9, deltaPct: -1.9, deltaAbs: -447 },
  { rank: 5, name: "Mahindra",      value: 22770, share: 22.9, deltaPct:  3.9, deltaAbs: +855 },
  { rank: 6, name: "Toyota",        value: 18098, share: 17.8, deltaPct: -9.5, deltaAbs: -1896 },
];
const SEGMENTS: Segment[] = [
  { name: "Segment A", value: 33.9, color: "#2563EB" },
  { name: "Segment B", value: 34.5, color: "#22C55E" },
  { name: "Segment C", value: 31.6, color: "#EF4444" },
];

/* ---------- subcomponents ---------- */
function LeaderRow({ item, max }: { item: Leader; max: number }) {
  const pctOfMax = (item.value / max) * 100;
  return (
    <div className="rounded-xl bg-white/5 p-3 sm:p-4 ring-1 ring-inset ring-[#2F3949]/30">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-200 ring-1 ring-blue-500/25 font-bold">
          {item.rank}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="truncate text-base sm:text-lg font-semibold">{item.name}</div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="tabular-nums text-base sm:text-lg font-semibold">{indian(item.value)}</div>
              <DeltaPill delta={item.deltaPct} />
            </div>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-white/10">
            <div className="h-2 rounded-full bg-blue-500" style={{ width: `${pctOfMax}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-white/60">
            <span>{item.share}% share</span>
            <span className={`${item.deltaAbs >= 0 ? "text-emerald-300" : "text-rose-300"} tabular-nums`}>
              {item.deltaAbs >= 0 ? "+" : ""}{indian(Math.abs(item.deltaAbs))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const PieLabel = (p: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = p;
  const a = Math.PI / 180, r = innerRadius + (outerRadius - innerRadius) * 0.65;
  const x = cx + r * Math.cos(-midAngle * a), y = cy + r * Math.sin(-midAngle * a);
  return <text x={x} y={y} fill="#fff" fontSize={12} fontWeight={700} textAnchor="middle" dominantBaseline="central">
    {`${Math.round(percent * 100)}%`}
  </text>;
};

/* ---------- main ---------- */
export default function OEMLeaderboardAndSegmentsEqualized() {
  const maxVal = Math.max(...LEADERS.map(l => l.value));
  const topSeg = SEGMENTS.reduce((a, b) => (a.value > b.value ? a : b));
  const approxUnits = 32976;

  // subtle grey-blue hairline border used on the top two cards
  const softBorder = "ring-1 ring-inset ring-[#2F3949]/40";

  return (
    <section className="w-full bg-[#0b1218] text-white py-8">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 lg:grid-cols-[1.6fr_1fr]">
        {/* LEFT: fixed-height card with scrollable list */}
        <div
          className={`rounded-2xl ${softBorder} bg-[#0b141f]/70 p-5 shadow-[0_8px_30px_rgba(0,0,0,.45)] flex flex-col`}
          style={{ height: TOP_CARD_H }}
        >
          <h3 className="text-lg sm:text-xl font-semibold">OEM Leaderboard - Top 10 Manufacturers</h3>
          <div
            className="mt-4 space-y-3 overflow-y-auto pr-1 flex-1 min-h-0"
            style={{ scrollbarWidth: "thin" as any }}
          >
            {LEADERS.map(item => <LeaderRow key={item.rank} item={item} max={maxVal} />)}
          </div>
        </div>

        {/* RIGHT: fixed-height donut card */}
        <div
          className={`rounded-2xl ${softBorder} bg-[#0b141f]/70 p-5 shadow-[0_8px_30px_rgba(0,0,0,.45)] flex flex-col`}
          style={{ height: TOP_CARD_H }}
        >
          <h3 className="text-lg sm:text-xl font-semibold">Segment Distribution</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 flex-1 min-h-0">
            <div className="h-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={SEGMENTS}
                    dataKey="value"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={3}
                    labelLine={false}
                    label={PieLabel}
                  >
                    {SEGMENTS.map(s => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 self-center">
              {SEGMENTS.map(s => (
                <div key={s.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                    <span className="text-sm md:text-base text-white/90">{s.name}</span>
                  </div>
                  <span className="tabular-nums text-sm md:text-base text-white/80">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT BOTTOM: Market Leader (kept blue-tinted background, neutral hairline) */}
        <div className={`lg:col-start-2 rounded-2xl ${softBorder} bg-[#0b1b2e] p-5`}>
          <div className="flex items-center gap-2 text-blue-200 text-sm">
            <BadgeCheck className="h-4 w-4" />
            <span className="font-medium">Market Leader</span>
          </div>
          <div className="mt-1 text-2xl sm:text-3xl font-extrabold">{topSeg.name}</div>
          <div className="mt-1 text-white/80 text-sm sm:text-base">{indian(approxUnits)} units sold</div>
          <div className="mt-1 text-xs sm:text-sm text-white/70">Leading segment with {topSeg.value}% market share</div>
        </div>

        {/* OPTIONAL: Insight under the left column (kept semantic green style) */}
        <div
  className={`lg:col-start-1 lg:row-start-2 rounded-2xl ${softBorder} bg-emerald-500/5 p-4 text-emerald-200`}
>
  <div className="flex items-start gap-2 text-sm">
    <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" />
    Maruti Suzuki dominates with 36.3% market share. Top 3 OEMs control 73.9% of the market.
  </div>
</div>

      </div>
    </section>
  );
}
