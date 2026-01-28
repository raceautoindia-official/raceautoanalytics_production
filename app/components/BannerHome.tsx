"use client";

import React from "react";
import { Globe2, ChevronRight } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import NavBar from "./Navbar";

/* sample data */
const data = [
  { month: "July ", actual: 205_000, forecast: 205_000 },
  { month: "August ", actual: 198_500, forecast: 200_000 },
  { month: "September ", actual: 201_400, forecast: 206_000 },
  { month: "October ", actual: 194_200, forecast: 203_500 },
  // { month: "November 2025", actual: 198_900, forecast: 209_000 },
  // { month: "December 2025", actual: 200_600, forecast: 210_500 },
];

/* small UI helpers */
const Badge = ({ children }: React.PropsWithChildren) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/70">
    {children}
  </span>
);
const PillButton = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <a
    href={href}
    className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-white shadow-lg shadow-blue-900/30 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
  >
    {children}
    <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
  </a>
);
const GhostButton = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <a
    href={href}
    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-white/90 shadow-sm hover:bg-white/10"
  >
    {children}
  </a>
);

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/90 p-3 text-sm text-white shadow-xl backdrop-blur">
      <div className="mb-1 text-white/70">{label}</div>
      {payload.map((p: any) => (
        <div
          key={p.dataKey}
          className="flex items-center justify-between gap-6"
        >
          <span className="capitalize text-white/60">{p.dataKey}</span>
          <span className="font-medium tabular-nums">
            {p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function GlassCard({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={
        "rounded-2xl bg-white/5 p-5 md:p-6 lg:p-7 shadow-2xl shadow-black/40 ring-1 ring-white/10 backdrop-blur-xl " +
        className
      }
    >
      {children}
    </div>
  );
}

export default function LandingHero() {
  return (
    <>
      <NavBar />
      <main className="relative min-h-[60svh] overflow-hidden bg-slate-950 text-white mb-6">
        {/* background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-950" />
          <div className="absolute left-1/3 top-1/4 h-[60rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(29,78,216,0.25),transparent_60%)] blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'128\\' height=\\'128\\' viewBox=\\'0 0 8 8\\'><path fill=\\'%23fff\\' fill-opacity=\\'0.6\\' d=\\'M0 0h1v1H0zM4 4h1v1H4z\\'/></svg>')",
            }}
          />
        </div>

        {/* hero */}
        <section className="relative">
          <div className="mx-auto grid w-[95vw] xl:w-[93vw] 2xl:w-[90vw] max-w-none grid-cols-1 items-start gap-10 px-2 sm:px-3 lg:px-4 py-12 md:grid-cols-2 md:py-16 lg:gap-14 lg:py-20">
            {/* left copy */}
            <div className="relative z-10">
              <Badge>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  className="opacity-80"
                  aria-hidden
                >
                  <path
                    fill="currentColor"
                    d="M12 2L2 7l10 5l10-5zM2 17l10 5l10-5"
                  />
                </svg>
                AI-Powered Analytics
              </Badge>
              <h2 className="mt-6 text-5xl font-extrabold leading-tight tracking-tight md:text-6xl">
                <span className="block text-white">Flash Reports for</span>
                <span className="mt-2 block bg-gradient-to-r from-blue-400 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                  Automotive Markets
                </span>
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
                Monthly insights on vehicle sales across six categories with
                AI-powered forecasting. Track OEM performance, market trends,
                and electric vehicle adoption across global regions.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <PillButton href="/flash-reports">
                  <span>View Flash Reports</span>
                </PillButton>
                <GhostButton href="/forecast">
                  <span>Go to Forecast</span>
                </GhostButton>
              </div>
              {/* <div className="mt-8 text-sm text-white/50">
                <span className="font-medium text-white/70">Note:</span> This
                module links to your existing RaceAutoAnalytics project.
              </div> */}
            </div>

            {/* right chart */}
            <div className="relative">
              <GlassCard className="relative z-10 w-full">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white/90">
                    Market Overview
                  </h3>
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-white/80">
                    <Globe2 className="h-4 w-4" />
                    <span>IN India</span>
                  </div>
                </div>

                <div className="h-72 w-full overflow-visible">
                  <ResponsiveContainer width="100%" height="100%">
                    <RLineChart
                      data={data}
                      margin={{ top: 16, right: 24, left: 1, bottom: 24 }}
                    >
                      <CartesianGrid
                        strokeOpacity={0.15}
                        strokeDasharray="3 3"
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: "#c7d2fe" }}
                        tickMargin={10}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        // width={72}
                        tick={false}
                        tickMargin={12}
                        axisLine={false}
                        tickLine={false}
                        domain={[160000, 225000]}
                        tickFormatter={(v) => v.toLocaleString()}
                      />
                      {/* <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#94a3b8", strokeOpacity: 0.25 }} /> */}
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="#60a5fa"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        stroke="#22d3ee"
                        strokeDasharray="4 4"
                        strokeWidth={3}
                        dot={false}
                      />
                    </RLineChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              <div className="absolute -inset-3 -z-10 rounded-3xl bg-[radial-gradient(60%_50%_at_70%_30%,rgba(37,99,235,0.25),transparent)] blur-2xl" />
            </div>
          </div>
        </section>

        {/* maker badge */}
      </main>
    </>
  );
}
