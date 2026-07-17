import Link from "next/link";
import { listPublishedInsights, coverUrl } from "@/lib/insights";

// SSR homepage section: latest published insights. Fresh content + internal
// links to /insights and each post = an SEO boost for the whole domain.
// Renders nothing when there are no published posts (or the DB is unavailable).

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

export default async function InsightsHighlights() {
  const posts = await listPublishedInsights(3);
  if (!posts.length) return null;

  return (
    <section className="bg-slate-950 pb-12 pt-2 text-white">
      <div className="mx-auto w-[95vw] max-w-none px-2 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">
              Insights
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">
              Latest automotive market analysis
            </h2>
          </div>
          <Link
            href="/insights"
            prefetch={false}
            className="hidden shrink-0 items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10 sm:inline-flex"
          >
            View all insights →
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-blue-300/80">
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
                  <h3 className="mt-2 text-base font-bold leading-snug tracking-tight text-white">
                    {p.title}
                  </h3>
                  {p.excerpt && (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/65">
                      {p.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-6 sm:hidden">
          <Link
            href="/insights"
            prefetch={false}
            className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
          >
            View all insights →
          </Link>
        </div>
      </div>
    </section>
  );
}
