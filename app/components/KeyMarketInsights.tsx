// app/components/KeyMarketInsights.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Badge,
  Gauge,
  Activity,
  Globe2,
  Target,
} from "lucide-react";

type OptionalBox = {
  id: number;
  title: string;
  body: string;
  icon?: string;
  theme?: string;
  sort_order?: number;
  link_url?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  last_updated?: string | null;
};

type OverallChartPoint = { month: string; data: Record<string, number> };

function monthLabelFromYYYYMM(yyyymm: string) {
  try {
    return new Date(`${yyyymm}-01`).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return yyyymm;
  }
}

function formatNumber(n: number) {
  if (!Number.isFinite(n)) return "–";
  return Math.round(n).toLocaleString("en-IN");
}

function formatLastUpdated(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isExternalLink(url?: string | null) {
  if (!url) return false;
  return /^(https?:)?\/\//i.test(url);
}

// shared subtle border (grey-blue hairline)
const softBorder = "ring-1 ring-inset ring-[#2F3949]/40";

const Card = ({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) => (
  <div
    className={`rounded-2xl ${softBorder} p-6 md:p-7 shadow-[0_10px_40px_rgba(0,0,0,.45)] backdrop-blur ${className}`}
  >
    {children}
  </div>
);

const KeyMarketInsights: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topCategoryText, setTopCategoryText] = useState<string>("Loading…");
  const [latestReportMonth, setLatestReportMonth] = useState<string>("");
  const [optionalBoxes, setOptionalBoxes] = useState<OptionalBox[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // 1) Get latest available month from Flash Reports overall data
        const overallRes = await fetch(
          "/api/flash-reports/overall-chart-data?horizon=6&forceHistorical=1",
          { cache: "no-store" },
        );
        if (!overallRes.ok) {
          throw new Error("Failed to load overall chart data");
        }

        const overallJson = await overallRes.json();
        const points: OverallChartPoint[] = Array.isArray(overallJson?.data)
          ? overallJson.data
          : [];

        const categories = ["2W", "3W", "PV", "TRAC", "Truck", "Bus", "CV"];

        const latestIdx = (() => {
          for (let i = points.length - 1; i >= 0; i--) {
            const p = points[i];
            if (!p?.data) continue;
            const hasAny = categories.some((k) => (p.data?.[k] ?? 0) > 0);
            if (hasAny) return i;
          }
          return -1;
        })();

        const prevIdx = (() => {
          for (let i = latestIdx - 1; i >= 0; i--) {
            const p = points[i];
            if (!p?.data) continue;
            const hasAny = categories.some((k) => (p.data?.[k] ?? 0) > 0);
            if (hasAny) return i;
          }
          return -1;
        })();

        const latestMonth = latestIdx >= 0 ? points[latestIdx]?.month : "";

        if (!cancelled) {
          setLatestReportMonth(
            latestMonth ? monthLabelFromYYYYMM(latestMonth) : "",
          );
        }

        // 2) Top growing category (MoM %)
        if (latestIdx >= 0 && prevIdx >= 0) {
          const curr = points[latestIdx].data || {};
          const prev = points[prevIdx].data || {};

          const growthByCat = categories
            .map((k) => {
              const c = Number(curr[k] ?? 0);
              const p = Number(prev[k] ?? 0);
              const growth = p > 0 ? ((c - p) / p) * 100 : null;
              return { key: k, c, p, growth };
            })
            .filter((r) => r.growth != null && Number.isFinite(r.growth));

          const top = growthByCat.sort(
            (a, b) => (b.growth ?? 0) - (a.growth ?? 0),
          )[0];

          if (top) {
            const catLabel: Record<string, string> = {
              "2W": "Two-Wheeler",
              "3W": "Three-Wheeler",
              PV: "Passenger Vehicle",
              CV: "Commercial Vehicle",
              TRAC: "Tractor",
              Truck: "Truck",
              Bus: "Bus",
            };

            const pct = Math.round((top.growth ?? 0) * 10) / 10;
            const label = catLabel[top.key] ?? top.key;

            setTopCategoryText(
              `${label} leads growth with ` +
                ` ${pct >= 0 ? "+" : ""}${pct}% MoM` +
                `, rising from ${formatNumber(top.p)} to ${formatNumber(top.c)} units` +
                (latestMonth
                  ? ` in ${monthLabelFromYYYYMM(latestMonth)}.`
                  : "."),
            );
          } else {
            setTopCategoryText("No MoM growth data available for categories.");
          }
        } else {
          setTopCategoryText("No category growth data available.");
        }

        // 3) Optional insight boxes (CMS)
        const optRes = await fetch("/api/home-content/optional-insights", {
          cache: "no-store",
        });
        const optJson = optRes.ok ? await optRes.json() : [];

        if (!cancelled) {
          setOptionalBoxes(Array.isArray(optJson) ? optJson : []);
          setLoading(false);
        }
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setError("Failed to load key market insights");
          setLoading(false);
          setTopCategoryText("Data unavailable.");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const optionalCards = useMemo(() => {
    return (optionalBoxes || []).filter((b) => b?.title && b?.body);
  }, [optionalBoxes]);

  const IconByName: Record<string, any> = {
    Activity,
    Globe2,
    Target,
    TrendingUp,
    Badge,
    Gauge,
  };

  const themeToClass: Record<string, string> = {
    violet: "bg-[#1a1230]/70",
    emerald: "bg-[#0c1f17]/70",
    rose: "bg-[#2a1316]/70",
    amber: "bg-[#2a1d07]/70",
    indigo: "bg-[#091628]/70",
    slate: "bg-[#0b141f]/70",
  };

  const baseCardUpdatedLabel = latestReportMonth || "—";

  return (
    <section className="w-full bg-[#0b1218] text-white py-10 md:py-14">
      <div className="mx-auto w-[95vw] xl:w-[93vw] 2xl:w-[90vw] max-w-none px-2 sm:px-3 lg:px-4">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
          Global Update
        </h2>
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

        <div className="mt-8 grid grid-cols-1 gap-6 md:mt-10 md:grid-cols-2 xl:grid-cols-3">
          {optionalCards.map((b) => {
            const Icon = IconByName[b.icon || "Activity"] || Activity;
            const bgClass =
              themeToClass[b.theme || "slate"] || "bg-[#0b141f]/70";

            const accent =
              b.theme === "emerald"
                ? "bg-emerald-400/15 text-emerald-300"
                : b.theme === "rose"
                  ? "bg-rose-400/15 text-rose-300"
                  : b.theme === "amber"
                    ? "bg-amber-400/15 text-amber-300"
                    : b.theme === "violet"
                      ? "bg-violet-400/15 text-violet-300"
                      : b.theme === "indigo"
                        ? "bg-blue-500/15 text-blue-300"
                        : "bg-white/8 text-white/90";

            const cardUpdatedLabel = formatLastUpdated(
              b.last_updated ?? b.updated_at ?? b.created_at,
            );

            const cardContent = (
              <Card
                className={`${bgClass} h-full transition-all duration-200 ${
                  b.link_url ? "hover:-translate-y-0.5 hover:ring-[#42506a]/60" : ""
                }`}
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-start gap-4">
                    <span
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${accent}`}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold">{b.title}</h3>
                      <p className="mt-2 text-white/80 leading-relaxed">
                        {b.body}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-white/10 pt-3 text-xs text-white/55">
                    Last updated: {cardUpdatedLabel}
                  </div>
                </div>
              </Card>
            );

            if (!b.link_url) {
              return <div key={b.id}>{cardContent}</div>;
            }

            if (isExternalLink(b.link_url)) {
              return (
                <a
                  key={b.id}
                  href={b.link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block h-full cursor-pointer"
                >
                  {cardContent}
                </a>
              );
            }

            return (
              <Link
                key={b.id}
                href={b.link_url}
                className="block h-full cursor-pointer"
              >
                {cardContent}
              </Link>
            );
          })}
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-white/50">Loading insights…</p>
        ) : null}
      </div>
    </section>
  );
};

export default KeyMarketInsights;