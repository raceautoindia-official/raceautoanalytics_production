// app/flash-reports/overview/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import VehicleCategorySalesCard from "@/app/components/VehicleCategorySalesCard";
import IndustryCategories from "@/app/components/IndustryCategories";
import KeyMarketInsights from "@/app/components/KeyMarketInsights";
import Footer from "@/app/components/Footer";
import MarketHeroSection from "@/app/components/MarketHeroSection";
import ExploreVehicleCategories from "@/app/components/ExploreVehicleCategories";
import BYFSubmitCards from "./components/BYFSubmitCards";
import { FLASH_REPORT_COUNTRY_DATASETS } from "@/lib/flashReportCountryDataset";
import { SITE_URL } from "@/lib/seoRoutes";

export const metadata: Metadata = {
  title:
    "Automotive Flash Reports by Country | Vehicle Sales, OEM Share & EV Trends",
  description:
    "Monthly automotive flash reports covering passenger vehicles, CVs, trucks, buses, two-wheelers, three-wheelers, tractors, EV trends, OEM share and country sales insights.",
  alternates: { canonical: "/flash-reports/overview" },
  robots: { index: true, follow: true },
  openGraph: {
    title:
      "Automotive Flash Reports by Country | Vehicle Sales, OEM Share & EV Trends",
    description:
      "Monthly automotive flash reports covering vehicle sales, OEM share, EV trends and country sales insights.",
    url: `${SITE_URL}/flash-reports/overview`,
    type: "website",
  },
};

export default function Page() {
  const countries = Object.values(FLASH_REPORT_COUNTRY_DATASETS).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const faqItems = [
    {
      question: "What is an automotive flash report?",
      answer:
        "An automotive flash report is a monthly market summary that highlights vehicle sales movement, OEM share, segment performance, EV trends, and early demand signals for a country or vehicle category.",
    },
    {
      question: "What data is covered in RACE flash reports?",
      answer:
        "Coverage includes passenger vehicles, commercial vehicles, two-wheelers, three-wheelers, tractors, trucks, buses, construction equipment, OEM market share, EV penetration, and application splits where available.",
    },
    {
      question: "How is a flash report different from a forecast?",
      answer:
        "Flash reports summarize the latest published market data. Forecast tools use historical trends, AI/ML methods, survey signals, analyst assumptions, and BYF scoring to project the next six months.",
    },
  ];

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Automotive Flash Reports by Country",
    url: `${SITE_URL}/flash-reports/overview`,
    description:
      "Monthly automotive flash report hub for country-wise vehicle sales data, OEM share, EV trends, and segment-level market insights.",
    hasPart: countries.map((country) => ({
      "@type": "WebPage",
      name: `${country.name} automotive flash report`,
      url: `${SITE_URL}/flash-reports/country-data/${country.slug}`,
    })),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <MarketHeroSection />
      <FlashReportSeoContent countries={countries} faqItems={faqItems} />
      <BYFSubmitCards />
      <VehicleCategorySalesCard />
      <IndustryCategories />
      <KeyMarketInsights />
      <ExploreVehicleCategories />
      <Footer />
    </>
  );
}

function FlashReportSeoContent({
  countries,
  faqItems,
}: {
  countries: Array<{ slug: string; name: string; modules: string[] }>;
  faqItems: Array<{ question: string; answer: string }>;
}) {
  const segments = [
    [
      "Passenger vehicles",
      "Monthly sales, OEM share, EV trend and application views where available.",
    ],
    [
      "Commercial vehicles",
      "CV totals, OEM performance and country-level demand movement.",
    ],
    [
      "Two-wheelers and three-wheelers",
      "Urban mobility, EV adoption and OEM share checks for covered countries.",
    ],
    [
      "Trucks and buses",
      "Freight and passenger transport demand indicators with segment-level visibility.",
    ],
    [
      "Tractors",
      "Agriculture-linked demand movement and OEM share visibility where available.",
    ],
    [
      "Construction equipment",
      "Industrial equipment coverage for markets where the module is available.",
    ],
  ];

  return (
    <section className="bg-slate-950 pb-10 pt-0 text-white md:pb-12">
      <div className="mx-auto w-[95vw] max-w-none px-2 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
        <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,.45)] md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">
            Monthly automotive flash reports
          </p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight md:text-3xl">
            Vehicle sales data by country, segment, OEM share, and EV trend
          </h2>
          <p className="mt-4 max-w-5xl text-sm leading-7 text-white/75 md:text-base">
            Race Auto Analytics flash reports are built for teams that need a
            fast monthly read on vehicle sales data by country. The overview
            connects market summaries, country data pages, vehicle segment
            coverage, OEM market share tracking, EV penetration checks, and
            application-level views where data is available. Each public country
            page gives a search-friendly summary, while subscribed users can
            open the full dataset and interactive dashboard views.
          </p>
          <p className="mt-4 max-w-5xl text-sm leading-7 text-white/75 md:text-base">
            The latest available report month is refreshed through the flash
            report data workflow. Public copy stays readable in the initial
            HTML, and charts hydrate after load so crawlers do not receive empty
            loading states as the main page content.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/forecast/overview"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              6-month automotive sales forecast
            </Link>
            <Link
              href="/subscription"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Subscribe for full data
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,.45)] lg:col-span-2">
            <h2 className="text-xl font-bold tracking-tight">
              Country flash report coverage
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Each country page summarizes market scope, available modules,
              segment visibility, release rhythm, and links back to the global
              automotive flash reports hub.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {countries.map((country) => (
                <Link
                  key={country.slug}
                  href={`/flash-reports/country-data/${country.slug}`}
                  className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white/85 transition hover:bg-white/10"
                >
                  {country.name} automotive flash report
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,.45)]">
            <h2 className="text-xl font-bold tracking-tight">Sample output</h2>
            <p className="mt-3 text-sm leading-7 text-white/75">
              A typical flash report view includes the latest monthly sales
              movement, segment comparison, OEM share summary, EV or alternative
              fuel signal, and analyst-ready notes for internal reporting.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,.45)]">
          <h2 className="text-xl font-bold tracking-tight">
            Segment coverage table
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {segments.map(([title, body]) => (
              <div
                key={title}
                className="rounded-xl border border-white/10 bg-slate-900/60 p-4"
              >
                <h3 className="text-sm font-semibold text-white/95">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/70">{body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,.45)]">
          <h2 className="text-xl font-bold tracking-tight">FAQ</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {faqItems.map((item) => (
              <div key={item.question}>
                <h3 className="text-sm font-semibold text-white/95">
                  {item.question}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
