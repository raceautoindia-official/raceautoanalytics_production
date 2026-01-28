import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

// Table expected:
// home_latest_insights(id PK AUTO, tag, delta, title, body, publish_date, is_active, sort_order, created_at, updated_at)

export async function GET() {
  try {
    const [rows] = await db.execute(
      `SELECT id, tag, delta, title, body, publish_date, is_active, sort_order, updated_at
       FROM home_latest_insights
       ORDER BY sort_order ASC, publish_date DESC, id DESC`,
    );
    return NextResponse.json(rows);
  } catch (e: any) {
    console.error("[admin/home-content/latest-insights][GET]", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = body?.item ?? body; // ✅ accept both shapes
    if (!payload?.title || !payload?.body) {
      return NextResponse.json(
        { error: "title and body are required" },
        { status: 400 },
      );
    }

    const id = payload.id ? Number(payload.id) : null;
    const tag = String(payload.tag || "Insight");
    const delta = String(payload.delta || "");
    const title = String(payload?.title || "").trim();
    const bodyText = String(payload?.body || "").trim();
    const isActive = payload.is_active ? 1 : 0;
    const sortOrder = Number.isFinite(payload.sort_order)
      ? Number(payload.sort_order)
      : 0;

    // publish_date can be null; default to today
    const publishDateRaw = payload.publish_date
      ? String(payload.publish_date)
      : null;

    if (id) {
      await db.execute(
        `UPDATE home_latest_insights
         SET tag=?, delta=?, title=?, body=?, publish_date=?, is_active=?, sort_order=?, updated_at=NOW()
         WHERE id=?`,
        [tag, delta, title, bodyText, publishDateRaw, isActive, sortOrder, id],
      );
    } else {
      await db.execute(
        `INSERT INTO home_latest_insights
         (tag, delta, title, body, publish_date, is_active, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, COALESCE(?, CURDATE()), ?, ?, NOW(), NOW())`,
        [tag, delta, title, bodyText, publishDateRaw, isActive, sortOrder],
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[admin/home-content/latest-insights][POST]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    await db.execute(`DELETE FROM home_latest_insights WHERE id=?`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[admin/home-content/latest-insights][DELETE]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
