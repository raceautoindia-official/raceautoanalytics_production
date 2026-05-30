// app/forecast/overview/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Footer from "@/app/components/Footer";
import AIPoweredForecastTools from "@/app/components/AIPoweredForecastTools";
import NavBar from "@/app/components/Navbar";

export const metadata: Metadata = {
  title:
    "AI-Powered Automotive Forecast Tools | Build Your Forecast (BYF) Scoring",
  description:
    "Compare AI, ML survey, expert and Build-Your-Forecast (BYF) projections for automotive sales. Country-wise demand forecasting across passenger vehicles, CVs, two-wheelers, and more.",
  alternates: { canonical: "/forecast/overview" },
  openGraph: {
    title:
      "AI-Powered Automotive Forecast Tools | Build Your Forecast (BYF) Scoring",
    description:
      "Compare AI, ML survey, expert and Build-Your-Forecast (BYF) projections for automotive sales. Country-wise demand forecasting across passenger vehicles, CVs, two-wheelers, and more.",
    url: "https://raceautoanalytics.com/forecast/overview",
    type: "website",
  },
};

export default function Page() {
  return (
    <>
      <NavBar />

      {/* SEO Hero — single H1, keyword-rich intro, visible internal links.
          Covers Rank Math H1 / internal-links / keyword-density requirements
          while the existing AIPoweredForecastTools component renders the
          product detail below. */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-950" />
          <div className="absolute right-1/3 top-1/4 h-[36rem] w-[36rem] translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.22),transparent_60%)] blur-3xl" />
        </div>

        <div className="mx-auto w-[95vw] xl:w-[93vw] 2xl:w-[90vw] max-w-none px-2 sm:px-3 lg:px-4 py-10 md:py-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/80">
            Forecast tools overview
          </span>

          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            <span className="block text-white">AI-Powered Forecasts</span>
            <span className="mt-2 block bg-gradient-to-r from-blue-400 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
              for Automotive Sales &amp; Demand Planning
            </span>
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/75 md:text-lg">
            Compare ML survey, AI, expert (Race) and Build-Your-Forecast (BYF)
            projections side-by-side. Country-wise demand forecasting across
            passenger vehicles, commercial vehicles, two-wheelers,
            three-wheelers, AG tractors, trucks, buses and construction
            equipment — designed for OEMs, dealers, and industry analysts who
            need to validate monthly direction with confidence.
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

      <main className="py-5">
        <AIPoweredForecastTools />
      </main>

      <Footer />
    </>
  );
}
