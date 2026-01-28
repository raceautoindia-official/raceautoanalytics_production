import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

// Table expected:
// home_optional_insights(id PK AUTO, title, body, icon, theme, is_active, sort_order, created_at, updated_at)

export async function GET() {
  try {
    const [rows] = await db.execute(
      `SELECT id, title, body, icon, theme, is_active, sort_order, updated_at
       FROM home_optional_insights
       ORDER BY sort_order ASC, id ASC`,
    );
    return NextResponse.json(rows);
  } catch (e: any) {
    console.error("[admin/home-content/optional-insights][GET]", e);
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
    const title = String(payload?.title || "").trim();
    const bodyText = String(payload?.body || "").trim();
    const icon = String(payload.icon || "Activity");
    const theme = String(payload.theme || "slate");
    const isActive = payload.is_active ? 1 : 0;
    const sortOrder = Number.isFinite(payload.sort_order)
      ? Number(payload.sort_order)
      : 0;

    if (id) {
      await db.execute(
        `UPDATE home_optional_insights
         SET title=?, body=?, icon=?, theme=?, is_active=?, sort_order=?, updated_at=NOW()
         WHERE id=?`,
        [title, bodyText, icon, theme, isActive, sortOrder, id],
      );
    } else {
      await db.execute(
        `INSERT INTO home_optional_insights
         (title, body, icon, theme, is_active, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [title, bodyText, icon, theme, isActive, sortOrder],
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[admin/home-content/optional-insights][POST]", e);
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
    await db.execute(`DELETE FROM home_optional_insights WHERE id=?`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[admin/home-content/optional-insights][DELETE]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
