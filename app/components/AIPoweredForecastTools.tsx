"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Sparkles, Sliders, ShieldCheck } from "lucide-react";

/* ----------------- shared subtle border ----------------- */
const softBorder = "ring-1 ring-inset ring-[#2F3949]/40";

/* ----------------- data ----------------- */
const FEATURES_LEFT = [
  { label: "Real-time Data", color: "#60A5FA" },
  { label: "Multi-scenario", color: "#E5E7EB" },
];
// Audit I-8: replaced unverifiable "95% Accuracy" claim (no methodology /
// confidence interval published) with a defensible factual statement about
// what the forecasts are based on. Avoids the trust issue an industry
// analyst would flag immediately.
const FEATURES_RIGHT = [
  { label: "Validated Forecasts", color: "#E5E7EB" },
  { label: "Risk Analysis", color: "#EF4444" },
];

const WORKFLOW = [
  {
    title: "Select Segment & Horizon",
    desc: "Pick category/segment and forecast window to get a clean baseline.",
    icon: Sparkles,
  },
  {
    title: "Choose Method",
    desc: "Compare AI/Linear/BYF/Survey-based outputs in one view.",
    icon: Sliders,
  },
  {
    title: "Scenario Adjustments",
    desc: "Tune assumptions (policy, economy, seasonality) and validate changes.",
    icon: ShieldCheck,
  },
  {
    title: "Export & Share",
    desc: "Generate insight-ready outputs for internal planning and reporting.",
    icon: CheckCircle2,
  },
];

const METHODS = [
  {
    title: "AI Forecast",
    badge: "Recommended",
    body: "Learns seasonal + structural patterns and adapts to market shifts with stronger trend sensitivity.",
  },
  {
    title: "Linear Trend",
    badge: "Baseline",
    body: "Simple trend projection—useful for quick checks, stable segments, and sanity validation.",
  },
  {
    title: "BYOF",
    badge: "Custom",
    body: "Bring your own forecast and compare against system baseline for alignment and review.",
  },
  {
    title: "Survey-ML",
    badge: "Consensus",
    body: "Blends survey inputs with analytics to capture sentiment-led directional changes.",
  },
];

const USE_CASES = [
  "Monthly volume planning & targets",
  "OEM performance and segment shifts",
  "EV adoption tracking and transition analysis",
  "Inventory / production planning",
  "Regional distribution planning",
  "Pricing & incentive sensitivity",
  "Export–import impact tracking",
  "Policy & regulation scenario testing",
];

type LatestInsight = {
  id: number;
  tag: string;
  delta: string;
  title: string;
  body: string;
  publish_date?: string | null;
  sort_order?: number;
};

