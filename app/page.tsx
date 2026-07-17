// app/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/app/components/Footer";
import QuickGuidesSection from "./components/QuickGuidesSection";
import NavBar from "./components/Navbar";
import PricingTeaser from "@/app/components/PricingTeaser";
import { groupByRegion, LIVE_FLASH_COUNTRIES } from "@/lib/flashReportRegistry";
import InsightsHighlights from "@/app/components/InsightsHighlights";

// ISR: the homepage now pulls the latest published insights (InsightsHighlights).
// Regenerate every 10 min so new posts surface without a rebuild.
export const revalidate = 600;

export const metadata: Metadata = {
  title: "Automotive Sales Forecast | Race Auto Analytics",
  description:
    "Automotive sales forecast and flash report platform for country-wise vehicle data, OEM share, EV trends and segment market intelligence.",
  alternates: {
    canonical: "/",
  },
  keywords: [
    "automotive sales forecast",
    "automotive market analytics",
    "flash reports",
    "OEM market share",
    "EV sales insights",
    "vehicle segment analysis",
    "country wise flash reports",
    "automotive market intelligence platform",
  ],
  openGraph: {
    title: "Automotive Sales Forecast | Race Auto Analytics",
    description:
      "Forecast vehicle sales, track OEM market share, and monitor EV adoption with country-wise automotive flash reports.",
    url: "https://raceautoanalytics.com/",
    type: "website",
    siteName: "Race Auto Analytics",
    images: [
      {
        url: "/images/logo.webp",
        width: 1200,
        height: 630,
        alt: "Race Auto Analytics automotive market analytics platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Automotive Sales Forecast | Race Auto Analytics",
    description:
      "Forecast vehicle sales, track OEM market share, and monitor EV adoption with country-wise automotive flash reports.",
    images: ["/images/logo.webp"],
  },
};

export default function Page() {
  const faqItems = [
    {
      question: "What does Race Auto Analytics provide?",
      answer:
        "Race Auto Analytics provides automotive sales forecast tools, monthly flash reports, country-wise vehicle sales data, OEM share tracking, EV penetration views, and segment-level market intelligence.",
    },
    {
      question: "Which automotive segments are covered?",
      answer:
        "Coverage includes passenger vehicles, commercial vehicles, trucks, buses, two-wheelers, three-wheelers, tractors, construction equipment, EV trends, and application-level splits where available.",
    },
    {
      question: "How are forecasts built?",
      answer:
        "Forecast views combine AI and machine learning baselines, survey outlooks, analyst assumptions, and Build Your Forecast scoring so planning teams can compare more than one demand signal.",
    },
  ];

  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Race Auto Analytics",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Automotive market analytics and forecasting platform with segment-wise volumes, AI forecasts, and country-wise flash reports.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Request demo / trial available",
    },
    url: "https://raceautoanalytics.com/",
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Race Auto Analytics",
    alternateName: ["RACE Analytics", "Race Auto India Analytics"],
    url: "https://raceautoanalytics.com/",
    logo: "https://raceautoanalytics.com/images/logo.webp",
    description:
      "Race Auto Analytics is an automotive market intelligence platform for vehicle sales forecasting, flash reports, OEM market share, EV adoption, and segment-level analytics.",
    sameAs: [
      "https://www.facebook.com/raceautoindia/",
      "https://x.com/raceautoindia",
      "https://www.instagram.com/race.auto.india/",
      "https://www.linkedin.com/company/race-auto-india/",
      "https://www.youtube.com/@RaceAutoIndia",
    ],
    knowsAbout: [
      "Automotive sales forecasting",
      "Vehicle market analytics",
      "OEM market share",
      "Electric vehicle sales trends",
      "Country-wise automotive flash reports",
      "Commercial vehicle analytics",
      "Passenger vehicle analytics",
      "Two-wheeler and three-wheeler market data",
    ],
  };

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Race Auto Analytics | Automotive Sales Forecast & Flash Reports",
    url: "https://raceautoanalytics.com/",
    description:
      "Automotive sales forecasting and country-wise flash reports for OEM market share, EV trends, and vehicle segment analysis.",
    about: [
      { "@type": "Thing", name: "Automotive sales forecast" },
      { "@type": "Thing", name: "Automotive market analytics" },
      { "@type": "Thing", name: "OEM market share" },
      { "@type": "Thing", name: "EV sales insights" },
      { "@type": "Thing", name: "Country-wise flash reports" },
    ],
    isPartOf: {
      "@type": "WebSite",
      name: "Race Auto Analytics",
      url: "https://raceautoanalytics.com/",
    },
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Race Auto Analytics",
    url: "https://raceautoanalytics.com/",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://raceautoanalytics.com/flash-reports?country={country}",
      "query-input": "required name=country",
    },
  };

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Automotive Sales Forecast and Flash Report Platform",
    provider: {
      "@type": "Organization",
      name: "Race Auto Analytics",
      url: "https://raceautoanalytics.com/",
    },
    serviceType: "Automotive market intelligence",
    areaServed: "Global",
    description:
      "AI-powered automotive sales forecast and flash report platform covering country markets, OEM share, EV penetration, vehicle segments, and six-month demand outlooks.",
  };

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Race Auto Analytics",
    image: "https://raceautoanalytics.com/images/logo.webp",
    url: "https://raceautoanalytics.com/",
    telephone: "+91 8072098352",
    email: "info@raceautoanalytics.com",
    address: {
      "@type": "PostalAddress",
      addressCountry: "IN",
      addressRegion: "Tamil Nadu",
    },
    parentOrganization: {
      "@type": "Organization",
      name: "Race Innovations Pvt Ltd Co.",
      url: "https://raceinnovations.in/",
    },
    description:
      "Automotive market intelligence and vehicle sales forecast platform for OEM, dealer, EV, and mobility planning teams.",
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

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Race Auto Analytics",
        item: "https://raceautoanalytics.com/",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <NavBar />
      <main>
      {/* <BannerHome /> */}
        <QuickGuidesSection
          intro={
          <>
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              Race Auto Analytics for Automotive Sales Forecasting
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/75 md:text-base">
              Country-wise flash reports, OEM market share insights, EV trends,
              and segment-level forecasting for automotive and mobility teams.
            </p>
          </>
          }
        />
        <HomeSeoContent faqItems={faqItems} />
        <InsightsHighlights />
        {/* Audit I-2: pricing teaser so first-time visitors see a price range
            on the homepage without having to click into /subscription. */}
        <PricingTeaser />

        {/* <MarketKPIGridDark />
        <VehicleCategorySalesCard /> */}
        {/* <IndustryCategories /> * */}
        {/* <OEMLeaderboardAndSegmentsEqualized />  */}
        {/* <ForecastPreview /> */}
        {/* <KeyMarketInsights /> */}
      </main>

      <Footer />
    </>
  );
}

