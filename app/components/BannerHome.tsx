"use client";

import React, { useMemo, useState } from "react";
import { Globe2, ChevronRight, PlayCircle, ArrowLeftRight } from "lucide-react";
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
import Link from "next/link";

/* sample data */
const data = [
  { month: "July ", actual: 205_000, forecast: 205_000 },
  { month: "August ", actual: 198_500, forecast: 200_000 },
  { month: "September ", actual: 201_400, forecast: 206_000 },
  { month: "October ", actual: 194_200, forecast: 203_500 },
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
    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-white/90 shadow-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
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

/** --- Flip Card (no popup) --- */
function FlipInfoCard({
  title,
  subtitle,
  bullets,
  ctaHref,
  ctaLabel,
  theme = "blue",
}: {
  title: string;
  subtitle: string;
  bullets: string[];
  ctaHref: string;
  ctaLabel: string;
  theme?: "blue" | "indigo";
}) {
  const [flipped, setFlipped] = useState(false);

  const themeGrad =
    theme === "indigo"
      ? "from-indigo-600/30 via-slate-950/40 to-slate-950/20"
      : "from-blue-600/30 via-slate-950/40 to-slate-950/20";

  const accent =
    theme === "indigo"
      ? "text-indigo-200 border-indigo-400/20 bg-indigo-400/10"
      : "text-blue-200 border-blue-400/20 bg-blue-400/10";

  return (
    <div className="group relative">
      <div
        className="relative h-[360px] md:h-[380px] lg:h-[360px] w-full [perspective:1400px]"
        aria-label={`${title} info card`}
      >
        <div
          className={[
            "absolute inset-0 transition-transform duration-700 [transform-style:preserve-3d]",
            flipped ? "[transform:rotateY(180deg)]" : "[transform:rotateY(0deg)]",
          ].join(" ")}
        >
          {/* FRONT */}
          <div className="absolute inset-0 [backface-visibility:hidden]">
            <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6 shadow-2xl shadow-black/40 backdrop-blur-xl overflow-hidden isolate">
              <div
                className={`pointer-events-none absolute inset-0 opacity-[0.25] bg-gradient-to-br ${themeGrad}`}
              />
              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${accent}`}>
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      <span>Interactive guide</span>
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-white/95">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/70">
                      {subtitle}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm text-white/70">
                  {bullets.slice(0, 3).map((b, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/40" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto flex items-center gap-3 pt-5">
                  <button
                    type="button"
                    onClick={() => setFlipped(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    Read more
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <a
                    href={ctaHref}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm text-white shadow-md shadow-blue-900/20 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-400/60 overflow-hidden"
                  >
                    {ctaLabel}
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* BACK */}
          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6 shadow-2xl shadow-black/40 backdrop-blur-xl overflow-hidden">
              <div
                className={`pointer-events-none absolute inset-0 opacity-[0.25] bg-gradient-to-br ${themeGrad}`}
              />
              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-white/95">
                      How to use {title}
                    </h4>
                    <p className="mt-1 text-sm text-white/70">
                      Quick steps + video walkthrough
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFlipped(false)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                    aria-label="Back"
                  >
                    Back
                  </button>
                </div>

                {/* Instructions */}
                {/* <div className="mt-4 space-y-2 text-sm text-white/75">
                  {bullets.map((b, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/40" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div> */}

                {/* Video placeholder */}
                <div className="mt-auto pt-5">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-white/90">
                          Instruction Video
                        </div>
                      
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                      >
                        <PlayCircle className="h-4 w-4" />
                        Watch
                      </button>
                    </div>

                    <div className="mt-3 h-20 rounded-xl border border-dashed border-white/15 bg-white/5 flex items-center justify-center text-xs text-white/50">
                      Video coming soon
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* /BACK */}
        </div>
      </div>
    </div>
  );
}

export default function LandingHero() {
  const flashBullets = useMemo(
    () => [
      "Select Country + Month to load country-wise flash report data.",
      "Compare MoM/YoY trends across segments and categories.",
      "Open category cards to drill into 2W / 3W / PV / CV / TRAC / CE.",
      "Use charts for market share, EV split, and OEM performance (where available).",
    ],
    []
  );

  const forecastBullets = useMemo(
    () => [
      "Choose a segment and time range for forecasting.",
      "Compare actual vs forecast and review assumptions (AI/linear/BYOF/survey).",
      "Use scenario adjustments to tune inputs and validate outputs.",
      "Export or share insights after finalizing forecast view.",
    ],
    []
  );

  return (
    <>
      <NavBar />

      {/* ✅ NEW SECTION: two column flip cards (above main) */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/98 to-slate-950" />
          <div className="absolute right-0 top-[-10rem] h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.22),transparent_60%)] blur-3xl" />
          <div className="absolute left-0 bottom-[-12rem] h-[44rem] w-[44rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.20),transparent_60%)] blur-3xl" />
        </div>

        <div className="mx-auto w-[95vw] xl:w-[93vw] 2xl:w-[90vw] max-w-none px-2 sm:px-3 lg:px-4 pt-10 md:pt-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/70" />
                Learn modules quickly
              </div>
              <h2 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight">
                Flash Reports & Forecast - Quick Guides
              </h2>
              <p className="mt-2 max-w-3xl text-sm md:text-base text-white/70">
                Explore both modules and flip the cards to see how-to steps and
                a panel for instruction videos.
              </p>
            </div>

            {/* <div className="flex items-center gap-3">
              <Link
                href="/flash-reports"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
              >
                Flash Reports
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/forecast"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
              >
                Forecast
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div> */}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 pb-10 md:grid-cols-2">
            <FlipInfoCard
              title="Flash Reports"
              subtitle="Monthly market snapshots across categories with country-wise switching, segment splits, OEM share, and EV adoption insights."
              bullets={flashBullets}
              ctaHref="/flash-reports"
              ctaLabel="Open Flash Reports"
              theme="blue"
            />
            <FlipInfoCard
              title="Forecast"
              subtitle="Forecast volumes with analytics-driven methods and scenario comparisons. Designed for segment-level planning and trend validation."
              bullets={forecastBullets}
              ctaHref="/forecast"
              ctaLabel="Open Forecast"
              theme="indigo"
            />
          </div>
        </div>
      </section>

      {/* your existing hero */}
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
                  <span>Explore full dataset</span>
                </PillButton>
                <GhostButton href="/forecast">
                  <span>Go to Forecast</span>
                </GhostButton>
              </div>
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
      </main>
    </>
  );
}