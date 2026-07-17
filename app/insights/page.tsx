import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/seoRoutes";
import { listPublishedInsights, coverUrl } from "@/lib/insights";

export const dynamic = "force-dynamic"; // reflect newly published posts immediately

const TITLE =
  "Automotive Market Insights & Analysis | Race Auto Analytics";
const DESCRIPTION =
  "Expert analysis on automotive sales, OEM market share, EV trends and country-level vehicle data — from the Race Auto Analytics research team.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/insights" },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/insights`,
    type: "website",
    siteName: "RACE Auto Analytics",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

function formatDate(value: string | Date | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function InsightsIndexPage() {
  const posts = await listPublishedInsights(60);

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Race Auto Analytics Insights",
    description: DESCRIPTION,
    url: `${SITE_URL}/insights`,
    publisher: {
      "@type": "Organization",
      name: "RACE Auto Analytics",
      url: SITE_URL,
    },
    blogPost: posts.slice(0, 20).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${SITE_URL}/insights/${p.slug}`,
      ...(p.published_at
        ? { datePublished: new Date(p.published_at).toISOString() }
        : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />

      <section className="border-b border-white/10 bg-slate-950">
        <div className="mx-auto w-[95vw] max-w-none px-2 pt-14 pb-10 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/80">
            Insights
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-extrabold tracking-tight md:text-4xl">
            Automotive market insights &amp; analysis
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70 md:text-base">
            Monthly reads on vehicle sales, OEM market share, EV adoption and
            country-level demand — written by the Race Auto Analytics research
            team from the same data behind our flash reports and forecasts.
          </p>
        </div>
      </section>

      <section className="bg-slate-950 pb-20 pt-8">
        <div className="mx-auto w-[95vw] max-w-none px-2 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-10 text-center text-white/60">
              New insights are on the way. Check back soon.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => {
                const cover = coverUrl(p.cover_image_key);
                return (
                  <Link
                    key={p.id}
                    href={`/insights/${p.slug}`}
                    prefetch={false}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b141f]/70 shadow-[0_12px_40px_rgba(0,0,0,.45)] transition hover:border-white/20 hover:bg-[#0b141f]"
                  >
                    <div className="aspect-[16/9] w-full overflow-hidden bg-slate-900">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover}
                          alt={p.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/20">
                          <span className="text-xs uppercase tracking-widest">
                            Race Auto Analytics
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-blue-300/80">
                        {p.category_name && <span>{p.category_name}</span>}
                        {p.category_name && p.published_at && (
                          <span className="text-white/25">•</span>
                        )}
                        {p.published_at && (
                          <span className="text-white/40">
                            {formatDate(p.published_at)}
                          </span>
                        )}
                      </div>
                      <h2 className="mt-2 text-lg font-bold leading-snug tracking-tight text-white group-hover:text-white">
                        {p.title}
                      </h2>
                      {p.excerpt && (
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/65">
                          {p.excerpt}
                        </p>
                      )}
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-300 transition group-hover:gap-2">
                        Read insight →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
