import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/lib/seoRoutes";
import {
  getPublishedInsightBySlug,
  coverUrl,
  parseTags,
} from "@/lib/insights";

export const dynamic = "force-dynamic";

type PageProps = { params: { slug: string } };

const ORG = "RACE Auto Analytics";

function isoOrNull(value: string | Date | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function formatDate(value: string | Date | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const post = await getPublishedInsightBySlug(params.slug);
  if (!post) {
    return {
      title: "Insight not found | Race Auto Analytics",
      robots: { index: false, follow: false },
    };
  }
  const title = `${post.meta_title || post.title} | Race Auto Analytics`;
  const description =
    post.meta_description ||
    post.excerpt ||
    `${post.title} — automotive market analysis from Race Auto Analytics.`;
  const canonical = `/insights/${post.slug}`;
  const image = coverUrl(post.cover_image_key);

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${canonical}`,
      type: "article",
      siteName: ORG,
      ...(image ? { images: [{ url: image }] } : {}),
      ...(isoOrNull(post.published_at)
        ? { publishedTime: isoOrNull(post.published_at)! }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

const BODY_CSS = `
.insight-body{color:rgba(255,255,255,.82);font-size:1.02rem;line-height:1.8}
.insight-body p{margin:0 0 1.15rem}
.insight-body h2{color:#fff;font-size:1.5rem;font-weight:700;margin:2rem 0 .9rem;letter-spacing:-.01em}
.insight-body h3{color:#fff;font-size:1.2rem;font-weight:700;margin:1.6rem 0 .7rem}
.insight-body h4{color:#fff;font-size:1.05rem;font-weight:700;margin:1.3rem 0 .6rem}
.insight-body a{color:#7ba7ff;text-decoration:underline;text-underline-offset:2px}
.insight-body a:hover{color:#a9c5ff}
.insight-body ul,.insight-body ol{margin:0 0 1.15rem 1.35rem}
.insight-body ul{list-style:disc}.insight-body ol{list-style:decimal}
.insight-body li{margin:.4rem 0}
.insight-body blockquote{border-left:3px solid rgba(123,167,255,.5);padding:.4rem 0 .4rem 1rem;margin:1.4rem 0;color:rgba(255,255,255,.7);font-style:italic}
.insight-body strong,.insight-body b{color:#fff;font-weight:700}
.insight-body hr{border:0;border-top:1px solid rgba(255,255,255,.12);margin:2rem 0}
.insight-body img{max-width:100%;border-radius:.6rem;margin:1.2rem 0}
.insight-body pre{background:rgba(255,255,255,.06);padding:1rem;border-radius:.6rem;overflow-x:auto;margin:0 0 1.15rem}
.insight-body .ql-align-center{text-align:center}
.insight-body .ql-align-right{text-align:right}
.insight-body .ql-align-justify{text-align:justify}
`;

export default async function InsightDetailPage({ params }: PageProps) {
  const post = await getPublishedInsightBySlug(params.slug);
  if (!post) notFound();

  const canonical = `${SITE_URL}/insights/${post.slug}`;
  const image = coverUrl(post.cover_image_key);
  const tags = parseTags(post.tags);
  const published = isoOrNull(post.published_at);
  const modified = isoOrNull(post.updated_at) || published;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || post.meta_description || post.title,
    url: canonical,
    mainEntityOfPage: canonical,
    ...(image ? { image: [image] } : {}),
    ...(published ? { datePublished: published } : {}),
    ...(modified ? { dateModified: modified } : {}),
    author: { "@type": "Organization", name: post.author || ORG, url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: ORG,
      url: SITE_URL,
    },
    ...(post.category_name ? { articleSection: post.category_name } : {}),
    ...(tags.length ? { keywords: tags.join(", ") } : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: ORG, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Insights", item: `${SITE_URL}/insights` },
      { "@type": "ListItem", position: 3, name: post.title, item: canonical },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <style dangerouslySetInnerHTML={{ __html: BODY_CSS }} />

      <article className="bg-slate-950 pb-20">
        <div className="mx-auto w-full max-w-4xl px-4 pt-10 sm:px-6">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs text-white/50">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-white/80">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href="/insights" className="hover:text-white/80">
                  Insights
                </Link>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <header className="mt-5 border-b border-white/10 pb-7">
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-blue-300/80">
              {post.category_name && (
                <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-blue-200">
                  {post.category_name}
                </span>
              )}
              {post.published_at && (
                <span className="text-white/45">
                  {formatDate(post.published_at)}
                </span>
              )}
            </div>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-white md:text-4xl">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="mt-4 text-lg leading-8 text-white/70">
                {post.excerpt}
              </p>
            )}
            <div className="mt-5 text-sm text-white/50">
              By <span className="text-white/75">{post.author || ORG}</span>
            </div>
          </header>

          {/* Cover */}
          {image && (
            <div className="mt-7 overflow-hidden rounded-2xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={post.title}
                className="w-full object-cover"
              />
            </div>
          )}

          {/* Body */}
          {post.body_html && (
            <div
              className="insight-body mt-8"
              dangerouslySetInnerHTML={{ __html: post.body_html }}
            />
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2 border-t border-white/10 pt-6">
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Back link */}
          <div className="mt-10">
            <Link
              href="/insights"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              ← All insights
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
