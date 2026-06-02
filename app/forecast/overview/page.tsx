// app/forecast/overview/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Footer from "@/app/components/Footer";
import AIPoweredForecastTools from "@/app/components/AIPoweredForecastTools";
import NavBar from "@/app/components/Navbar";
import { SITE_URL } from "@/lib/seoRoutes";

export const metadata: Metadata = {
  title: "Automotive Sales Forecast Tools | AI, Survey & BYF Forecast Platform",
  description:
    "Automotive sales forecast tools combining AI/ML forecasting, survey outlooks and Build Your Forecast scoring for country-wise vehicle market planning.",
  alternates: { canonical: "/forecast/overview" },
  robots: { index: true, follow: true },
  openGraph: {
    title:
      "Automotive Sales Forecast Tools | AI, Survey & BYF Forecast Platform",
    description:
      "Automotive sales forecast tools combining AI/ML forecasting, survey outlooks and Build Your Forecast scoring for country-wise vehicle market planning.",
    url: `${SITE_URL}/forecast/overview`,
    type: "website",
  },
};

export default function Page() {
  const faqItems = [
    {
      question: "What forecast horizon does Race Auto Analytics support?",
      answer:
        "The forecast overview focuses on a rolling six-month automotive sales forecast so teams can plan near-term demand, inventory, dealer activity, pricing, and market response.",
    },
    {
      question: "Which forecast methods can be compared?",
      answer:
        "Users can compare AI and ML forecasts, survey outlooks, analyst assumptions, linear trend baselines, and Build Your Forecast scoring in one planning workflow.",
    },
    {
      question: "Who uses automotive sales forecasts?",
      answer:
        "OEM planning teams, dealer networks, market analysts, EV strategy teams, export-import teams, and leadership groups use forecasts to compare demand scenarios and manage market risk.",
    },
  ];

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Automotive Sales Forecast Tools",
    url: `${SITE_URL}/forecast/overview`,
    provider: {
      "@type": "Organization",
      name: "Race Auto Analytics",
      url: SITE_URL,
    },
    serviceType: "Vehicle sales forecasting",
    description:
      "AI, survey, analyst and Build Your Forecast tools for country-wise automotive sales forecast planning.",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <NavBar />

      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-950" />
          <div className="absolute right-1/3 top-1/4 h-[36rem] w-[36rem] translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.22),transparent_60%)] blur-3xl" />
        </div>

        <div className="mx-auto w-[95vw] max-w-none px-2 py-10 sm:px-3 md:py-14 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/80">
            Forecast tools overview
          </span>

          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            <span className="block text-white">
              Automotive Sales Forecast Tools
            </span>
            <span className="mt-2 block bg-gradient-to-r from-blue-400 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
              for vehicle market planning
            </span>
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/75 md:text-lg">
            Compare AI/ML, survey outlooks, analyst assumptions, linear
            baselines, and Build Your Forecast scoring in a single automotive
            sales forecast workflow. The platform supports country-wise vehicle
            demand planning across passenger vehicles, commercial vehicles,
            two-wheelers, three-wheelers, tractors, trucks, buses, and
            construction equipment.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/forecast"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:brightness-110"
            >
              Open Forecast Tool
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/flash-reports/overview"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              Browse Flash Reports
            </Link>
            <Link
              href="/flash-reports/overview#byf"
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-5 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
            >
              Submit a BYF Score
            </Link>
            <Link
              href="/subscription"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <main className="bg-slate-950 py-5 text-white">
        <ForecastSeoContent faqItems={faqItems} />
        <AIPoweredForecastTools />
      </main>

      <Footer />
    </>
  );
}

function ForecastSeoContent({
  faqItems,
}: {
  faqItems: Array<{ question: string; answer: string }>;
}) {
  const methods = [
    [
      "AI and ML baseline",
      "Uses historical sales movement, seasonality, and market pattern recognition to create a repeatable forecast baseline.",
    ],
    [
      "Survey outlook",
      "Adds market sentiment and participant expectations so demand planning is not limited to historical data alone.",
    ],
    [
      "Analyst assumptions",
      "Supports expert review of policy, supply, inventory, pricing, product launch, and macroeconomic signals.",
    ],
    [
      "Build Your Forecast scoring",
      "Lets users score drivers and barriers, then compare their own view against the system forecast.",
    ],
  ];

  const useCases = [
    "OEM volume planning",
    "Dealer target planning",
    "EV strategy and penetration tracking",
    "Inventory and production review",
    "Export-import market checks",
    "Pricing and incentive planning",
    "Competitive benchmarking",
    "Country portfolio planning",
  ];

  return (
    <section className="pb-8">
      <div className="mx-auto w-[95vw] max-w-none px-2 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
        <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,.45)] md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">
            Six-month rolling outlook
          </p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight md:text-3xl">
            Automotive sales forecasting for country-wise demand decisions
          </h2>
          <p className="mt-4 max-w-5xl text-sm leading-7 text-white/75 md:text-base">
            The Race Auto Analytics forecast overview is the main public page
            for automotive sales forecast discovery. It explains how the
            platform supports a rolling six-month outlook, compares multiple
            forecast methods, and helps planning teams validate market direction
            before they commit to targets, inventory moves, dealer actions, or
            product strategy decisions.
          </p>
          <p className="mt-4 max-w-5xl text-sm leading-7 text-white/75 md:text-base">
            Forecasting is strongest when teams can compare more than one
            signal. A historical model may show baseline demand, a survey may
            reveal sentiment change, an analyst assumption may capture policy or
            supply risk, and BYF scoring may reveal how an internal team views
            the same market. This page keeps those methods visible in crawlable
            HTML and links search visitors toward monthly automotive flash
            reports for the latest market data context.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,.45)]">
            <h2 className="text-xl font-bold tracking-tight">
              Forecast methodology
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3">
              {methods.map(([title, body]) => (
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

          <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,.45)]">
            <h2 className="text-xl font-bold tracking-tight">
              Planning use cases
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/75">
              Vehicle sales forecasts are used by OEM, dealer, fleet,
              financing, research, and strategy teams that need a practical
              view of near-term demand. Forecast outputs can be reviewed beside
              monthly flash reports, segment performance, EV penetration, OEM
              share, and country-level market movement.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {useCases.map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white/80"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,.45)]">
          <h2 className="text-xl font-bold tracking-tight">
            Coverage and sample forecast output
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/75">
            Forecast views are designed for country and segment comparison
            across passenger vehicles, commercial vehicles, two-wheelers,
            three-wheelers, tractors, trucks, buses, and construction equipment
            where data is available. A sample planning workflow starts with the
            latest flash report month, compares historical movement, reviews the
            six-month forecast table or chart, checks confidence and risk
            indicators, and then documents assumptions for internal review.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/flash-reports/overview"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              Monthly automotive flash reports
            </Link>
            <Link
              href="/flash-reports/country-data/india"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              India vehicle sales forecast context
            </Link>
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
