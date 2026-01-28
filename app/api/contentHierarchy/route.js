import pool from '../../../lib/db';

export async function GET(req) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM hierarchy_nodes ORDER BY created_at'
    );
    // console.log(rows.length);
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { parent_id, name } = body;

    // Enforce single-root rule: if parent_id is null, ensure no existing root exists
    if (parent_id == null) {
      const [existingRoots] = await pool.query(
        'SELECT * FROM hierarchy_nodes WHERE parent_id IS NULL'
      );
      if (existingRoots.length > 0) {
        return new Response(
          JSON.stringify({ error: 'A root node already exists.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const [result] = await pool.query(
      'INSERT INTO hierarchy_nodes (parent_id, name) VALUES (?, ?)',
      [parent_id || null, name]
    );
    return new Response(
      JSON.stringify({ id: result.insertId, parent_id, name }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function PUT(req) {
  try {
    const { id, name } = await req.json();

    if (!id || !name) {
      return new Response(JSON.stringify({ error: 'Missing id or name' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await pool.query('UPDATE hierarchy_nodes SET name = ? WHERE id = ?', [name, id]);

    return new Response(JSON.stringify({ message: 'Node renamed successfully' }), {
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


export async function DELETE(req) {
  try {
    const body = await req.json();
    const { id } = body;
    await pool.query(
      'DELETE FROM hierarchy_nodes WHERE id = ?',
      [id]
    );
    return new Response(
      JSON.stringify({ message: 'Deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
