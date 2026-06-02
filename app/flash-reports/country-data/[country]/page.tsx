import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/app/components/Footer";
import CountryPageActions from "./CountryPageActions";
import {
  FLASH_REPORT_COUNTRY_DATASETS,
  getFlashReportCountryDataset,
} from "@/lib/flashReportCountryDataset";
import { SITE_URL } from "@/lib/seoRoutes";

type PageProps = {
  params: {
    country: string;
  };
};

type CountrySeoProfile = {
  region: string;
  releaseDay: string;
  marketContext: string;
  segmentContext: string;
  evContext: string;
  oemContext: string;
};

const COUNTRY_SEO_PROFILES: Record<string, CountrySeoProfile> = {
  india: {
    region: "Asia",
    releaseDay: "3rd day of the monthly release cycle",
    marketContext:
      "India is a high-volume, multi-segment vehicle market where two-wheelers, passenger vehicles, commercial vehicles, tractors, buses, trucks, and construction equipment are all relevant to monthly planning.",
    segmentContext:
      "The India page is useful for broad portfolio reviews because it carries the deepest module coverage in the flash report country set.",
    evContext:
      "EV and alternative fuel signals are especially important in India because policy, urban mobility, and OEM launch activity can shift the demand mix quickly.",
    oemContext:
      "OEM share views help teams compare leaders and challengers across passenger vehicles, two-wheelers, three-wheelers, CVs, trucks, buses, tractors, and construction equipment.",
  },
  brazil: {
    region: "South America",
    releaseDay: "5th day of the monthly release cycle",
    marketContext:
      "Brazil is a major Latin American vehicle market where passenger vehicles, commercial vehicles, trucks, buses, tractors, and two-wheelers are important for regional planning.",
    segmentContext:
      "Coverage supports teams that track road transport, agriculture-linked demand, and passenger mobility in one country view.",
    evContext:
      "Alternative fuel and electrification trends can be reviewed beside core sales movement where the published module supports those views.",
    oemContext:
      "OEM share modules help compare competitive movement across passenger vehicles, commercial vehicles, trucks, buses, and tractors.",
  },
  "south-africa": {
    region: "Africa",
    releaseDay: "6th day of the monthly release cycle",
    marketContext:
      "South Africa is an important African market for passenger vehicles, commercial vehicles, trucks, buses, and agricultural tractor demand.",
    segmentContext:
      "The page helps planning teams review mobility and freight-linked vehicle demand with clear country-level module coverage.",
    evContext:
      "EV trend visibility is handled where available, while the core page emphasizes monthly sales movement and segment coverage.",
    oemContext:
      "OEM share views are useful for benchmarking passenger vehicle, CV, truck, bus, and tractor performance in a concentrated market.",
  },
  japan: {
    region: "Asia",
    releaseDay: "7th day of the monthly release cycle",
    marketContext:
      "Japan is a mature automotive market where passenger vehicle, commercial vehicle, truck, bus, and two-wheeler movement can influence regional benchmark discussions.",
    segmentContext:
      "Coverage is suited for teams comparing mature-market demand stability, OEM performance, and transport segment movement.",
    evContext:
      "Passenger vehicle EV share is a relevant signal in Japan because powertrain transition, hybrid adoption, and model activity shape market interpretation.",
    oemContext:
      "OEM share modules help analysts compare brand performance across passenger vehicles, CVs, trucks, and buses.",
  },
  sweden: {
    region: "Europe",
    releaseDay: "8th day of the monthly release cycle",
    marketContext:
      "Sweden is a European market where passenger vehicles, commercial vehicles, trucks, buses, tractors, and two-wheelers can be reviewed together.",
    segmentContext:
      "The page supports market teams that want a compact view of vehicle demand, application splits, and segment movement.",
    evContext:
      "EV and powertrain transition signals are especially relevant for Sweden because the market is often used as a European electrification reference.",
    oemContext:
      "OEM share views help compare passenger vehicle, CV, truck, bus, and tractor activity across a smaller but strategically watched market.",
  },
  vietnam: {
    region: "Asia",
    releaseDay: "9th day of the monthly release cycle",
    marketContext:
      "Vietnam is a growing Asian vehicle market where passenger vehicles, commercial vehicles, trucks, and buses are important for capacity and network planning.",
    segmentContext:
      "Coverage helps teams monitor developing-market demand movement without mixing the country view into broader regional assumptions.",
    evContext:
      "EV signals are reviewed where available, while the current public summary focuses on sales forecast, OEM share, and core segment visibility.",
    oemContext:
      "OEM share modules help compare market participation across passenger vehicles, CVs, trucks, and buses.",
  },
  chile: {
    region: "South America",
    releaseDay: "10th day of the monthly release cycle",
    marketContext:
      "Chile is a South American market where passenger vehicles, commercial vehicles, trucks, and buses are useful for import, fleet, and dealer planning.",
    segmentContext:
      "The country view supports teams that need a clear read on transport and passenger mobility demand without overloading the page with dashboard controls.",
    evContext:
      "EV or alternative fuel signals can be added to the market read where the flash report dataset exposes them.",
    oemContext:
      "OEM share coverage helps teams monitor competitive positioning in passenger vehicle, CV, truck, and bus categories.",
  },
  pakistan: {
    region: "Asia",
    releaseDay: "11th day of the monthly release cycle",
    marketContext:
      "Pakistan combines two-wheeler, three-wheeler, passenger vehicle, commercial vehicle, truck, bus, and tractor demand in a market where affordability and utility segments matter.",
    segmentContext:
      "The page is useful for teams reviewing mobility, agriculture, and commercial transport signals in one monthly summary.",
    evContext:
      "EV visibility is handled where data is available, while the core country page emphasizes sales forecast and OEM share by segment.",
    oemContext:
      "OEM share modules help compare performance across two-wheelers, three-wheelers, passenger vehicles, CVs, trucks, buses, and tractors.",
  },
  colombia: {
    region: "South America",
    releaseDay: "12th day of the monthly release cycle",
    marketContext:
      "Colombia is a Latin American market where two-wheelers, passenger vehicles, commercial vehicles, trucks, and buses can be reviewed for mobility and transport planning.",
    segmentContext:
      "Coverage supports market-entry, dealer, and competitive planning teams that need monthly country-level visibility.",
    evContext:
      "EV trend context can be reviewed where available, with the public page focused on vehicle sales, OEM share, and segment performance.",
    oemContext:
      "OEM share modules help teams track competitive movement across two-wheelers, passenger vehicles, CVs, trucks, and buses.",
  },
  australia: {
    region: "Oceania",
    releaseDay: "13th day of the monthly release cycle",
    marketContext:
      "Australia is an important right-hand-drive market where passenger vehicles, commercial vehicles, trucks, and buses are watched for fleet and retail planning.",
    segmentContext:
      "The country page helps teams compare passenger and transport demand in a market with distinct model mix and geography-driven needs.",
    evContext:
      "EV and powertrain trend context can be added where available, especially for passenger vehicle planning and policy review.",
    oemContext:
      "OEM share modules help compare competitive movement across passenger vehicles, CVs, trucks, and buses.",
  },
  germany: {
    region: "Europe",
    releaseDay: "14th day of the monthly release cycle",
    marketContext:
      "Germany is a core European automotive market where two-wheelers, passenger vehicles, commercial vehicles, trucks, buses, and tractors can be benchmarked.",
    segmentContext:
      "Coverage supports teams that review mature-market demand, fleet activity, premium and mass-market shifts, and commercial transport movement.",
    evContext:
      "EV and powertrain transition signals are important in Germany because electrification strategy, policy, and OEM launches shape the market mix.",
    oemContext:
      "OEM share modules help compare brand movement across passenger vehicles, CVs, trucks, buses, tractors, and two-wheelers.",
  },
  peru: {
    region: "South America",
    releaseDay: "15th day of the monthly release cycle",
    marketContext:
      "Peru is a South American market where two-wheelers, three-wheelers, passenger vehicles, commercial vehicles, trucks, and buses are useful for mobility and logistics planning.",
    segmentContext:
      "The page supports teams tracking both urban mobility and commercial transport categories in one country summary.",
    evContext:
      "EV or alternative fuel coverage is included where available, while the main focus remains monthly sales movement and OEM share by segment.",
    oemContext:
      "OEM share views help teams compare participation across two-wheelers, three-wheelers, passenger vehicles, CVs, trucks, and buses.",
  },
  russia: {
    region: "Europe and Asia",
    releaseDay: "16th day of the monthly release cycle",
    marketContext:
      "Russia is a large vehicle market where passenger vehicles, commercial vehicles, trucks, buses, and two-wheelers can be reviewed for demand and competitive movement.",
    segmentContext:
      "Coverage helps planning teams separate country-specific movement from broader regional assumptions in a complex market.",
    evContext:
      "Passenger vehicle EV share is included where available, while sales and OEM share remain the core monthly interpretation layers.",
    oemContext:
      "OEM share modules help compare passenger vehicle, CV, truck, bus, and two-wheeler performance.",
  },
  belgium: {
    region: "Europe",
    releaseDay: "17th day of the monthly release cycle",
    marketContext:
      "Belgium is a compact European market where passenger vehicles, commercial vehicles, trucks, buses, tractors, and two-wheelers can be reviewed for fleet and retail signals.",
    segmentContext:
      "Coverage is useful for teams that need European country-level context without turning the page into a raw dashboard.",
    evContext:
      "EV and powertrain transition context can be reviewed where the available dataset supports those indicators.",
    oemContext:
      "OEM share modules help compare passenger vehicle, two-wheeler, CV, truck, bus, and tractor activity.",
  },
};

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

  const title = `${dataset.name} Automotive Sales Data & Flash Report | RACE Auto Analytics`;
  const description = `Monthly ${dataset.name} automotive sales data, OEM share, EV penetration, vehicle segment performance and flash report insights from RACE Auto Analytics.`;
  const canonical = `/flash-reports/country-data/${dataset.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    keywords: [
      `${dataset.name} automotive sales data`,
      `${dataset.name} vehicle sales forecast`,
      `${dataset.name} flash report`,
      `${dataset.name} OEM market share`,
      `${dataset.name} EV penetration`,
      "automotive flash report",
      "vehicle sales data by country",
    ],
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${canonical}`,
      type: "article",
      siteName: "RACE Auto Analytics",
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

  const profile = COUNTRY_SEO_PROFILES[dataset.slug];
  const moduleSummary = summarizeModules(dataset.modules);
  const faqItems = buildCountryFaq(dataset.name, profile);
  const canonical = `${SITE_URL}/flash-reports/country-data/${dataset.slug}`;

  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${dataset.name} Automotive Sales Data and Flash Report`,
    description: `Monthly ${dataset.name} vehicle sales data covering OEM share, vehicle segments, EV trends and market insights.`,
    url: canonical,
    creator: {
      "@type": "Organization",
      name: "RACE Auto Analytics",
      url: SITE_URL,
    },
    temporalCoverage: "Monthly",
    spatialCoverage: dataset.name,
    keywords: [
      `${dataset.name} automotive sales data`,
      `${dataset.name} vehicle sales forecast`,
      "automotive flash report",
      "OEM market share",
      "EV penetration",
    ],
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
        name: "RACE Auto Analytics",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Automotive flash reports",
        item: `${SITE_URL}/flash-reports/overview`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${dataset.name} automotive sales data`,
        item: canonical,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <section className="bg-slate-950 text-white">
        <div className="mx-auto w-[95vw] max-w-none px-2 pb-16 pt-14 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
          <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 shadow-[0_18px_60px_rgba(0,0,0,.55)] md:p-8">
            <CountryPageActions
              countrySlug={dataset.slug}
              countryName={dataset.name}
            />

            <nav className="text-xs text-white/55" aria-label="Breadcrumb">
              <Link href="/flash-reports/overview" className="hover:text-white">
                Automotive flash reports
              </Link>
              <span className="mx-2">/</span>
              <span>{dataset.name} automotive sales data</span>
            </nav>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">
              Country automotive flash report
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              {dataset.name} Automotive Sales Data &amp; Flash Report
            </h1>
            <p className="mt-4 max-w-5xl text-sm leading-7 text-white/80 md:text-base">
              The {dataset.name} automotive sales data page summarizes monthly
              flash report coverage for vehicle segment performance, OEM market
              share, EV or alternative fuel indicators where available, and
              country-specific planning context. It is written as a public
              summary page for search visitors, while subscribed users can open
              the full interactive dataset through the product workflow.
            </p>
            <p className="mt-4 max-w-5xl text-sm leading-7 text-white/75 md:text-base">
              {profile.marketContext} {profile.segmentContext} The page is
              intended for OEM planning teams, dealer networks, market analysts,
              fleet and finance teams, and strategy groups that need reliable
              monthly country context before moving into the deeper dashboard.
            </p>

            <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
              <InfoCard title="Region" body={profile.region} />
              <InfoCard title="Release schedule" body={profile.releaseDay} />
              <InfoCard
                title="Available module count"
                body={`${dataset.modules.length} flash report modules`}
              />
            </div>

            <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-5">
                <h2 className="text-lg font-semibold text-white/95">
                  Segment coverage in {dataset.name}
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  {moduleSummary.segmentSentence} The module set includes sales
                  forecast views, OEM share modules, and application or
                  contribution splits where available for the country.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {moduleSummary.segmentLabels.map((label) => (
                    <div
                      key={label}
                      className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white/85"
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-5">
                <h2 className="text-lg font-semibold text-white/95">
                  OEM share, EV trend, and market context
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  {profile.oemContext} {profile.evContext} These signals help
                  users compare the latest {dataset.name} market movement with
                  the broader automotive flash reports hub and the country-wise
                  vehicle sales forecast workflow.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/forecast/overview"
                    prefetch={false}
                    className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                  >
                    Country-wise vehicle sales forecast
                  </Link>
                  <Link
                    href="/flash-reports/overview"
                    prefetch={false}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
                  >
                    Global automotive flash reports
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-7 rounded-xl border border-white/10 bg-white/5 p-4 md:p-5">
              <h2 className="text-lg font-semibold text-white/95">
                Available data modules for {dataset.name}
              </h2>
              <ul className="mt-4 grid grid-cols-1 gap-2 text-sm text-white/85 md:grid-cols-2 xl:grid-cols-3">
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

            <div className="mt-7 rounded-xl border border-white/10 bg-white/5 p-4 md:p-5">
              <h2 className="text-lg font-semibold text-white/95">
                {dataset.name} flash report FAQ
              </h2>
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
        </div>
      </section>
      <Footer />
    </>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
        {title}
      </div>
      <div className="mt-2 text-sm font-semibold text-white/90">{body}</div>
    </div>
  );
}

function summarizeModules(modules: string[]) {
  const checks: Array<[string, RegExp]> = [
    ["Passenger vehicles", /Passenger Vehicle/i],
    ["Commercial vehicles", /\bCV\b|Commercial/i],
    ["Two-wheelers", /\b2W\b/i],
    ["Three-wheelers", /\b3W\b/i],
    ["Trucks", /Truck/i],
    ["Buses", /Bus|Buses/i],
    ["Tractors", /Tractor|AG/i],
    ["Construction equipment", /Construction/i],
    ["EV and alternative fuel", /EV|Alternative Fuel/i],
  ];

  const segmentLabels = checks
    .filter(([, pattern]) => pattern.test(modules.join(" ")))
    .map(([label]) => label);

  const segmentSentence = segmentLabels.length
    ? `Current public coverage for this country includes ${segmentLabels.join(", ")}.`
    : "Current public coverage focuses on the available country-level flash report modules.";

  return {
    segmentLabels,
    segmentSentence,
  };
}

function buildCountryFaq(country: string, profile: CountrySeoProfile) {
  return [
    {
      question: `What does the ${country} automotive sales data page include?`,
      answer: `It summarizes ${country} flash report coverage, available vehicle segments, OEM share visibility, release schedule, and EV or alternative fuel context where the dataset supports it.`,
    },
    {
      question: `How often is the ${country} flash report released?`,
      answer: `The ${country} page follows the ${profile.releaseDay}. The public summary is designed to guide users before they open subscribed dashboard data.`,
    },
    {
      question: `Can ${country} data be used with forecasts?`,
      answer: `Yes. Users can review ${country} flash report context and then move to the forecast overview to compare AI/ML, survey, analyst, and BYF methods for country-wise vehicle sales forecast planning.`,
    },
  ];
}
