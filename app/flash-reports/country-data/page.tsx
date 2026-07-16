import type { Metadata } from "next";
import Link from "next/link";
import { FLASH_REPORT_COUNTRY_DATASETS } from "@/lib/flashReportCountryDataset";
import { groupCountriesByRegion } from "@/lib/flashReportRegistry";

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

export default function CountryDataIndexPage() {
  const countries = Object.values(FLASH_REPORT_COUNTRY_DATASETS);
  const regionGroups = groupCountriesByRegion(countries);

  return (
    <>
      <section className="bg-slate-950 text-white">
        <div className="mx-auto w-[95vw] max-w-none px-2 pb-16 pt-14 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
          <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 shadow-[0_18px_60px_rgba(0,0,0,.55)] md:p-8">
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              Country Flash Report Data Coverage
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-white/80 md:text-base">
              Browse country-specific flash report data availability. Each page
              outlines segment coverage, OEM market share visibility, and EV or
              application-level insights where available.
            </p>

            <div className="mt-7 space-y-6">
              {regionGroups.map((group) => (
                <div key={group.key} id={group.key} className="scroll-mt-24">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/70">
                    {group.label}
                  </h2>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.items.map((country) => (
                      <Link
                        key={country.slug}
                        href={`/flash-reports/country-data/${country.slug}`}
                        className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm font-medium text-white/90 transition hover:bg-slate-800/80 hover:text-white"
                      >
                        {country.name} Data Coverage
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

