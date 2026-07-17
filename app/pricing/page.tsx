import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { SITE_URL } from "@/lib/seoRoutes";
import { getPricingPlans } from "@/lib/pricing";
import PricingCards from "./PricingCards";

export const revalidate = 600; // reflect plan/price edits within ~10 min

const TITLE = "Pricing | Race Auto Analytics";
const DESCRIPTION =
  "Transparent pricing for automotive flash reports and forecasts across 14 countries and 9 vehicle segments — a fraction of enterprise platforms that start at $5,100/year.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/pricing`,
    type: "website",
    siteName: "RACE Auto Analytics",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQ = [
  {
    q: "What does a subscription include?",
    a: "Monthly flash reports with vehicle sales data, OEM market share, EV and alternative-fuel trends and segment-level views for your selected countries, plus the six-month forecast tools where available.",
  },
  {
    q: "How is this different from enterprise data platforms?",
    a: "Enterprise automotive data platforms typically start around USD 5,100/year and scale into five to six figures. Race Auto Analytics gives analysts, suppliers, dealers and consultants the segment depth they need — including two-wheelers, three-wheelers, tractors and construction equipment — at a fraction of that.",
  },
  {
    q: "Can I subscribe to a single country?",
    a: "Yes. The entry plan covers one country; higher tiers add more country slots (up to 11), so you only pay for the markets you track.",
  },
  {
    q: "Monthly or annual billing?",
    a: "Both. Annual billing is discounted versus paying monthly. You can start monthly and switch later.",
  },
];

export default async function PricingPage() {
  const plans = await getPricingPlans();

  const pricingJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Race Auto Analytics subscription",
    description: DESCRIPTION,
    brand: { "@type": "Brand", name: "Race Auto Analytics" },
    ...(plans.length
      ? {
          offers: plans.map((p) => ({
            "@type": "Offer",
            name: p.title,
            price: String(p.annualPrice || p.monthlyPrice || 0),
            priceCurrency: "INR",
            url: `${SITE_URL}/subscription`,
            availability: "https://schema.org/InStock",
          })),
        }
      : {}),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <NavBar />
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="border-b border-white/10">
          <div className="mx-auto w-[95vw] max-w-none px-2 pt-14 pb-4 text-center sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/80">
              Pricing
            </p>
            <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-extrabold tracking-tight md:text-4xl">
              Automotive market intelligence at a price you can actually afford
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/70 md:text-base">
              Flash reports and forecasts across 14 countries and 9 vehicle
              segments — including two-wheelers, three-wheelers, tractors and
              construction equipment. A fraction of enterprise platforms that
              start at <span className="text-white/90">$5,100/year</span>.
            </p>
          </div>
        </section>

        <section className="pb-8 pt-12">
          <div className="mx-auto w-[95vw] max-w-none px-2 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
            {plans.length ? (
              <PricingCards plans={plans} />
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-10 text-center text-white/70">
                Pricing is being updated. Please{" "}
                <Link href="/subscription" className="text-blue-300 underline">
                  view plans
                </Link>{" "}
                or contact us.
              </div>
            )}
            <p className="mt-6 text-center text-xs text-white/45">
              Switch INR / USD above. USD is indicative — billing is processed in
              INR. GST / taxes extra where applicable.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="pb-20">
          <div className="mx-auto w-[95vw] max-w-none px-2 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
            <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 md:p-8">
              <h2 className="text-xl font-bold tracking-tight">
                Pricing FAQ
              </h2>
              <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
                {FAQ.map((f) => (
                  <div key={f.q}>
                    <h3 className="text-sm font-semibold text-white/95">
                      {f.q}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/65">{f.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
