// app/api/formatHierarchy/route.js
import pool from '../../../lib/db';

export async function GET(req) {
  try {
    const [rows] = await pool.query('SELECT * FROM format_hierarchy ORDER BY created_at');
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { parent_id, name, chart_id } = body;
    console.log(name , parent_id,chart_id);

    if (!name) {
      return new Response(JSON.stringify({ error: 'Node name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // CASE 1: Root node creation (no parent)
    if (!parent_id) {
      const [result] = await pool.query(
        'INSERT INTO format_hierarchy (parent_id, name) VALUES (?, ?)',
        [null, name]
      );

      const newId = result.insertId;
      console.log(newId);
      if (!newId) {
        return new Response(JSON.stringify({ error: 'Failed to insert root node' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Set chart_id = id
      await pool.query('UPDATE format_hierarchy SET chart_id = ? WHERE id = ?', [newId, newId]);

      return new Response(JSON.stringify({
        id: newId,
        parent_id: null,
        name,
        chart_id: newId
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // CASE 2: Child node creation
    const [result] = await pool.query(
      'INSERT INTO format_hierarchy (parent_id, name, chart_id) VALUES (?, ?, ?)',
      [parent_id, name, chart_id || null]
    );

    return new Response(JSON.stringify({
      id: result.insertId,
      parent_id,
      name,
      chart_id
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('POST /api/formatHierarchy error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}



export async function DELETE(req) {
  try {
    const body = await req.json();
    console.log(body);
    const { id } = body;
    await pool.query('DELETE FROM format_hierarchy WHERE id = ?', [id]);
    return new Response(JSON.stringify({ message: 'Deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, name } = body;

    if (!id || !name) {
      return new Response(JSON.stringify({ error: 'ID and name are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const [result] = await pool.query(
      'UPDATE format_hierarchy SET name = ? WHERE id = ?',
      [name, id]
    );

    return new Response(JSON.stringify({ message: 'Renamed successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('PUT /api/formatHierarchy error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}


