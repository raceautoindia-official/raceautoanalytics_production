import pool from '../../../lib/db';

export async function GET(req) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id, 
        stream, 
        format_chart_id AS formatChartId,
        created_at  AS createdAt,
        data
      FROM volume_data
      ORDER BY created_at DESC
    `);

    // Optionally transform the "stream" CSV of node IDs into a human‐readable label
    // by joining names from hierarchy_nodes if you like.
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('GET /api/volumeData error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(req) {
  try {
    const { cells } = await req.json();
    if (!Array.isArray(cells)) {
      return new Response(
        JSON.stringify({ error: 'cells must be an array' }),
        { status: 400 }
      );
    }

    // Group deletions by volume_data row ID
    const byEntry = cells.reduce((acc, { id, row, column }) => {
      if (!acc[id]) acc[id] = [];
      acc[id].push({ row, column });
      return acc;
    }, {});

    for (const [id, toRemove] of Object.entries(byEntry)) {
      const [[entry]] = await pool.query(
        'SELECT data FROM volume_data WHERE id = ?',
        [id]
      );
      if (!entry) continue;

      // Safely get a JS object out of entry.data
      let matrix = entry.data;
      if (typeof matrix === 'string') {
        try {
          matrix = JSON.parse(matrix);
        } catch (e) {
          console.error('Failed to parse data JSON for id', id, e);
          continue;
        }
      }

      // Remove each specified cell
      toRemove.forEach(({ row, column }) => {
        if (matrix[row]) {
          delete matrix[row][column];
          if (Object.keys(matrix[row]).length === 0) {
            delete matrix[row];
          }
        }
      });

      // If empty, delete the whole row; else update the pruned JSON
      if (Object.keys(matrix).length === 0) {
        await pool.query('DELETE FROM volume_data WHERE id = ?', [id]);
      } else {
        await pool.query(
          'UPDATE volume_data SET data = ? WHERE id = ?',
          [JSON.stringify(matrix), id]
        );
      }
    }

    return new Response(
      JSON.stringify({ message: 'Deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('DELETE /api/volumeData error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
}

