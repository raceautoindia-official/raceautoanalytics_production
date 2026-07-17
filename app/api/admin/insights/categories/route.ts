import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

// Admin-managed insight categories. Protected by middleware basic-auth.
// GET list; POST upsert {id?, name, sort_order}; DELETE ?id= (unlinks posts).

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
  const root = base || "category";
  let candidate = root;
  let n = 1;
  while (n < 200) {
    const [rows]: any = excludeId
      ? await db.execute(
          `SELECT id FROM insight_categories WHERE slug = ? AND id <> ? LIMIT 1`,
          [candidate, excludeId],
        )
      : await db.execute(
          `SELECT id FROM insight_categories WHERE slug = ? LIMIT 1`,
          [candidate],
        );
    if (!Array.isArray(rows) || rows.length === 0) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
  return `${root}-${Date.now()}`;
}

export async function GET() {
  try {
    const [rows] = await db.execute(
      `SELECT id, name, slug, sort_order FROM insight_categories
       ORDER BY sort_order ASC, name ASC`,
    );
    return NextResponse.json(rows);
  } catch (e: any) {
    console.error("[admin/insights/categories][GET]", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = body?.item ?? body;
    const name = String(payload?.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const id = payload.id ? Number(payload.id) : null;
    const sortOrder = Number.isFinite(payload.sort_order)
      ? Number(payload.sort_order)
      : 0;
    const slug = await uniqueSlug(slugify(payload.slug || name), id);

    if (id) {
      await db.execute(
        `UPDATE insight_categories SET name=?, slug=?, sort_order=?, updated_at=NOW() WHERE id=?`,
        [name, slug, sortOrder, id],
      );
      return NextResponse.json({ ok: true, id, slug });
    }
    const [result]: any = await db.execute(
      `INSERT INTO insight_categories (name, slug, sort_order) VALUES (?, ?, ?)`,
      [name, slug, sortOrder],
    );
    return NextResponse.json({ ok: true, id: result?.insertId ?? null, slug });
  } catch (e: any) {
    console.error("[admin/insights/categories][POST]", e);
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
    // Unlink posts in this category (category_id is a soft reference, no FK).
    await db.execute(`UPDATE insights SET category_id=NULL WHERE category_id=?`, [id]);
    await db.execute(`DELETE FROM insight_categories WHERE id=?`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[admin/insights/categories][DELETE]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
