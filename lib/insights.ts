import db from "@/lib/db";

// Server-only data access for the Insights blog. Public pages (server components)
// call these directly; there is no public API route.

export type InsightCategory = {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
};

export type InsightListItem = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_key: string | null;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  tags: string | null;
  author: string;
  published_at: string | Date | null;
};

export type InsightFull = InsightListItem & {
  body_html: string | null;
  country_slug: string | null;
  meta_title: string | null;
  meta_description: string | null;
  status: string;
  updated_at: string | Date | null;
};

const PUB_URL = process.env.NEXT_PUBLIC_S3_BUCKET_URL || "";

/** Build a public image URL from a stored S3 key (or null). */
export function coverUrl(key?: string | null): string | null {
  return key ? `${PUB_URL}${key}` : null;
}

/** Split the comma-separated tags column into a trimmed array. */
export function parseTags(tags?: string | null): string[] {
  return String(tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

const PUBLISHED =
  "i.status = 'published' AND i.published_at IS NOT NULL AND i.published_at <= NOW()";

export async function listPublishedInsights(
  limit = 100,
): Promise<InsightListItem[]> {
  const lim = Math.max(1, Math.min(500, Math.floor(limit) || 100)); // inline (LIMIT ? is flaky in mysql2)
  try {
    const [rows]: any = await db.execute(
      `SELECT i.id, i.slug, i.title, i.excerpt, i.cover_image_key, i.category_id,
              c.name AS category_name, c.slug AS category_slug,
              i.tags, i.author, i.published_at
       FROM insights i
       LEFT JOIN insight_categories c ON c.id = i.category_id
       WHERE ${PUBLISHED}
       ORDER BY i.published_at DESC, i.id DESC
       LIMIT ${lim}`,
    );
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.error("listPublishedInsights error:", e);
    return [];
  }
}

export async function getPublishedInsightBySlug(
  slug: string,
): Promise<InsightFull | null> {
  try {
    const [rows]: any = await db.execute(
      `SELECT i.*, c.name AS category_name, c.slug AS category_slug
       FROM insights i
       LEFT JOIN insight_categories c ON c.id = i.category_id
       WHERE i.slug = ? AND ${PUBLISHED}
       LIMIT 1`,
      [String(slug || "").toLowerCase().trim()],
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    return row || null;
  } catch (e) {
    console.error("getPublishedInsightBySlug error:", e);
    return null;
  }
}

/** Published slugs for generateStaticParams + sitemap. */
export async function publishedInsightSlugs(): Promise<
  { slug: string; updated_at: string | Date | null }[]
> {
  try {
    const [rows]: any = await db.execute(
      `SELECT slug, updated_at FROM insights i WHERE ${PUBLISHED} ORDER BY i.published_at DESC`,
    );
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.error("publishedInsightSlugs error:", e);
    return [];
  }
}

export async function listCategories(): Promise<InsightCategory[]> {
  try {
    const [rows]: any = await db.execute(
      `SELECT id, name, slug, sort_order FROM insight_categories
       ORDER BY sort_order ASC, name ASC`,
    );
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.error("listCategories error:", e);
    return [];
  }
}
