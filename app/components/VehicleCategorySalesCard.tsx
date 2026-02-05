"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

type OverallChartPoint = {
  month: string; // YYYY-MM
  data: Record<string, number>; // 2W, 3W, PV, TRAC, Truck, Bus, CV, Total
};

/* ---------- helpers ---------- */
function formatIndian(n: number) {
  const s = n.toString();
  const last3 = s.slice(-3);
  const other = s.slice(0, -3);
  return (
    (other ? other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," : "") + last3
  );
}

function CardTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  return (
    <div className="rounded-2xl bg-black/90 px-4 py-3 text-white shadow-2xl backdrop-blur">
      <div className="text-lg font-semibold leading-none">{p?.name}</div>
      <div className="mt-1 text-sm text-white/70">
        Sales:&nbsp;
        <span className="font-semibold text-white">
          {formatIndian(p?.sales ?? 0)}
        </span>
      </div>
    </div>
  );
}

/* ---------- category config ---------- */
const CATEGORY_CONFIG: Array<{ key: string; name: string; color: string }> = [
  { key: "PV", name: "Passenger", color: "#3B82F6" },
  { key: "CV", name: "CV", color: "#22C55E" },
  { key: "2W", name: "Two-Wheeler", color: "#F59E0B" },
  { key: "3W", name: "Three-Wheeler", color: "#A78BFA" },
  { key: "TRAC", name: "Tractor", color: "#EF4444" },
  { key: "Truck", name: "Truck", color: "#06B6D4" },
  { key: "Bus", name: "Bus", color: "#F97316" },
];

function formatKMB(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000)
    return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  return String(Math.round(n));
}

/* ---------- component ---------- */
const CrossCategoryPerformance: React.FC = () => {
  // Subtle hairline border (tweak opacity to taste: /25 lighter, /55 darker)
  const softBorder = "ring-1 ring-inset ring-[#2F3949]/40";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestPoint, setLatestPoint] = useState<OverallChartPoint | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // No month toggle on Home: fetch the default historical window ending at previous IST month.
        // Then pick the latest month that actually has values.
        const res = await fetch(
          "/api/flash-reports/overall-chart-data?horizon=6&forceHistorical=1",
          { cache: "no-store" },
        );
        if (!res.ok) {
          throw new Error(`Failed to load overall chart data: ${res.status}`);
        }

        const json = await res.json();
        const points: OverallChartPoint[] = Array.isArray(json?.data)
          ? json.data
          : [];

        // Latest month with at least one numeric category value.
        const latest =
          [...points].reverse().find((pt) => {
            const d = pt?.data || {};
            return CATEGORY_CONFIG.some((c) => Number(d?.[c.key]) > 0);
          }) ?? null;

        if (!cancelled) setLatestPoint(latest);
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setError("Failed to load cross-category sales from backend.");
          setLatestPoint(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const baseData = useMemo(() => {
    const data = latestPoint?.data || {};
    return CATEGORY_CONFIG.map((c) => ({
      key: c.key,
      name: c.name,
      sales: Number(data?.[c.key] ?? 0) || 0,
      color: c.color,
    }));
  }, [latestPoint]);

  const chartData = useMemo(() => baseData, [baseData]);

  const latestMonthLabel = useMemo(() => {
    if (!latestPoint?.month) return "";
    const d = new Date(`${latestPoint.month}-01T00:00:00`);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [latestPoint?.month]);

  return (
    <section className="bg-[#0a0f14] text-white">
      <div
        className="mx-auto w-[95vw] xl:w-[93vw] 2xl:w-[90vw] max-w-none px-2 sm:px-3 lg:px-4
"
      >
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Cross-Category Performance
        </h1>
        <p className="mt-2 text-white/70">
          {latestMonthLabel
            ? `Sales comparison across vehicle categories — ${latestMonthLabel}`
            : "Sales comparison across vehicle categories"}
        </p>

        {/* CARD */}
        <div
          className={`mt-6 rounded-3xl ${softBorder} bg-[#0b141f]/70 p-6 shadow-[0_10px_40px_rgba(0,0,0,.55)]`}
        >
          <h3 className="text-lg font-semibold">Sales by Vehicle Category</h3>
          <p className="mt-1 text-white/70">
            Latest available month (no month toggle on Home). Values shown below
            are absolute sales for each category.
          </p>

          {/* CHART */}
          <div
            className={`mt-6 h-[420px] w-full rounded-2xl ${softBorder} bg-[#06121e] p-3`}
          >
            {loading ? (
              <div className="h-full flex items-center justify-center text-sm text-white/70">
                Loading…
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center text-sm text-white/70">
                {error}
              </div>
            ) : !latestPoint ? (
              <div className="h-full flex items-center justify-center text-sm text-white/70">
                No category sales data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 12, right: 12, left: 12, bottom: 32 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 6"
                    stroke="rgba(255,255,255,.08)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "rgba(255,255,255,.65)" }}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={12}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,.65)" }}
                    tickFormatter={(v) => formatKMB(Number(v))}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,.03)" }}
                    content={<CardTooltip />}
                  />
                  <Bar dataKey="sales" barSize={24} radius={[8, 8, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* LEGEND */}
          <div className="mt-7 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-7">
            {baseData.map((d) => (
              <div key={d.name} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="inline-block h-3.5 w-3.5 rounded-full"
                  style={{ background: d.color }}
                />
                <div className="leading-tight">
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-white/70">
                    {formatIndian(d.sales)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CrossCategoryPerformance;