function HomeSeoContent({
  faqItems,
}: {
  faqItems: Array<{ question: string; answer: string }>;
}) {
  // Region coverage is derived from the country registry, so it scales as new
  // markets are added without editing the homepage.
  const regionCoverage = groupByRegion(LIVE_FLASH_COUNTRIES);

  const segments = [
    "Passenger vehicles",
    "Commercial vehicles",
    "Two-wheelers",
    "Three-wheelers",
    "Trucks and buses",
    "Tractors and construction equipment",
  ];

  return (
    <section className="bg-slate-950 pb-10 pt-0 text-white md:pb-12">
      <div className="mx-auto w-[95vw] max-w-none px-2 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,.45)] lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">
              Automotive sales forecast platform
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight md:text-3xl">
              Forecast, flash reports, and market intelligence in one workflow
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/75 md:text-base">
              Race Auto Analytics helps automotive teams monitor monthly
              vehicle sales data, compare OEM market share, track EV
              penetration, and build a six-month automotive sales forecast for
              country markets. The public flash report and forecast pages are
              designed for product discovery, while the subscribed application
              keeps deeper dashboards, filters, and score-card workflows behind
              the operational product experience.
            </p>
            <p className="mt-4 text-sm leading-7 text-white/75 md:text-base">
              The platform supports OEM planning, dealer planning, inventory
              review, export-import checks, pricing discussions, EV strategy,
              and competitive benchmarking. Teams can start with monthly
              automotive flash reports, then use AI/ML forecasts, survey
              outlooks, analyst assumptions, and Build Your Forecast scoring to
              validate demand direction before internal planning meetings.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/forecast/overview"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Automotive sales forecast
              </Link>
              <Link
                href="/flash-reports/overview"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
              >
                Automotive flash reports
              </Link>
              <Link
                href="/insights"
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(79,103,255,0.28)] transition hover:from-indigo-400 hover:to-blue-400"
              >
                Market insights →
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,.45)]">
            <h2 className="text-xl font-bold tracking-tight">
              Regional coverage
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Country flash reports span markets across every major region. Open
              a region to browse its country-level automotive sales data pages.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2">
              {regionCoverage.map((region) => (
                <Link
                  key={region.key}
                  href={`/flash-reports/country-data#${region.key}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 transition hover:bg-white/10"
                >
                  <span>{region.label}</span>
                  <span className="text-xs text-white/50">
                    {region.countries.length}{" "}
                    {region.countries.length === 1 ? "market" : "markets"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,.45)]">
            <h2 className="text-xl font-bold tracking-tight">
              Segment coverage
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {segments.map((segment) => (
                <div
                  key={segment}
                  className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white/80"
                >
                  {segment}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,.45)]">
            <h2 className="text-xl font-bold tracking-tight">
              Methodology signals
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/75">
              Forecast pages explain the six-month rolling outlook, AI and ML
              baselines, survey-led market sentiment, analyst assumptions, and
              BYF scoring. Flash reports explain the monthly release cycle,
              segment coverage, OEM share views, EV trend checks, and country
              summary pages for search visitors.
            </p>
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
