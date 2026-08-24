import type { FaqItem } from "@/lib/automotiveFaq";

/**
 * Server-rendered FAQ block with matching FAQPage structured data.
 *
 * Built on native <details>/<summary>: no client JavaScript, and every answer
 * sits in the server HTML whether or not the item is open — so crawlers and
 * answer engines read the full text, which a JS-driven accordion would hide
 * behind hydration.
 *
 * The schema is generated from the SAME array that renders, so the markup can
 * never describe content a visitor cannot see (marking up invisible content
 * breaks Google's structured-data rules).
 *
 * Note on expectations: since Google's August 2023 change, FAQ rich results
 * are limited to government and health sites, so this will not add snippets to
 * ordinary listings. It still earns its place — it answers real queries on the
 * page, deepens topical coverage for the page's target keywords, and gives
 * AI answer engines clean question/answer pairs to quote.
 */
export default function FaqSection({
  items,
  heading = "Frequently asked questions",
  intro,
  id = "faq",
}: {
  items: FaqItem[];
  heading?: string;
  intro?: string;
  id?: string;
}) {
  if (!items.length) return null;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  // Two balanced columns on large screens, preserving reading order.
  const mid = Math.ceil(items.length / 2);
  const columns = [items.slice(0, mid), items.slice(mid)];

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="bg-slate-950 pb-12 pt-4 text-white md:pb-16"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="mx-auto w-[95vw] max-w-none px-2 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
        <div className="rounded-3xl border border-white/10 bg-[#0b141f]/76 p-6 shadow-[0_18px_60px_rgba(0,0,0,.52)] md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">
            Questions &amp; answers
          </p>
          <h2
            id={`${id}-heading`}
            className="mt-3 text-2xl font-extrabold leading-tight tracking-tight md:text-3xl"
          >
            {heading}
          </h2>
          {intro ? (
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/70">
              {intro}
            </p>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 lg:grid-cols-2">
            {columns.map((column, ci) => (
              <div key={ci} className="space-y-3">
                {column.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-xl border border-white/10 bg-slate-900/50 transition hover:border-white/20"
                  >
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 text-sm font-semibold text-white/90 [&::-webkit-details-marker]:hidden">
                      <h3 className="text-sm font-semibold leading-6">
                        {item.q}
                      </h3>
                      <span
                        aria-hidden
                        className="mt-0.5 shrink-0 text-lg leading-none text-blue-300/80 transition-transform duration-200 group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <div className="px-4 pb-4 text-sm leading-7 text-white/70">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
