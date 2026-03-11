// File: app/api/questions/route.js
import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

function normCountry(v) {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return s || null;
}

async function getGraphContext(graphId) {
  const [rows] = await db.query(
    "SELECT context FROM graphs WHERE id = ? LIMIT 1",
    [Number(graphId)]
  );
  return String(rows?.[0]?.context || "forecast").toLowerCase();
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const graphIdRaw = url.searchParams.get("graphId");
    const countryParam = normCountry(url.searchParams.get("country"));

    // If no graphId -> keep old behavior (return all questions)
    if (!graphIdRaw) {
      const [rows] = await db.query(
        "SELECT * FROM questions ORDER BY graph_id ASC, id ASC"
      );
      return NextResponse.json(rows || []);
    }

    const graphId = Number(graphIdRaw);
    const ctx = await getGraphContext(graphId);

    // Flash: filter by country (default india)
    if (ctx === "flash") {
      const country = countryParam || "india";
      const [rows] = await db.query(
        "SELECT * FROM questions WHERE graph_id = ? AND country = ? ORDER BY id ASC",
        [graphId, country]
      );
      return NextResponse.json(rows || []);
    }

    // Forecast: old behavior (ignore country)
    const [rows] = await db.query(
      "SELECT * FROM questions WHERE graph_id = ? ORDER BY id ASC",
      [graphId]
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
    const body = await req.json();
    const { text, weight, type, graphId } = body;
    const countryParam = normCountry(body?.country);

    if (!text || weight == null || !type || !graphId) {
      return NextResponse.json(
        { error: "Missing fields (text, weight, type, graphId)" },
        { status: 400 }
      );
    }

    const ctx = await getGraphContext(graphId);

    // Flash: store country (default india)
    if (ctx === "flash") {
      const country = countryParam || "india";

      const [result] = await db.query(
        "INSERT INTO questions (text, weight, type, graph_id, country) VALUES (?, ?, ?, ?, ?)",
        [text, Number(weight), String(type), Number(graphId), country]
      );

      const [newRow] = await db.query("SELECT * FROM questions WHERE id = ?", [
        result.insertId,
      ]);

      return NextResponse.json(newRow?.[0] ?? null, { status: 201 });
    }

    // Forecast: keep old behavior, store country as NULL
    const [result] = await db.query(
      "INSERT INTO questions (text, weight, type, graph_id, country) VALUES (?, ?, ?, ?, NULL)",
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