export default function AIPoweredForecastTools() {
  const [latestInsights, setLatestInsights] = useState<LatestInsight[]>([]);
  const [latestUpdatedLabel, setLatestUpdatedLabel] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/home-content/latest-insights", {
          cache: "no-store",
        });
        const json = res.ok ? await res.json() : [];
        const arr: LatestInsight[] = Array.isArray(json) ? json : [];
        if (cancelled) return;

        setLatestInsights(arr);

        // label: most recent publish_date if present, else empty
        const dates = arr
          .map((i) => i.publish_date)
          .filter(Boolean)
          .map((d) => new Date(String(d)))
          .filter((d) => !Number.isNaN(d.getTime()))
          .sort((a, b) => b.getTime() - a.getTime());

        if (dates.length) {
          setLatestUpdatedLabel(
            dates[0].toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            }),
          );
        } else {
          setLatestUpdatedLabel("");
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setLatestInsights([]);
          setLatestUpdatedLabel("");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const insightsToRender = useMemo(() => {
    return (latestInsights || []).slice(0, 3);
  }, [latestInsights]);

  return (
    <>
      {/* ---------- AI Powered Forecast Tools ---------- */}
      
      <div className="mx-auto w-[95vw] xl:w-[93vw] 2xl:w-[90vw] max-w-none px-2 sm:px-3 lg:px-4">
         <div className="mt-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600/25 via-indigo-600/15 to-cyan-500/15 p-6 ring-1 ring-white/10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.35),transparent_60%)] blur-3xl" />
          <div className="pointer-events-none absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.32),transparent_60%)] blur-3xl" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-extrabold tracking-tight">
                Ready to build your next forecast?
              </h3>
              <p className="mt-2 max-w-2xl text-white/70">
                Start with a baseline, compare methods, and lock your scenario with confidence.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
            
              <Link
                href="/forecast"
                className="inline-flex items-center justify-center rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/15"
              >
                Open Forecast
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-16 grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
        {/* copy */}
        <div>
          <h3 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            RACE — AI POWERED FORECAST TOOLS
          </h3>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/75">
            Advanced machine learning algorithms analyze market patterns,
            seasonal trends, and economic indicators to deliver precise
            forecasting with confidence intervals and scenario planning.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ul className="space-y-4">
              {FEATURES_LEFT.map((f) => (
                <li key={f.label} className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: f.color }}
                  />
                  <span className="text-white/90">{f.label}</span>
                </li>
              ))}
            </ul>
            <ul className="space-y-4">
              {FEATURES_RIGHT.map((f) => (
                <li key={f.label} className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: f.color }}
                  />
                  <span className="text-white/90">{f.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* image */}
        <div
          className={`relative rounded-3xl ${softBorder} bg-white/5 p-2 shadow-[0_30px_80px_rgba(17,24,39,.45)]`}
        >
          <div className="relative h-[350px] w-full overflow-hidden rounded-2xl">
            <Image
              src="/images/int.png"
              alt="AI Forecast"
              fill
              className="object-cover"
            />
          </div>
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-[28px] blur-2xl opacity-30 bg-[radial-gradient(60%_70%_at_70%_50%,#3B82F6,transparent_60%)]" />
        </div>
      </div>

      {/* ---------- Latest Insights ---------- */}
      <div className="mt-16">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h3 className="text-3xl font-extrabold tracking-tight">
              Latest Insights
            </h3>
            <p className="mt-2 text-white/70">
              Key market developments and trending analysis
            </p>
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <CalendarDays className="h-5 w-5" />
            <span>
              Last updated:{" "}
              <span className="text-white/85">{latestUpdatedLabel || "–"}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {insightsToRender.map((i) => (
            <article
              key={i.id ?? i.title}
              className={`rounded-2xl ${softBorder} bg-[#0b141f]/70 p-6 shadow-[0_10px_30px_rgba(0,0,0,.45)]`}
            >
              <div className="flex items-start justify-between">
                <span className="rounded-md bg-blue-500/15 px-3 py-1 text-sm font-medium text-blue-200">
                  {i.tag}
                </span>
                <span className="text-sm font-semibold text-white/80">
                  {i.delta}
                </span>
              </div>
              <h4 className="mt-4 text-xl font-semibold">{i.title}</h4>
              <p className="mt-2 text-white/70 leading-relaxed">{i.body}</p>
            </article>
          ))}
        </div>
      </div>

      {/* ---------- Forecast Workflow (NEW) ---------- */}
      <div className="mt-16">
        <div className="mb-6">
          <h3 className="text-3xl font-extrabold tracking-tight">
            Forecast Workflow
          </h3>
          <p className="mt-2 max-w-3xl text-white/70">
            A simple, repeatable flow to build forecasts, compare methods, and
            lock decisions with confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {WORKFLOW.map((w) => {
            const Icon = w.icon;
            return (
              <div
                key={w.title}
                className={`rounded-2xl ${softBorder} bg-[#0b141f]/60 p-6 shadow-[0_10px_30px_rgba(0,0,0,.40)]`}
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-400/20">
                    <Icon className="h-5 w-5 text-blue-200" />
                  </span>
                  <h4 className="text-lg font-semibold text-white/90">
                    {w.title}
                  </h4>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  {w.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------- Forecast Methods (NEW) ---------- */}
      <div className="mt-16">
        <div className="mb-6">
          <h3 className="text-3xl font-extrabold tracking-tight">
            Methods You Can Compare
          </h3>
          <p className="mt-2 max-w-3xl text-white/70">
            Validate outcomes by comparing multiple forecasting approaches in one view.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {METHODS.map((m) => (
            <div
              key={m.title}
              className={`rounded-2xl ${softBorder} bg-[#0b141f]/60 p-6 shadow-[0_10px_30px_rgba(0,0,0,.40)]`}
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-lg font-semibold text-white/90">{m.title}</h4>
                <span className="rounded-md bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-200">
                  {m.badge}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                {m.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Use Cases (NEW) ---------- */}
      <div className="mt-16">
        <div className="mb-6">
          <h3 className="text-3xl font-extrabold tracking-tight">
            What You Can Do With Forecasts
          </h3>
          <p className="mt-2 max-w-3xl text-white/70">
            Turn forecast outputs into practical decisions across sales, operations, and strategy.
          </p>
        </div>

        <div
          className={`rounded-2xl ${softBorder} bg-[#0b141f]/60 p-6 shadow-[0_10px_30px_rgba(0,0,0,.40)]`}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map((u) => (
              <div key={u} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-400/20">
                  <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                </span>
                <p className="text-sm text-white/75">{u}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- CTA band (NEW) ---------- */}
     
      </div>
    </>
  );
}