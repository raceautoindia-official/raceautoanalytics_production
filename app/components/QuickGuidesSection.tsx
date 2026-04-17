"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  ChevronRight,
  PlayCircle,
  ArrowLeftRight,
  BarChart3,
  Layers,
  Sparkles,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

type CountryItem = {
  name: string;
  code: string;
  slug: string;
  description: string;
};

type RegionItem = {
  name: string;
  icon: string;
  description: string;
};

function flagUrl(code: string, size: 40 | 80 = 40) {
  return `https://flagcdn.com/w${size}/${code}.png`;
}

function FlagIcon({
  code,
  alt,
  size = "sm",
}: {
  code: string;
  alt: string;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "h-7 w-10" : "h-5 w-7";
  return (
    <img
      src={flagUrl(code, size === "md" ? 80 : 40)}
      srcSet={`${flagUrl(code, 40)} 1x, ${flagUrl(code, 80)} 2x`}
      alt={alt}
      loading="lazy"
      className={`${dim} rounded-md object-cover shadow-sm ring-1 ring-white/20`}
    />
  );
}

function getYouTubeEmbedUrl(url: string) {
  if (!url) return "";
  if (url.includes("youtube.com/embed/")) return url;

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "").trim();
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
  } catch {
    return "";
  }

  return "";
}

function getPreviousMonthYyyyMm() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function CountryModal({
  country,
  onClose,
}: {
  country: CountryItem | null;
  onClose: () => void;
}) {
  const targetMonth = getPreviousMonthYyyyMm();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    if (country) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [country, onClose]);

  if (!country) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        aria-label="Close modal overlay"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 p-5 shadow-2xl shadow-black/50 ring-1 ring-white/10"
        style={{ maxWidth: "min(28rem, 92vw)" }}
      >
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <FlagIcon code={country.code} alt={country.name} size="md" />
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/90">
              {country.name}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            Close
          </button>
        </div>

        <p className="relative mt-4 text-sm leading-relaxed text-white/70">
          {country.description}{" "}
          <Link
            href={`/flash-reports?country=${encodeURIComponent(
              country.slug,
            )}&month=${encodeURIComponent(targetMonth)}`}
          >
            <span className="text-sm font-medium text-blue-300 underline underline-offset-4 hover:text-blue-200">
              Click to view full dataset
            </span>
          </Link>
        </p>
      </div>
    </div>
  );
}

