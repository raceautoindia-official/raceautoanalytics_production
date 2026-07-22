import type { Metadata } from "next";
import Link from "next/link";
import { listFlashReportCountryDatasets } from "@/lib/flashReportCountryDataset";
import {
  groupCountriesByRegion,
  resolveCountryMeta,
} from "@/lib/flashReportRegistry";
import { CountryFlag } from "@/components/ui/CountryFlag";

export const metadata: Metadata = {
  title: "Country Flash Report Data Coverage",
  description:
    "Explore country-wise flash report data coverage across automotive segments, OEM market share, EV trends, and application splits.",
  alternates: {
    canonical: "/flash-reports/country-data",
  },
  openGraph: {
    title: "Country Flash Report Data Coverage",
    description:
      "Explore country-wise flash report data coverage across automotive segments, OEM market share, EV trends, and application splits.",
    url: "https://raceautoanalytics.com/flash-reports/country-data",
    type: "website",
  },
};

// Accent palette drawn from the RACE emblem (blue · green · amber · red ·
// violet), cycled per region so the page reads as one colourful system.
const REGION_ACCENTS = [
  { dot: "bg-sky-400", text: "text-sky-300", glow: "hover:border-sky-400/60 hover:shadow-sky-500/20", chip: "bg-sky-500/15 text-sky-200" },
  { dot: "bg-emerald-400", text: "text-emerald-300", glow: "hover:border-emerald-400/60 hover:shadow-emerald-500/20", chip: "bg-emerald-500/15 text-emerald-200" },
  { dot: "bg-amber-400", text: "text-amber-300", glow: "hover:border-amber-400/60 hover:shadow-amber-500/20", chip: "bg-amber-500/15 text-amber-200" },
  { dot: "bg-rose-400", text: "text-rose-300", glow: "hover:border-rose-400/60 hover:shadow-rose-500/20", chip: "bg-rose-500/15 text-rose-200" },
  { dot: "bg-violet-400", text: "text-violet-300", glow: "hover:border-violet-400/60 hover:shadow-violet-500/20", chip: "bg-violet-500/15 text-violet-200" },
];

export default function CountryDataIndexPage() {
  const countries = listFlashReportCountryDatasets();
  const regionGroups = groupCountriesByRegion(countries);
  const totalMarkets = countries.length;

  return (
    <section className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-[95vw] max-w-none px-2 pb-20 pt-14 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b141f]/80 shadow-[0_18px_60px_rgba(0,0,0,.55)]">
          {/* Logo-colour ribbon */}
          <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-amber-400 via-emerald-400 to-sky-500" />
          {/* Colour wash */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.10]"
            style={{
              background:
                "radial-gradient(60% 90% at 12% 0%, #38bdf8 0%, transparent 55%), radial-gradient(55% 90% at 88% 10%, #f59e0b 0%, transparent 55%), radial-gradient(50% 80% at 50% 100%, #22c55e 0%, transparent 60%)",
            }}
          />
          <div className="relative p-6 md:p-9">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {totalMarkets} markets covered
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl">
              Country Flash Report{" "}
              <span className="bg-gradient-to-r from-sky-400 via-emerald-300 to-amber-300 bg-clip-text text-transparent">
                Data Coverage
              </span>
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-white/75 md:text-base">
              Browse country-specific flash report data availability. Each page
              outlines segment coverage, OEM market share visibility, and EV or
              application-level insights where available.
            </p>
          </div>
        </div>

        {/* Region groups */}
        <div className="mt-8 space-y-9">
          {regionGroups.map((group, gi) => {
            const accent = REGION_ACCENTS[gi % REGION_ACCENTS.length];
            return (
              <div key={group.key} id={group.key} className="scroll-mt-24">
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${accent.dot}`} />
                  <h2
                    className={`text-xs font-bold uppercase tracking-[0.18em] ${accent.text}`}
                  >
                    {group.label}
                  </h2>
                  <span className="text-xs font-medium text-white/40">
                    {group.items.length}
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((country) => {
                    const iso2 = resolveCountryMeta(country.slug)?.iso2 ?? null;
                    return (
                      <Link
                        key={country.slug}
                        href={`/flash-reports/country-data/${country.slug}`}
                        className={`group flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3.5 shadow-lg shadow-black/20 transition-all duration-200 hover:-translate-y-0.5 ${accent.glow}`}
                      >
                        <CountryFlag
                          iso2={iso2}
                          name={country.name}
                          className="h-6 w-9 shrink-0 rounded-[3px] object-cover ring-1 ring-white/15"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-white/95">
                            {country.name}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${accent.chip}`}
                            >
                              {country.modules.length} modules
                            </span>
                            <span className="text-[11px] text-white/45">
                              Data coverage
                            </span>
                          </div>
                        </div>
                        <span
                          className="text-white/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white/80"
                          aria-hidden
                        >
                          →
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
