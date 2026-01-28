// app/api/filterVolumeData/route.js
import pool from '@/lib/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const stream = searchParams.get('stream');

    if (!stream) {
      return new Response(JSON.stringify({ error: 'Missing stream parameter' }), { status: 400 });
    }

    const [volumeRows] = await pool.query(
      'SELECT * FROM volume_data WHERE stream = ? ORDER BY created_at DESC',
      [stream]
    );

    return new Response(JSON.stringify(volumeRows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ filterVolumeData error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}


export async function POST(req) {
  try {
    const { parent_id, field_name, field_value } = await req.json();
    const [result] = await pool.query(
      'INSERT INTO filter_hierarchy (parent_id, field_name, field_value) VALUES (?, ?, ?)',
      [parent_id || null, field_name, field_value]
    );
    return new Response(
      JSON.stringify({ id: result.insertId, parent_id, field_name, field_value }),
      { status: 201 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    await pool.query('DELETE FROM filter_hierarchy WHERE id = ?', [id]);
    return new Response(
      JSON.stringify({ message: 'Filter node deleted' }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}
