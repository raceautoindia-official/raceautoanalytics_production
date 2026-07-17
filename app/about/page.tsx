import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { SITE_URL } from "@/lib/seoRoutes";

const TITLE = "About | Race Auto Analytics";
const DESCRIPTION =
  "Race Auto Analytics delivers analyst-ready automotive flash reports and forecasts across 14 countries and 9 vehicle segments — from the team behind Race Auto India, a decade-old automotive media brand.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/about`,
    type: "website",
    siteName: "RACE Auto Analytics",
  },
};

const STATS = [
  { k: "14", v: "countries covered" },
  { k: "9", v: "vehicle segments" },
  { k: "6-month", v: "rolling forecasts" },
  { k: "Day 3", v: "India release each month" },
];

export default function AboutPage() {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Race Auto Analytics",
    alternateName: ["RACE Analytics"],
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo.webp`,
    description: DESCRIPTION,
    email: "info@raceautoanalytics.com",
    telephone: "+91 8072098352",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Chennai",
      addressRegion: "Tamil Nadu",
      addressCountry: "IN",
    },
    parentOrganization: {
      "@type": "Organization",
      name: "Race Innovations Pvt Ltd",
      url: "https://raceinnovations.in/",
    },
    sameAs: [
      "https://www.linkedin.com/company/race-auto-india/",
      "https://x.com/raceautoindia",
      "https://www.youtube.com/@RaceAutoIndia",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <NavBar />
      <main className="min-h-screen bg-slate-950 text-white">
        {/* Hero */}
        <section className="border-b border-white/10">
          <div className="mx-auto w-[95vw] max-w-none px-2 pt-14 pb-10 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/80">
              About
            </p>
            <h1 className="mt-3 max-w-4xl text-3xl font-extrabold tracking-tight md:text-4xl">
              Affordable automotive market intelligence, built by people who live
              in the data
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70 md:text-base">
              Race Auto Analytics gives analysts, suppliers, dealers, fleet and
              strategy teams a fast monthly read on vehicle sales data by
              country — OEM market share, EV and alternative-fuel trends, segment
              performance and a six-month forecast — at a price individual
              analysts and SMEs can actually afford.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="border-b border-white/10">
          <div className="mx-auto grid w-[95vw] max-w-none grid-cols-2 gap-4 px-2 py-8 sm:px-3 lg:grid-cols-4 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
            {STATS.map((s) => (
              <div
                key={s.v}
                className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-5"
              >
                <div className="text-2xl font-extrabold tracking-tight text-white">
                  {s.k}
                </div>
                <div className="mt-1 text-xs text-white/60">{s.v}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Story */}
        <section>
          <div className="mx-auto w-[95vw] max-w-none px-2 py-12 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 lg:col-span-2">
                <h2 className="text-xl font-bold tracking-tight">
                  A media brand&apos;s decade in automotive, turned into data
                </h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-white/70">
                  <p>
                    Race Auto Analytics is the market-intelligence arm of{" "}
                    <span className="text-white/90">Race Auto India</span>, a
                    long-running automotive media brand covering the industry
                    across passenger vehicles, commercial vehicles,
                    two-wheelers, three-wheelers, tractors and construction
                    equipment.
                  </p>
                  <p>
                    That newsroom gave us a front-row view of a gap in the
                    market: enterprise data platforms are powerful but priced
                    for the largest OEMs, while free public sources are raw and
                    fragmented. Analysts, suppliers, dealers and consultants in
                    the middle had nowhere affordable to turn for clean,
                    comparable, analyst-ready numbers.
                  </p>
                  <p>
                    So we built one — flash reports and forecasts with the
                    segment depth emerging markets actually need, released fast
                    (India lands on day 3 of the month), across 14 countries and
                    growing.
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
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
                    Contact us
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-white/85">
                  Company
                </h3>
                <div className="mt-4 space-y-2 text-sm text-white/70">
                  <p>Operated by Race Innovations Pvt Ltd.</p>
                  <p>Chennai, Tamil Nadu, India.</p>
                  <p className="text-white/50">GST 33AAFCR6885E1Z6</p>
                  <p className="text-white/50">CIN U73100TN2011PTC083486</p>
                  <p className="pt-2">
                    <a
                      href="mailto:info@raceautoanalytics.com"
                      className="text-blue-300 hover:text-blue-200"
                    >
                      info@raceautoanalytics.com
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
