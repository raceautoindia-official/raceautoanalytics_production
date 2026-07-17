import { NextResponse } from "next/server";
import db from "@/lib/db";
import sanitizeHtml from "sanitize-html";

export const dynamic = "force-dynamic";

// Admin CRUD for insight posts. Protected by middleware basic-auth on
// /api/admin/insights. GET lists ALL (incl. drafts); POST upserts; DELETE ?id=.

const SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "b", "em", "i", "u", "s", "blockquote", "ol", "ul",
    "li", "a", "span", "h1", "h2", "h3", "h4", "h5", "h6", "pre", "code", "hr",
    "sub", "sup",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    span: ["style", "class"],
    p: ["style", "class"],
    "*": ["class"],
  },
  allowedStyles: {
    "*": {
      color: [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/, /^[a-z-]+$/i],
      "background-color": [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/, /^[a-z-]+$/i],
      "text-align": [/^(left|right|center|justify)$/],
    },
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      rel: "noopener noreferrer",
      target: "_blank",
    }),
  },
};

function slugify(s: string): string {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function uniqueSlug(base: string, excludeId: number | null): Promise<string> {
  const root = base || "post";
  let candidate = root;
  let n = 1;
  // Bounded loop; the UNIQUE key is the ultimate guard.
  while (n < 200) {
    const [rows]: any = excludeId
      ? await db.execute(
          `SELECT id FROM insights WHERE slug = ? AND id <> ? LIMIT 1`,
          [candidate, excludeId],
        )
      : await db.execute(`SELECT id FROM insights WHERE slug = ? LIMIT 1`, [
          candidate,
        ]);
    if (!Array.isArray(rows) || rows.length === 0) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
  return `${root}-${Date.now()}`;
}

function toNullableInt(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

function toDateTimeOrNull(v: any): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace("T", " "); // MySQL DATETIME
}

export async function GET() {
  try {
    const [rows] = await db.execute(
      `SELECT i.id, i.slug, i.title, i.excerpt, i.cover_image_key, i.category_id,
              c.name AS category_name, i.tags, i.country_slug, i.author,
              i.meta_title, i.meta_description, i.status, i.published_at,
              i.body_html, i.updated_at
       FROM insights i
       LEFT JOIN insight_categories c ON c.id = i.category_id
       ORDER BY COALESCE(i.published_at, i.created_at) DESC, i.id DESC`,
    );
    return NextResponse.json(rows);
  } catch (e: any) {
    console.error("[admin/insights][GET]", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = body?.item ?? body;

    const title = String(payload?.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const id = payload.id ? Number(payload.id) : null;
    const providedSlug = slugify(payload.slug || "");
    const slug = await uniqueSlug(providedSlug || slugify(title), id);

    const excerpt = payload.excerpt ? String(payload.excerpt).slice(0, 500) : null;
    const bodyHtml = payload.body_html
      ? sanitizeHtml(String(payload.body_html), SANITIZE_OPTS)
      : null;
    const coverKey = payload.cover_image_key
      ? String(payload.cover_image_key)
      : null;
    const categoryId = toNullableInt(payload.category_id);
    const tags = payload.tags ? String(payload.tags).slice(0, 500) : null;
    const countrySlug = payload.country_slug
      ? String(payload.country_slug).toLowerCase().trim()
      : null;
    const author = String(payload.author || "Race Auto Analytics").slice(0, 120);
    const metaTitle = payload.meta_title
      ? String(payload.meta_title).slice(0, 300)
      : null;
    const metaDescription = payload.meta_description
      ? String(payload.meta_description).slice(0, 500)
      : null;
    const status = payload.status === "published" ? "published" : "draft";

    // Auto-stamp published_at the first time it goes live; honor an explicit value.
    let publishedAt = toDateTimeOrNull(payload.published_at);
    if (status === "published" && !publishedAt) {
      publishedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
    }
    if (status === "draft") publishedAt = toDateTimeOrNull(payload.published_at); // keep if set

    if (id) {
      await db.execute(
        `UPDATE insights SET
           slug=?, title=?, excerpt=?, body_html=?, cover_image_key=?, category_id=?,
           tags=?, country_slug=?, author=?, meta_title=?, meta_description=?,
           status=?, published_at=?, updated_at=NOW()
         WHERE id=?`,
        [
          slug, title, excerpt, bodyHtml, coverKey, categoryId, tags, countrySlug,
          author, metaTitle, metaDescription, status, publishedAt, id,
        ],
      );
      return NextResponse.json({ ok: true, id, slug });
    }

    const [result]: any = await db.execute(
      `INSERT INTO insights
         (slug, title, excerpt, body_html, cover_image_key, category_id, tags,
          country_slug, author, meta_title, meta_description, status, published_at,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        slug, title, excerpt, bodyHtml, coverKey, categoryId, tags, countrySlug,
        author, metaTitle, metaDescription, status, publishedAt,
      ],
    );
    return NextResponse.json({ ok: true, id: result?.insertId ?? null, slug });
  } catch (e: any) {
    console.error("[admin/insights][POST]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    await db.execute(`DELETE FROM insights WHERE id=?`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[admin/insights][DELETE]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
