import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Footer from "@/app/components/Footer";
import CountryPageActions from "./CountryPageActions";
import {
  FLASH_REPORT_COUNTRY_DATASETS,
  getFlashReportCountryDataset,
} from "@/lib/flashReportCountryDataset";

type PageProps = {
  params: {
    country: string;
  };
};

const siteBase = "https://raceautoanalytics.com";

export function generateStaticParams() {
  return Object.keys(FLASH_REPORT_COUNTRY_DATASETS).map((country) => ({
    country,
  }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const dataset = getFlashReportCountryDataset(params.country);

  if (!dataset) {
    return {
      title: "Country Flash Report Data Not Found",
      description: "This country data page is not available.",
      robots: { index: false, follow: false },
    };
  }

  const title = `${dataset.name} Flash Report Data Coverage | RaceAutoAnalytics`;
  const description = `${dataset.name} flash report data coverage includes total market sales, EV sales, and application split insights where available, plus segment and OEM-level automotive forecasts.`;
  const canonical = `/flash-reports/country-data/${dataset.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    keywords: [
      `${dataset.name} automotive market data`,
      `${dataset.name} flash report`,
      `${dataset.name} vehicle sales forecast`,
      `${dataset.name} EV sales trends`,
      `${dataset.name} OEM market share`,
      "automotive analytics",
      "country-level market intelligence",
    ],
    openGraph: {
      title,
      description,
      url: `${siteBase}${canonical}`,
      type: "article",
      siteName: "Race Auto Analytics",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function CountryDataPage({ params }: PageProps) {
  const dataset = getFlashReportCountryDataset(params.country);
  if (!dataset) notFound();

  return (
    <>
      <section className="bg-slate-950 text-white">
        <div className="mx-auto w-[95vw] max-w-none px-2 pb-16 pt-14 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
          <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 shadow-[0_18px_60px_rgba(0,0,0,.55)] md:p-8">
            <CountryPageActions
              countrySlug={dataset.slug}
              countryName={dataset.name}
            />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">
              Country Flash Report Data
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              {dataset.name} Flash Report Data Coverage
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-white/80 md:text-base">
              {dataset.name} flash report will include total market sales, EV
              sales, and application split views where available. This country
              page summarizes all currently available modules so teams can plan
              monthly automotive market analysis with confidence.
            </p>

            <p className="mt-4 max-w-4xl text-sm leading-7 text-white/75 md:text-base">
              The {dataset.name} flash report dataset supports structured
              decision-making across vehicle segments, OEM performance tracking,
              and demand direction monitoring. Coverage includes the modules
              listed below.
            </p>

            <div className="mt-7 rounded-xl border border-white/10 bg-white/5 p-4 md:p-5">
              <h2 className="text-lg font-semibold text-white/95">
                Available Data Modules For {dataset.name}
              </h2>
              <ul className="mt-4 grid grid-cols-1 gap-2 text-sm text-white/85 md:grid-cols-2">
                {dataset.modules.map((moduleName) => (
                  <li
                    key={moduleName}
                    className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2"
                  >
                    {moduleName}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
