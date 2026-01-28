import pool from "@/lib/db";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  try {
    if (email) {
      const [rows] = await pool.query(
        `SELECT email, plan_name, country_id FROM forecast_user_countries WHERE email = ?`,
        [email]
      );
      if (!rows.length) {
        return new Response(null, { status: 404 });
      }
      return new Response(JSON.stringify(rows[0]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      // Fetch all users with country name instead of ID
      const [rows] = await pool.query(`
        SELECT 
          fuc.email, 
          fuc.plan_name, 
          fuc.country_id, 
          fac.name AS country_name
        FROM forecast_user_countries fuc
        LEFT JOIN forecast_available_countries fac
        ON fuc.country_id = fac.id
        ORDER BY fuc.email ASC
      `);
      return new Response(JSON.stringify(rows), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("GET /api/user-country error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}

export async function POST(req) {
  try {
    const { email, plan_name, country_id } = await req.json();
    if (!email || !plan_name || !country_id) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
      });
    }
    // Upsert
    await pool.query(
      `INSERT INTO forecast_user_countries (email, plan_name, country_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE plan_name = VALUES(plan_name), country_id = VALUES(country_id), updated_at = CURRENT_TIMESTAMP`,
      [email, plan_name, country_id]
    );
    return new Response(JSON.stringify({ message: "Saved" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("POST /api/user-country error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
