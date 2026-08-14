import Link from "next/link";
import { SITE_URL } from "@/lib/seoRoutes";
import type { SegmentSeo } from "@/lib/flashSegmentSeo";
import { getLiveFlashCountryGroups } from "@/lib/flashReportLiveCountries";

/**
 * Server-rendered layer for the flash-report segment pages.
 *
 * The interactive page below this is a client component whose content only
 * exists after its effects run, so crawlers previously received ~104 words and
 * no <h1>. This renders the heading, scope, definitions, covered markets and
 * FAQ on the server — no client state, nothing that can change what the
 * interactive page does.
 */
export default async function SegmentSeoContent({ seo }: { seo: SegmentSeo }) {
  const url = `${SITE_URL}/flash-reports/${seo.path}`;

  // Live market list, same source as every other coverage surface.
  let groups: Awaited<ReturnType<typeof getLiveFlashCountryGroups>> = [];
  try {
    groups = await getLiveFlashCountryGroups();
  } catch {
    groups = [];
  }
  const totalMarkets = groups.reduce((n, g) => n + g.countries.length, 0);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: seo.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${seo.name} sales data by country`,
    description: seo.description,
    url,
    isAccessibleForFree: false,
    creator: {
      "@type": "Organization",
      name: "Race Auto Analytics",
      url: SITE_URL,
    },
    variableMeasured: [
      "Monthly sales volume",
      "OEM segment share",
      "Month-on-month change",
      "Year-on-year change",
      "EV / alternative-fuel share",
    ],
    temporalCoverage: "Monthly",
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Flash Reports",
        item: `${SITE_URL}/flash-reports/overview`,
      },
      { "@type": "ListItem", position: 3, name: seo.name, item: url },
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

      <section className="mx-auto w-[95vw] max-w-none px-2 pt-6 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
        <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,.45)] md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">
            Monthly flash report
          </p>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
            {seo.name} sales data by country
          </h1>

          {seo.intro.map((p, i) => (
            <p
              key={i}
              className="mt-4 max-w-5xl text-sm leading-7 text-white/75 md:text-base"
            >
              {p}
            </p>
          ))}

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-white/90">
                What this report includes
              </h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-white/70">
                {seo.includes.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-white/90">
                Definitions
              </h2>
              <dl className="mt-3 space-y-3 text-sm leading-6">
                {seo.definitions.map(([term, def]) => (
                  <div key={term}>
                    <dt className="font-semibold text-white/90">{term}</dt>
                    <dd className="text-white/65">{def}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {totalMarkets > 0 && (
            <div className="mt-6 border-t border-white/10 pt-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-white/90">
                Markets covered ({totalMarkets})
              </h2>
              <p className="mt-2 text-xs leading-6 text-white/55">
                Coverage varies by segment and month. Open a market for its full
                flash report.
              </p>
              <div className="mt-3 space-y-3">
                {groups.map((g) => (
                  <div key={g.key}>
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-200/70">
                      {g.label}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {g.countries.map((c) => (
                        <Link
                          key={c.slug}
                          href={`/flash-reports/country-data/${c.slug}`}
                          prefetch={false}
                          className="rounded-lg border border-white/10 bg-slate-900/60 px-2.5 py-1 text-xs text-white/80 transition hover:bg-white/10"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-white/10 pt-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-white/90">
              Frequently asked questions
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              {seo.faqs.map((f) => (
                <div key={f.q}>
                  <h3 className="text-sm font-semibold text-white/90">{f.q}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-white/65">{f.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5">
            <Link
              href="/flash-reports/overview"
              prefetch={false}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              All flash reports
            </Link>
            <Link
              href="/methodology"
              prefetch={false}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              Methodology
            </Link>
            <Link
              href="/subscription"
              prefetch={false}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Subscribe for full data
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
