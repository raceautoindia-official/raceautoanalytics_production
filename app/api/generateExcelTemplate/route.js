// File: app/api/generateExcelTemplate/route.js
import * as XLSX from 'xlsx';
import pool from '../../../lib/db';

export async function POST(req) {
  try {
    const body = await req.json();
    const { rowChartId, rowLevelNodes, colChartId, colLevelNodes } = body;

    if (!rowChartId || !rowLevelNodes || !colChartId || !colLevelNodes) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const [rowNodes] = await pool.query(
      `SELECT name FROM format_hierarchy WHERE id IN (${rowLevelNodes}) AND chart_id = ?`,
      [rowChartId]
    );
    const [colNodes] = await pool.query(
      `SELECT name FROM format_hierarchy WHERE id IN (${colLevelNodes}) AND chart_id = ?`,
      [colChartId]
    );

    const rowLabels = rowNodes.map(n => n.name);
    const colLabels = colNodes.map(n => n.name);

    const headerRow = [''].concat(colLabels);
    const sheetData = [headerRow];
    rowLabels.forEach(row => {
      const rowArray = new Array(colLabels.length).fill('');
      sheetData.push([row, ...rowArray]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'VolumeTemplate');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename="volume_template.xlsx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
