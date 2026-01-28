// File: app/api/questions/route.js
import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const graphId = url.searchParams.get("graphId");

    const [rows] = await db.query(
      graphId
        ? "SELECT * FROM questions WHERE graph_id = ? ORDER BY id ASC"
        : "SELECT * FROM questions ORDER BY graph_id ASC, id ASC",
      graphId ? [Number(graphId)] : []
    );

    return NextResponse.json(rows || []);
  } catch (err) {
    console.error("GET /api/questions error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { text, weight, type, graphId } = await req.json();

    if (!text || weight == null || !type || !graphId) {
      return NextResponse.json(
        { error: "Missing fields (text, weight, type, graphId)" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      "INSERT INTO questions (text, weight, type, graph_id) VALUES (?, ?, ?, ?)",
      [text, Number(weight), String(type), Number(graphId)]
    );

    const [newRow] = await db.query("SELECT * FROM questions WHERE id = ?", [
      result.insertId,
    ]);

    return NextResponse.json(newRow?.[0] ?? null, { status: 201 });
  } catch (err) {
    console.error("POST /api/questions error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await db.query("DELETE FROM questions WHERE id = ?", [Number(id)]);
    return NextResponse.json({ message: "Deleted" }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/questions error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
