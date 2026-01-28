import pool from "@/lib/db";

// GET: fetch all countries
export async function GET() {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, code, created_at FROM forecast_available_countries ORDER BY name ASC`
    );
    return new Response(JSON.stringify(rows), { status: 200 });
  } catch (err) {
    console.error("GET countries error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// POST: add a new country
export async function POST(req) {
  try {
    const { name, code } = await req.json();
    if (!name) {
      return new Response(JSON.stringify({ error: "Name is required" }), { status: 400 });
    }

    await pool.query(
      `INSERT INTO forecast_available_countries (name, code) VALUES (?, ?)`,
      [name, code || null]
    );

    return new Response(JSON.stringify({ message: "Country added" }), { status: 201 });
  } catch (err) {
    console.error("POST country error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
