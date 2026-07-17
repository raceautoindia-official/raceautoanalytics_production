import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { SITE_URL } from "@/lib/seoRoutes";

const TITLE = "Methodology | Race Auto Analytics";
const DESCRIPTION =
  "How Race Auto Analytics sources, defines and forecasts automotive sales data — data sources, wholesale vs retail definitions, release calendar, forecast approach and revision policy.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/methodology" },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/methodology`,
    type: "article",
    siteName: "RACE Auto Analytics",
  },
};

// NOTE FOR REVIEW: paragraphs marked [CONFIRM] describe the general approach and
// must be verified/edited against your actual sourcing before this goes live.
const SECTIONS: { h: string; body: string[] }[] = [
  {
    h: "1. What a flash report is",
    body: [
      "A Race Auto Analytics flash report is a monthly market summary for a country: total vehicle sales movement, OEM market share, segment performance, EV and alternative-fuel signals, and application splits where available. It is designed to give analysts, suppliers, dealers and planning teams a fast, comparable monthly read.",
    ],
  },
  {
    h: "2. Data sources",
    body: [
      "Figures are compiled from official and industry-reported vehicle sales and registration data for each market, then cleaned and normalized into consistent OEM and segment definitions so numbers can be compared across countries and months.",
      "[CONFIRM] List the specific source(s) per country (e.g. national registration authority, industry association, OEM disclosures) so analysts can trace and cite provenance — this is the single biggest trust signal for a data vendor.",
    ],
  },
  {
    h: "3. Definitions — wholesale vs. retail",
    body: [
      "[CONFIRM] State clearly whether headline volumes are wholesale (dispatches from OEM to dealer) or retail (registrations / sales to end customers), per country, since the two can diverge materially. Define how EV / alternative-fuel and each vehicle segment (PV, CV, 2W, 3W, truck, bus, tractor, construction equipment) are classified.",
    ],
  },
  {
    h: "4. Coverage & release calendar",
    body: [
      "Coverage spans 14 countries and up to 9 vehicle segments, with depth varying by market. India is the deepest dataset and is released early each month (day 3); other markets follow on a staggered schedule.",
      "[CONFIRM] Publish the per-country release day and module depth so subscribers know exactly what to expect and when.",
    ],
  },
  {
    h: "5. Forecast methodology",
    body: [
      "The six-month forecast combines more than one signal so teams can compare demand direction rather than trust a single black box: AI/ML baselines learned from historical trends and seasonality, analyst assumptions, survey-based outlooks, and a Build Your Forecast (BYF) scoring approach where users weight their own drivers and barriers.",
      "[CONFIRM] Note the base period each forecast is anchored to and any model-selection or blending rules you want stated publicly.",
    ],
  },
  {
    h: "6. Revisions & corrections",
    body: [
      "[CONFIRM] State your revision policy: when prior-month figures can be restated (e.g. as official data finalizes), how corrections are flagged, and the versioning subscribers can rely on. A clear revision policy is what lets analysts defend your numbers in their own decks.",
    ],
  },
];

export default function MethodologyPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Race Auto Analytics — Data & Forecast Methodology",
    description: DESCRIPTION,
    url: `${SITE_URL}/methodology`,
    mainEntityOfPage: `${SITE_URL}/methodology`,
    author: { "@type": "Organization", name: "Race Auto Analytics", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Race Auto Analytics", url: SITE_URL },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NavBar />
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="border-b border-white/10">
          <div className="mx-auto w-full max-w-4xl px-4 pt-14 pb-8 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/80">
              Methodology
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              How we source, define and forecast the numbers
            </h1>
            <p className="mt-4 text-sm leading-7 text-white/70 md:text-base">
              Transparent methodology is what lets analysts cite our data with
              confidence. Here is how Race Auto Analytics compiles, defines and
              projects automotive market data.
            </p>
          </div>
        </section>

        <section className="pb-20 pt-10">
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
            <div className="space-y-8">
              {SECTIONS.map((s) => (
                <div
                  key={s.h}
                  className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 md:p-7"
                >
                  <h2 className="text-lg font-bold tracking-tight text-white">
                    {s.h}
                  </h2>
                  <div className="mt-3 space-y-3 text-sm leading-7 text-white/70">
                    {s.body.map((p, i) => (
                      <p
                        key={i}
                        className={
                          p.startsWith("[CONFIRM]")
                            ? "rounded-lg border border-amber-400/20 bg-amber-500/5 px-3 py-2 text-amber-100/80"
                            : ""
                        }
                      >
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                View pricing
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
              >
                Ask about the data
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
