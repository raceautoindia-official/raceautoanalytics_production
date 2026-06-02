import type { Metadata } from "next";
import Link from "next/link";
import LeadCaptureForm from "./LeadCaptureForm";

export const metadata: Metadata = {
  title:
    "Automotive Market Intelligence & Vehicle Sales Forecast Platform | Race Auto Analytics",
  description:
    "Access automotive sales data, OEM market share, EV trends, monthly flash reports, and AI-powered vehicle sales forecasts across key global markets.",
  keywords: [
    "automotive market intelligence",
    "vehicle sales forecast",
    "automotive sales data",
    "OEM market share",
    "EV market forecast",
    "automotive flash reports",
    "automotive industry reports",
    "vehicle market analysis",
  ],
  alternates: {
    canonical: "/automotive-market-intelligence",
  },
};

const audiences = [
  "OEMs",
  "Auto Component Suppliers",
  "Dealers & Distributors",
  "Consultants",
  "Investors",
  "EV Companies",
];

const features = [
  {
    title: "Monthly Vehicle Sales Flash Reports",
    body: "Track the latest market movement by country, segment, application, and category.",
  },
  {
    title: "AI-Powered Sales Forecasts",
    body: "Compare six-month outlooks with forecast signals built for planning teams.",
  },
  {
    title: "OEM & Brand Market Share",
    body: "Review competitive position, share movement, and brand performance signals.",
  },
  {
    title: "EV and Alternative Fuel Insights",
    body: "Monitor EV adoption, alternative fuel contribution, and market transition trends.",
  },
  {
    title: "Passenger, 2W, CV, Truck and Bus Coverage",
    body: "Cover major vehicle segments used by automotive business teams.",
  },
  {
    title: "Country-wise Market Comparison",
    body: "Compare market context across key global automotive countries.",
  },
];

const choosePoints = [
  "Built for automotive business decision-making",
  "Covers sales, share, segment and forecast insights",
  "Useful for planning, benchmarking and market entry",
  "Designed for fast executive-level reporting",
];

const statCards = [
  "Monthly Flash Reports",
  "6-Month Forecasts",
  "OEM Market Share",
  "EV & Alternative Fuel Trends",
];

export default function AutomotiveMarketIntelligencePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" prefetch={false} className="flex min-w-0 flex-col">
            <span className="text-base font-extrabold text-slate-950 sm:text-lg">
              Race Auto Analytics
            </span>
            <span className="text-xs font-medium text-slate-500">
              Automotive Market Intelligence
            </span>
          </Link>
          <a
            href="#sample-report-form"
            className="inline-flex shrink-0 items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
          >
            Request Sample Report
          </a>
        </div>
      </header>

      <main>
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase text-blue-700">
                Automotive market intelligence platform
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight text-slate-950 md:text-5xl">
                Automotive Market Intelligence & Sales Forecast Platform
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
                Track vehicle sales, OEM market share, EV adoption, segment
                trends, and AI-powered forecasts across key automotive markets.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#sample-report-form"
                  className="inline-flex items-center justify-center rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
                >
                  Request Sample Report
                </a>
                <a
                  href="#sample-report-form"
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:border-blue-200 hover:bg-blue-50"
                >
                  Book a Demo
                </a>
              </div>
              <p className="mt-5 text-sm font-medium text-slate-600">
                Built for OEMs, suppliers, consultants, investors, and
                automotive strategy teams.
              </p>
            </div>

            <DashboardPreview />
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {audiences.map((audience) => (
                <div
                  key={audience}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-800 shadow-sm"
                >
                  {audience}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-12 md:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="What you get"
              title="Market intelligence built around real automotive decisions"
              body="Use one clean workflow to understand sales, share, segments, EV movement, and near-term demand direction."
            />
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="text-lg font-bold text-slate-950">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {feature.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="sample-report-form"
          className="scroll-mt-24 border-y border-slate-200 bg-slate-50 py-12 md:py-16"
        >
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase text-blue-700">
                Sample report access
              </p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight text-slate-950 md:text-4xl">
                Download a Sample Automotive Market Report
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-700">
                Fill the enquiry form to access a sample report and understand
                how Race Auto Analytics can support market planning,
                forecasting, and business decisions.
              </p>
              <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
                <h3 className="text-sm font-bold text-slate-950">
                  Report themes include
                </h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  <li>Vehicle sales data and segment performance</li>
                  <li>OEM market share and competitive signals</li>
                  <li>EV trends and alternative fuel indicators</li>
                  <li>Country-wise flash report and forecast context</li>
                </ul>
              </div>
            </div>

            <LeadCaptureForm />
          </div>
        </section>

        <section className="bg-white py-12 md:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Why choose Race Auto Analytics"
              title="A focused intelligence layer for automotive growth teams"
              body="Designed for practical planning conversations, executive updates, and market review workflows."
            />
            <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
              {choosePoints.map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-700" />
                  <p className="text-sm font-semibold leading-6 text-slate-800">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#071426] py-12 text-white md:py-16">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
            <div>
              <h2 className="max-w-3xl text-3xl font-extrabold leading-tight md:text-4xl">
                Ready to explore automotive market intelligence for your
                business?
              </h2>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <a
                href="#sample-report-form"
                className="inline-flex items-center justify-center rounded-md bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-blue-50"
              >
                Request Demo
              </a>
              <a
                href="#sample-report-form"
                className="inline-flex items-center justify-center rounded-md border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Download Sample Report
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-base font-extrabold text-slate-950">
              Race Auto Analytics
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Automotive Sales Forecasts | Flash Reports | Market Intelligence
            </p>
          </div>
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-700"
          >
            <Link href="/" prefetch={false}>
              Home
            </Link>
            <Link href="/flash-reports/overview" prefetch={false}>
              Flash Reports
            </Link>
            <Link href="/forecast/overview" prefetch={false}>
              Forecast
            </Link>
            <a href="#sample-report-form">Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function DashboardPreview() {
  return (
    <aside
      aria-label="Dashboard preview"
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase text-blue-700">
            Dashboard preview
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-slate-950">
            Global Market Pulse
          </h2>
        </div>
        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
          Live workflow
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {statCards.map((stat) => (
          <div key={stat} className="rounded-lg border border-slate-200 p-3">
            <div className="h-2 w-12 rounded-full bg-blue-100" />
            <p className="mt-3 text-sm font-bold leading-5 text-slate-900">
              {stat}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex h-44 items-end gap-2">
          {[42, 64, 52, 78, 58, 86, 72, 94].map((height, index) => (
            <div
              key={height + index}
              className="flex-1 rounded-t-md bg-blue-600"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="h-2 rounded-full bg-slate-300" />
          <div className="h-2 rounded-full bg-slate-300" />
          <div className="h-2 rounded-full bg-slate-300" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Segment mix
          </p>
          <div className="mt-3 h-2 rounded-full bg-slate-200">
            <div className="h-2 w-2/3 rounded-full bg-blue-700" />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Forecast confidence
          </p>
          <div className="mt-3 h-2 rounded-full bg-slate-200">
            <div className="h-2 w-3/4 rounded-full bg-emerald-600" />
          </div>
        </div>
      </div>
    </aside>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-semibold uppercase text-blue-700">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold leading-tight text-slate-950 md:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-slate-700">{body}</p>
    </div>
  );
}
