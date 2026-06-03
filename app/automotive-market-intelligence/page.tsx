import type { Metadata } from "next";
import { ArrowRight, BarChart3, CheckCircle2, LineChart } from "lucide-react";
import Footer from "@/app/components/Footer";
import NavBar from "@/app/components/Navbar";
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

const heroProof = [
  "Monthly flash reports for vehicle sales, segment movement, OEM share and EV trends.",
  "Six-month forecast views for planning, benchmarking and executive reporting.",
  "Country-wise market context for OEMs, suppliers, consultants and investors.",
];

const sampleIncludes = [
  "Country sales snapshot",
  "Segment and application view",
  "OEM market share signals",
  "EV and alternative fuel trend",
];

const audiences = [
  "OEMs",
  "Suppliers",
  "Dealers",
  "Consultants",
  "Investors",
  "EV Companies",
];

const capabilities = [
  {
    title: "Monthly Vehicle Sales Flash Reports",
    body: "A fast monthly read on demand movement by market, segment and vehicle category.",
  },
  {
    title: "AI-Powered Vehicle Sales Forecasts",
    body: "Rolling six-month outlooks that help teams compare direction before planning decisions.",
  },
  {
    title: "OEM & Brand Market Share",
    body: "Competitive share views for benchmarking, market entry and sales performance review.",
  },
  {
    title: "EV and Alternative Fuel Insights",
    body: "Powertrain transition signals for EV strategy, product planning and market sizing.",
  },
];

const choosePoints = [
  "Built for automotive business decision-making",
  "Covers sales, share, segment and forecast insights",
  "Useful for planning, benchmarking and market entry",
  "Designed for fast executive-level reporting",
];

export default function AutomotiveMarketIntelligencePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <NavBar />

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#071426] to-slate-950" />
            <div className="absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.20),transparent_64%)] blur-3xl" />
          </div>

          <div className="mx-auto grid w-[95vw] max-w-none grid-cols-1 gap-6 px-2 py-5 sm:px-3 md:py-6 lg:grid-cols-[1fr_0.76fr] lg:items-start lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
            <div className="min-w-0 pt-1 lg:pt-4">
              <div className="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/80">
                Automotive market intelligence platform
              </div>

              <h1 className="mt-4 max-w-5xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
                Automotive Market Intelligence & Sales Forecast Platform
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/70 md:text-lg">
                Track vehicle sales, OEM market share, EV adoption, segment
                trends, and AI-powered forecasts across key automotive markets.
              </p>

              <div className="mt-5 space-y-2.5">
                {heroProof.map((item) => (
                  <div key={item} className="flex gap-3 text-sm text-white/80">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                    <span className="leading-6">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#sample-report-form"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/35 transition hover:bg-blue-500"
                >
                  Request Sample Report
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#sample-report-form"
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                >
                  Book a Demo
                </a>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-[#0b141f]/72 p-4 shadow-[0_12px_40px_rgba(0,0,0,.35)]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                  Built for
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {audiences.map((audience) => (
                    <span
                      key={audience}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/75"
                    >
                      {audience}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <aside
              id="sample-report-form"
              className="scroll-mt-24 rounded-2xl border border-blue-300/25 bg-[#0b141f]/95 p-3.5 shadow-[0_24px_90px_rgba(0,0,0,.58)] ring-1 ring-white/10 md:p-4 lg:sticky lg:top-24"
            >
              <div className="mb-3 border-b border-white/10 pb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/80">
                  Unlock sample report
                </p>
                <h2 className="mt-1.5 text-xl font-extrabold tracking-tight">
                  See the report format before a demo
                </h2>
                <p className="mt-1.5 text-sm leading-5 text-white/70">
                  Share your requirement and access a sample report covering
                  sales, share, EV trend and forecast-ready market context.
                </p>
              </div>
              <LeadCaptureForm />
            </aside>
          </div>
        </section>

        <section className="bg-slate-950 py-8 text-white">
          <div className="mx-auto w-[95vw] max-w-none px-2 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
            <div className="rounded-2xl border border-white/10 bg-[#0b141f]/72 p-5 shadow-[0_12px_40px_rgba(0,0,0,.35)] md:p-6">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">
                    What is inside
                  </p>
                  <h2 className="mt-3 text-2xl font-extrabold tracking-tight md:text-3xl">
                    A sample report built for planning conversations
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-white/70">
                    The sample shows how automotive decision teams can review
                    market movement quickly without opening a raw dashboard.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {sampleIncludes.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-xl border border-blue-300/15 bg-blue-500/10 p-4 text-sm font-semibold text-blue-100"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-200" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-950 py-8 text-white md:py-10">
          <div className="mx-auto grid w-[95vw] max-w-none grid-cols-1 gap-6 px-2 sm:px-3 lg:grid-cols-[0.95fr_1.05fr] lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
            <div>
              <SectionHeading
                eyebrow="Platform coverage"
                title="From market data to forecast-ready insight"
                body="Race Auto Analytics is positioned for teams that need structured automotive market intelligence, not scattered monthly data points."
              />

              <div className="mt-6 grid grid-cols-1 gap-3">
                {capabilities.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-[#0b141f]/72 p-5 shadow-[0_12px_40px_rgba(0,0,0,.32)]"
                  >
                    <h3 className="text-base font-bold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/65">
                      {item.body}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <DashboardPreview />
          </div>
        </section>

        <section className="bg-slate-950 py-8 text-white md:py-10">
          <div className="mx-auto w-[95vw] max-w-none px-2 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
            <SectionHeading
              eyebrow="Why choose Race Auto Analytics"
              title="A focused intelligence layer for automotive growth teams"
              body="Designed for practical planning conversations, executive updates, benchmarking reviews and market-entry work."
            />
            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              {choosePoints.map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0b141f]/72 p-4 shadow-[0_12px_40px_rgba(0,0,0,.28)]"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
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
            <div className="rounded-3xl border border-white/10 bg-[#0b141f]/76 p-6 shadow-[0_18px_60px_rgba(0,0,0,.52)] md:p-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="max-w-3xl text-2xl font-extrabold leading-tight md:text-3xl">
                    Ready to review market intelligence for your business?
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                    Unlock the sample report, then use the demo conversation to
                    discuss country coverage, forecast requirements and
                    subscription options.
                  </p>
                </div>
                <a
                  href="#sample-report-form"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
                >
                  Request Sample Report
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function DashboardPreview() {
  return (
    <aside
      aria-label="Dashboard preview"
      className="rounded-2xl border border-white/10 bg-[#0b141f]/72 p-5 shadow-[0_12px_40px_rgba(0,0,0,.35)] md:p-6"
    >
      <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/75">
            Sample output
          </p>
          <h2 className="mt-1 text-xl font-extrabold">
            Executive market snapshot
          </h2>
        </div>
        <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          Preview
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.75fr]">
        <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                Vehicle sales trend
              </p>
              <p className="mt-1 text-sm font-semibold text-white/85">
                Monthly movement by market
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-blue-300" />
          </div>
          <div className="mt-5 flex h-44 items-end gap-2">
            {[42, 64, 52, 78, 58, 86, 72, 94].map((height, index) => (
              <div
                key={height + index}
                className="flex-1 rounded-t-md bg-gradient-to-t from-blue-700 to-blue-300"
                style={{ height: `${height}%` }}
              />
            ))}
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
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/50">
          {title}
        </p>
        <LineChart className="h-4 w-4 text-white/35" />
      </div>
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
