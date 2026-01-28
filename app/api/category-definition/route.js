// File: app/api/category-definition/route.js
import pool from '@/lib/db';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");

  if (!categoryId) {
    return new Response(JSON.stringify({ error: "Missing categoryId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const [rows] = await pool.query(
      "SELECT definition FROM category_definitions WHERE category_id = ?",
      [categoryId]
    );

    if (rows.length > 0) {
      return new Response(JSON.stringify({ definition: rows[0].definition }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ definition: "" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req) {
  try {
    const { categoryId, definition } = await req.json();

    if (!categoryId || typeof definition !== "string") {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const [rows] = await pool.query(
      "SELECT 1 FROM category_definitions WHERE category_id = ?",
      [categoryId]
    );

    if (rows.length > 0) {
      await pool.query(
        "UPDATE category_definitions SET definition = ? WHERE category_id = ?",
        [definition, categoryId]
      );
    } else {
      await pool.query(
        "INSERT INTO category_definitions (category_id, definition) VALUES (?, ?)",
        [categoryId, definition]
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
