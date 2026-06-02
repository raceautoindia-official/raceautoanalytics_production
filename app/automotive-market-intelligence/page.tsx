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
    body: "Track country-wise sales movement, segment shifts, OEM activity, and monthly demand signals.",
  },
  {
    title: "AI-Powered Sales Forecasts",
    body: "Compare six-month forecast views with planning-ready demand direction and risk context.",
  },
  {
    title: "OEM & Brand Market Share",
    body: "Review competitive share movement and brand positioning across covered vehicle segments.",
  },
  {
    title: "EV and Alternative Fuel Insights",
    body: "Monitor EV adoption, alternative fuel contribution, and powertrain transition signals.",
  },
  {
    title: "Passenger, 2W, CV, Truck and Bus Coverage",
    body: "Use segment-level views for passenger mobility, freight, fleet, agriculture, and transit planning.",
  },
  {
    title: "Country-wise Market Comparison",
    body: "Compare market context across key global automotive countries with consistent reporting structure.",
  },
];

const choosePoints = [
  "Built for automotive business decision-making",
  "Covers sales, share, segment and forecast insights",
  "Useful for planning, benchmarking and market entry",
  "Designed for fast executive-level reporting",
];

const statCards = [
  ["Monthly Flash Reports", "Latest market read"],
  ["6-Month Forecasts", "Planning horizon"],
  ["OEM Market Share", "Competitive view"],
  ["EV & Alternative Fuel Trends", "Transition signal"],
];

const reportThemes = [
  "Vehicle sales data and segment performance",
  "OEM market share and competitive signals",
  "EV trends and alternative fuel indicators",
  "Country-wise flash report and forecast context",
];

export default function AutomotiveMarketIntelligencePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex w-[95vw] max-w-none items-center justify-between gap-4 px-2 py-3 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
          <Link href="/" prefetch={false} className="flex min-w-0 flex-col">
            <span className="text-base font-extrabold tracking-tight text-white sm:text-lg">
              Race Auto Analytics
            </span>
            <span className="text-xs font-medium text-blue-200/70">
              Automotive Market Intelligence
            </span>
          </Link>
          <a
            href="#sample-report-form"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110"
          >
            Request Sample Report
          </a>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/98 to-slate-950" />
            <div className="absolute left-1/3 top-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.22),transparent_62%)] blur-3xl" />
          </div>

          <div className="mx-auto grid w-[95vw] max-w-none grid-cols-1 gap-6 px-2 py-8 sm:px-3 md:py-10 lg:grid-cols-[1fr_0.82fr] lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
            <div className="flex min-w-0 flex-col justify-center">
              <div className="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/80">
                Automotive market intelligence platform
              </div>

              <h1 className="mt-5 max-w-5xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                Automotive Market Intelligence & Sales Forecast Platform
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-white/70 md:text-lg">
                Track vehicle sales, OEM market share, EV adoption, segment
                trends, and AI-powered forecasts across key automotive markets.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#sample-report-form"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:brightness-110"
                >
                  Request Sample Report
                </a>
                <a
                  href="#sample-report-form"
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                >
                  Book a Demo
                </a>
              </div>

              <p className="mt-5 text-sm font-medium text-white/70">
                Built for OEMs, suppliers, consultants, investors, and
                automotive strategy teams.
              </p>

              <div className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
                {statCards.map(([title, body]) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-4 shadow-[0_12px_40px_rgba(0,0,0,.35)]"
                  >
                    <div className="h-1.5 w-10 rounded-full bg-blue-400/80" />
                    <h2 className="mt-3 text-sm font-bold leading-5 text-white">
                      {title}
                    </h2>
                    <p className="mt-1 text-xs text-white/55">{body}</p>
                  </div>
                ))}
              </div>

              <DashboardPreview />
            </div>

            <aside
              id="sample-report-form"
              className="scroll-mt-24 rounded-2xl border border-blue-400/25 bg-[#0b141f]/90 p-4 shadow-[0_20px_80px_rgba(15,23,42,.7)] ring-1 ring-white/10 md:p-5 lg:sticky lg:top-24 lg:self-start"
            >
              <div className="mb-4 rounded-xl border border-blue-300/20 bg-blue-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/80">
                  Sample report access
                </p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
                  Download a Sample Automotive Market Report
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  Fill the enquiry form to access a sample report and understand
                  how Race Auto Analytics can support market planning,
                  forecasting, and business decisions.
                </p>
              </div>
              <LeadCaptureForm />
            </aside>
          </div>
        </section>

        <section className="bg-slate-950 pb-8 text-white">
          <div className="mx-auto w-[95vw] max-w-none px-2 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {audiences.map((audience) => (
                <div
                  key={audience}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center text-xs font-semibold text-white/80 shadow-[0_10px_30px_rgba(0,0,0,.25)] sm:text-sm"
                >
                  {audience}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 py-10 text-white md:py-12">
          <div className="mx-auto w-[95vw] max-w-none px-2 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
            <SectionHeading
              eyebrow="What you get"
              title="Market intelligence built around real automotive decisions"
              body="Use one workflow to understand sales, share, segments, EV movement, and near-term demand direction."
            />
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-5 shadow-[0_12px_40px_rgba(0,0,0,.38)]"
                >
                  <h3 className="text-lg font-bold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-white/70">
                    {feature.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 py-10 text-white md:py-12">
          <div className="mx-auto grid w-[95vw] max-w-none grid-cols-1 gap-6 px-2 sm:px-3 lg:grid-cols-[0.85fr_1.15fr] lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
            <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,.38)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">
                Lead magnet
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight md:text-3xl">
                Your sample report shows the exact planning format
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/70 md:text-base">
                Visitors can quickly see how Race Auto Analytics supports
                automotive market planning, competitor review, EV strategy,
                country comparison, and executive reporting.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {reportThemes.map((theme) => (
                <div
                  key={theme}
                  className="rounded-2xl border border-blue-300/15 bg-blue-500/10 p-4 text-sm font-semibold leading-6 text-blue-100"
                >
                  {theme}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 py-10 text-white md:py-12">
          <div className="mx-auto w-[95vw] max-w-none px-2 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
            <SectionHeading
              eyebrow="Why choose Race Auto Analytics"
              title="A focused intelligence layer for automotive growth teams"
              body="Designed for practical planning conversations, executive updates, and market review workflows."
            />
            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              {choosePoints.map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0b141f]/70 p-4 shadow-[0_12px_40px_rgba(0,0,0,.3)]"
                >
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-400" />
                  <p className="text-sm font-semibold leading-6 text-white/80">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 pb-12 pt-4 text-white md:pb-16">
          <div className="mx-auto w-[95vw] max-w-none px-2 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
            <div className="rounded-3xl border border-white/10 bg-[#0b141f]/75 p-6 shadow-[0_18px_60px_rgba(0,0,0,.55)] md:p-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="max-w-3xl text-2xl font-extrabold leading-tight md:text-3xl">
                    Ready to explore automotive market intelligence for your
                    business?
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                    Use the form above to unlock the sample report and start a
                    focused demo conversation.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <a
                    href="#sample-report-form"
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition hover:brightness-110"
                  >
                    Request Demo
                  </a>
                  <a
                    href="#sample-report-form"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                  >
                    Download Sample Report
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-slate-950 py-8 text-white">
        <div className="mx-auto flex w-[95vw] max-w-none flex-col gap-5 px-2 sm:px-3 md:flex-row md:items-center md:justify-between lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
          <div>
            <p className="text-base font-extrabold">Race Auto Analytics</p>
            <p className="mt-1 text-sm text-white/55">
              Automotive Sales Forecasts | Flash Reports | Market Intelligence
            </p>
          </div>
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-white/70"
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
      className="mt-6 rounded-2xl border border-white/10 bg-[#0b141f]/70 p-4 shadow-[0_12px_40px_rgba(0,0,0,.38)]"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/75">
            Dashboard preview
          </p>
          <h2 className="mt-1 text-lg font-extrabold">Global Market Pulse</h2>
        </div>
        <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          Planning view
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.75fr]">
        <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
          <div className="flex h-44 items-end gap-2">
            {[42, 64, 52, 78, 58, 86, 72, 94].map((height, index) => (
              <div
                key={height + index}
                className="flex-1 rounded-t-md bg-gradient-to-t from-blue-700 to-blue-300"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="h-2 rounded-full bg-white/15" />
            <div className="h-2 rounded-full bg-white/15" />
            <div className="h-2 rounded-full bg-white/15" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <ProgressCard title="Segment mix" width="67%" color="bg-blue-400" />
          <ProgressCard
            title="Forecast confidence"
            width="76%"
            color="bg-emerald-400"
          />
          <ProgressCard
            title="EV trend visibility"
            width="58%"
            color="bg-amber-300"
          />
        </div>
      </div>
    </aside>
  );
}

function ProgressCard({
  title,
  width,
  color,
}: {
  title: string;
  width: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/50">
        {title}
      </p>
      <div className="mt-3 h-2 rounded-full bg-white/10">
        <div className={`h-2 rounded-full ${color}`} style={{ width }} />
      </div>
    </div>
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
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight text-white md:text-3xl">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-7 text-white/70 md:text-base">
        {body}
      </p>
    </div>
  );
}