function FlipInfoCard({
  ariaLabel,
  bullets,
  ctaHref,
  ctaLabel,
  extraFront,
  enableReadMore = false,
  videoUrl,
  backTitle = "How to use this module",
  backSubtitle = "Quick steps + video walkthrough",
}: {
  ariaLabel: string;
  bullets: string[];
  ctaHref: string;
  ctaLabel: string;
  extraFront?: React.ReactNode;
  enableReadMore?: boolean;
  videoUrl?: string;
  backTitle?: string;
  backSubtitle?: string;
}) {
  const [flipped, setFlipped] = useState(false);
  const embedUrl = getYouTubeEmbedUrl(videoUrl || "");

  return (
    <div className="group relative h-full">
      <div
        className="relative w-full min-h-[660px] sm:min-h-[640px] md:min-h-[620px] lg:min-h-[560px] xl:min-h-[530px] 2xl:min-h-[510px] [perspective:1400px]"
        aria-label={ariaLabel}
      >
        <div
          className={[
            "absolute inset-0 transition-transform duration-700 [transform-style:preserve-3d]",
            flipped
              ? "[transform:rotateY(180deg)]"
              : "[transform:rotateY(0deg)]",
          ].join(" ")}
        >
          <div className="absolute inset-0 [backface-visibility:hidden]">
            <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-[#0b141f]/70 p-4 shadow-[0_18px_60px_rgba(0,0,0,.55)] backdrop-blur-xl transition-transform duration-300 group-hover:-translate-y-1 sm:p-5 md:p-6">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage:
                    "url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'120\\' height=\\'120\\' viewBox=\\'0 0 12 12\\'><path fill=\\'%23ffffff\\' fill-opacity=\\'0.30\\' d=\\'M0 0h1v1H0zM6 6h1v1H6z\\'/></svg>')",
                }}
              />

              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/75">
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                    <span className="font-semibold text-blue-300">
                      Interactive guide
                    </span>
                  </div>

                  <span className="relative mt-1 hidden sm:inline-flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/25" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white/50" />
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-white/80">
                  {bullets.slice(0, 6).map((b, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-white/50" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>

                {extraFront ? <div className="mt-4">{extraFront}</div> : null}

                <div className="mt-5 flex flex-col gap-3 pt-4 sm:flex-row sm:items-center">
                  {enableReadMore && (
                    <button
                      type="button"
                      onClick={() => setFlipped(true)}
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-yellow-300/40 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(234,179,8,.28)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-yellow-300/60"
                    >
                      View Demo
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}

                  <a
                    href={ctaHref}
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm text-white shadow-md shadow-blue-900/20 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                  >
                    {ctaLabel}
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-[#0b141f]/70 p-4 shadow-[0_18px_60px_rgba(0,0,0,.55)] backdrop-blur-xl transition-transform duration-300 group-hover:-translate-y-1 sm:p-5 md:p-6">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage:
                    "url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'120\\' height=\\'120\\' viewBox=\\'0 0 12 12\\'><path fill=\\'%23ffffff\\' fill-opacity=\\'0.30\\' d=\\'M0 0h1v1H0zM6 6h1v1H6z\\'/></svg>')",
                }}
              />

              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-white/95">
                      {backTitle}
                    </h4>
                    <p className="mt-1 text-sm text-white/70">{backSubtitle}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFlipped(false)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                    aria-label="Back"
                  >
                    Back
                  </button>
                </div>

                <div className="mt-4 flex-1 min-h-0">
                  <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-white/90">
                        Instruction Video
                      </div>

                      {embedUrl ? (
                        <a
                          href={videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                        >
                          <PlayCircle className="h-4 w-4" />
                          Watch on YouTube
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                        >
                          <PlayCircle className="h-4 w-4" />
                          Watch
                        </button>
                      )}
                    </div>

                    <div className="mt-3 flex-1 min-h-0">
                      {embedUrl ? (
                        <div className="h-full overflow-hidden rounded-xl border border-white/10 bg-black">
                          <iframe
                            className="h-full w-full"
                            src={embedUrl}
                            title={backTitle}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <div className="flex h-full min-h-[150px] items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/5 text-xs text-white/50">
                          Video coming soon
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* back */}
        </div>
      </div>
    </div>
  );
}

const DISABLED_COUNTRY_SLUGS = new Set([
  "peru",
  "russia",
]);

function CountryBadge({
  country,
  onClick,
}: {
  country: CountryItem;
  onClick: (c: CountryItem) => void;
}) {
  const available = !DISABLED_COUNTRY_SLUGS.has(country.slug);

  if (!available) {
    return (
      <div
        className="inline-flex h-10 w-full min-w-0 items-center justify-center rounded-full border border-white/8 bg-white/3 px-2 py-1.5 text-white/40 shadow-sm opacity-45 cursor-not-allowed select-none sm:h-auto sm:w-auto sm:justify-start sm:gap-2 sm:px-3 sm:py-1"
        aria-label={country.name}
        title={country.name}
      >
        <FlagIcon code={country.code} alt={country.name} />
        <span className="ml-2 hidden truncate text-xs sm:inline">
          {country.name}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick(country)}
      className="inline-flex h-10 w-full min-w-0 items-center justify-center rounded-full border border-white/15 bg-white/5 px-2 py-1.5 text-white/90 shadow-sm transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 sm:h-auto sm:w-auto sm:justify-start sm:gap-2 sm:px-3 sm:py-1"
      aria-label={`Open ${country.name} info`}
      title={country.name}
    >
      <FlagIcon code={country.code} alt={country.name} />
      <span className="ml-2 hidden truncate text-xs sm:inline">
        {country.name}
      </span>
    </button>
  );
}

function RegionBadge({ region }: { region: RegionItem }) {
  return (
    <div
      className="inline-flex h-10 w-full min-w-0 items-center justify-center rounded-full border border-white/15 bg-white/5 px-2 py-1.5 text-white/90 shadow-sm sm:h-auto sm:w-auto sm:justify-start sm:gap-2 sm:px-3 sm:py-1"
      title={region.name}
      aria-label={region.name}
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs">
        {region.icon}
      </span>
      <span className="ml-2 hidden text-xs sm:inline">
        {region.name}
      </span>
    </div>
  );
}

const VALUE_PROPS = [
  {
    title: "Country-wise switching",
    body: "Explore the same segment structure across multiple markets with consistent layouts and definitions.",
    icon: Layers,
  },
  {
    title: "MoM / YoY comparison",
    body: "Quickly identify corrections, spikes, and seasonality across categories and sub-segments.",
    icon: BarChart3,
  },
  {
    title: "Forecast + scenario planning",
    body: "Compare AI, Linear, BYOF, and Survey-based forecasts to validate assumptions and direction.",
    icon: Sparkles,
  },
  {
    title: "Reliable, presentation-ready output",
    body: "Use charts and tables that are formatted for decision-making and internal reporting workflows.",
    icon: ShieldCheck,
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Pick country + month / horizon",
    body: "Start with the market you track and the period you want to analyze or forecast.",
  },
  {
    step: "02",
    title: "Review segments & cross-check trends",
    body: "Validate with MoM/YoY trends and compare across PV/CV/2W/3W/TRAC/CE where available.",
  },
  {
    step: "03",
    title: "Finalize view and export insights",
    body: "Lock a scenario, capture key deltas, and share across your planning stakeholders.",
  },
];

export default function QuickGuidesSection() {
  const [activeCountry, setActiveCountry] = useState<CountryItem | null>(null);

const countries: CountryItem[] = useMemo(
  () => [
    {
      name: "India",
      code: "in",
      slug: "india",
      description:
        "India flash report will include total market sales, EV sales, and application split.",
    },
    {
      name: "Brazil",
      code: "br",
      slug: "brazil",
      description:
        "Brazil flash report will include total market sales, EV sales, and application split.",
    },
    {
      name: "South Africa",
      code: "za",
      slug: "south-africa",
      description:
        "South Africa flash report will include total market sales, EV sales, and application split.",
    },
    {
      name: "Japan",
      code: "jp",
      slug: "japan",
      description:
        "Japan flash report will include total market sales, EV sales, and application split.",
    },
    {
      name: "Pakistan",
      code: "pk",
      slug: "pakistan",
      description:
        "Pakistan flash report will include total market sales, EV sales, and application split.",
    },
    {
      name: "Vietnam",
      code: "vn",
      slug: "vietnam",
      description:
        "Vietnam flash report will include total market sales, EV sales, and application split.",
    },
    {
      name: "Germany",
      code: "de",
      slug: "germany",
      description:
        "Germany flash report will include total market sales, EV sales, and application split.",
    },
    {
      name: "Australia",
      code: "au",
      slug: "australia",
      description:
        "Australia flash report will include total market sales, EV sales, and application split.",
    },
    {
      name: "Chile",
      code: "cl",
      slug: "chile",
      description:
        "Chile flash report will include total market sales, EV sales, and application split.",
    },
    {
      name: "Sweden",
      code: "se",
      slug: "sweden",
      description:
        "Sweden flash report will include total market sales, EV sales, and application split.",
    },
    {
      name: "Peru",
      code: "pe",
      slug: "peru",
      description:
        "Peru flash report will include total market sales, EV sales, and application split.",
    },
    {
      name: "Colombia",
      code: "co",
      slug: "colombia",
      description:
        "Colombia flash report will include total market sales, EV sales, and application split.",
    },
    {
      name: "Russia",
      code: "ru",
      slug: "russia",
      description:
        "Russia flash report will include total market sales, EV sales, and application split.",
    },
    {
      name: "Belgium",
      code: "be",
      slug: "belgium",
      description:
        "Belgium flash report will include total market sales, EV sales, and application split.",
    },
  ],
  [],
);

  const regions: RegionItem[] = useMemo(
    () => [
      {
        name: "Asia",
        icon: "🌏",
        description: "Asia markets covered in forecast.",
      },
      {
        name: "Europe",
        icon: "🇪🇺",
        description: "Europe markets covered in forecast.",
      },
      {
        name: "Americas",
        icon: "🌎",
        description: "North and South American markets covered in forecast.",
      },
      {
        name: "Africa",
        icon: "🌍",
        description: "African markets covered in forecast.",
      },
      {
        name: "Oceania",
        icon: "🦘",
        description: "Oceania markets covered in forecast.",
      },
    ],
    [],
  );

  const flashBullets = useMemo(
    () => [
      "Select Country + Month to load country-wise flash report data.",
      // "Compare MoM/YoY trends across segments and categories.",
      "Open category cards to drill into 2W / 3W / PV / CV / TRAC / CE.",
    ],
    [],
  );

  const forecastBullets = useMemo(
    () => [
      "Choose a segment and time range for forecasting.",
      "Compare actual vs forecast and review assumptions (AI/linear/BYOF/survey).",
      "Use scenario adjustments to tune inputs and validate outputs.",
      "Review confidence / risk indicators for better decisions.",
      "Cross-check forecasts against historical trend and seasonality.",
      "Export forecast view or share insights after finalizing.",
    ],
    [],
  );

  return (
    <>
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/98 to-slate-950" />
        </div>

        <div className="mx-auto max-w-none w-[95vw] px-2 pt-10 sm:px-3 md:pt-12 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
          <div className="grid grid-cols-1 items-stretch gap-6 pb-10 md:grid-cols-2">
            <div className="flex h-full flex-col space-y-3">
              <h3 className="text-xl font-bold tracking-tight text-white/95 md:text-2xl">
                Flash Reports
              </h3>

              <FlipInfoCard
                ariaLabel="Flash Reports info card"
                bullets={flashBullets}
                ctaHref="/flash-reports/overview"
                ctaLabel="Open Flash Reports"
                enableReadMore
                videoUrl="https://youtu.be/BBcHKQH90xo?si=o4T0_udCkwy-D9Hu"
                backTitle="Flash Report Quick Walkthrough"
                backSubtitle="Quick steps and video guide for flash reports"
                extraFront={
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs font-medium text-white/75">
                      Primary countries (launching)
                    </div>

                    <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-3 md:grid-cols-3">
                      {countries.map((c) => (
                        <CountryBadge
                          key={c.name}
                          country={c}
                          onClick={setActiveCountry}
                        />
                      ))}
                    </div>

                    <div className="mt-2 text-[11px] text-white/55">
                      Tap a country to preview what’s coming.
                    </div>
                  </div>
                }
              />
            </div>

            <div className="flex h-full flex-col space-y-3">
              <h3 className="text-xl font-bold tracking-tight text-white/95 md:text-2xl">
                Forecast
              </h3>

              <FlipInfoCard
                ariaLabel="Forecast info card"
                bullets={forecastBullets}
                ctaHref="/forecast/overview"
                ctaLabel="Open Forecast"
                enableReadMore
                videoUrl="https://youtu.be/06PIm3mTGcE?si=5QhUnDEAy6-ZIp72"
                backTitle="Forecast Quick Walkthrough"
                backSubtitle="Quick steps and video guide for forecast"
                extraFront={
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs font-medium text-white/75">
                      Forecast regions covered
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-3">
                      {regions.map((r) => (
                        <RegionBadge key={r.name} region={r} />
                      ))}
                    </div>
                  </div>
                }
              />
            </div>
          </div>

          <div className="mt-14">
            <h3 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              What you get in one place
            </h3>
            <p className="mt-2 max-w-3xl text-white/70">
              Designed for fast monthly review: data, splits, trend checks, and
              forecast validation.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {VALUE_PROPS.map((v) => {
                const Icon = v.icon;
                return (
                  <div
                    key={v.title}
                    className="rounded-2xl border border-white/10 bg-[#0b141f]/65 p-6 shadow-[0_12px_40px_rgba(0,0,0,.45)]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                        <Icon className="h-5 w-5 text-white/80" />
                      </span>
                      <div>
                        <div className="text-lg font-semibold text-white/90">
                          {v.title}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-white/70">
                          {v.body}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-14">
            <h3 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              How it works
            </h3>
            <p className="mt-2 max-w-3xl text-white/70">
              A simple workflow to keep the month-to-month review consistent.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {HOW_IT_WORKS.map((s) => (
                <div
                  key={s.step}
                  className="rounded-2xl border border-white/10 bg-[#0b141f]/65 p-6 shadow-[0_12px_40px_rgba(0,0,0,.45)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-white/60">
                      STEP {s.step}
                    </div>
                    <ArrowRight className="h-4 w-4 text-white/30" />
                  </div>
                  <div className="mt-3 text-lg font-semibold text-white/90">
                    {s.title}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 pb-16">
            <div className="rounded-3xl border border-white/10 bg-[#0b141f]/70 p-6 shadow-[0_18px_60px_rgba(0,0,0,.55)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-2xl font-extrabold tracking-tight">
                    Ready to explore markets?
                  </h3>
                  <p className="mt-2 max-w-2xl text-white/70">
                    Start with Flash Reports to see the latest month, then
                    validate direction in Forecast.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <a
                    href="/flash-reports/overview"
                    className="inline-flex items-center justify-center rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/15"
                  >
                    Open Flash Reports
                  </a>
                  <a
                    href="/forecast/overview"
                    className="inline-flex items-center justify-center rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/15"
                  >
                    Open Forecast
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CountryModal
        country={activeCountry}
        onClose={() => setActiveCountry(null)}
      />
    </>
  );
}