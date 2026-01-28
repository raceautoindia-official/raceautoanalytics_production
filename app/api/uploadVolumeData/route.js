// File: app/api/uploadVolumeData/route.js
export const dynamic = "force-dynamic";

import { IncomingForm } from 'formidable';
import { Readable } from 'stream';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import pool from '@/lib/db';

// We no longer disable the built‐in bodyParser entirely, because
// we want to accept JSON for manual entry.
// (Next.js 13+ will parse JSON automatically if Content-Type is application/json.)

export async function POST(req) {
  // First, peek at content type:
  const contentType = req.headers.get('content-type') || '';

  // ──────────────────────────────────────────────────────────────────────────────
  // 1) If the client sent JSON (i.e. manual entry), handle it here:
  // ──────────────────────────────────────────────────────────────────────────────
  if (contentType.includes('application/json')) {
    try {
      const {
        rowChartId,
        colChartId,
        rowLevelNodes,   // array of IDs or comma‐separated string
        colLevelNodes,   // array of IDs or comma‐separated string
        streamPath,      // e.g. "3,5,12"
        data             // expected to be an object mapping rowLabel → { colLabel: value, … }
      } = await req.json();

      // Validate required fields:
      if (
        !rowChartId ||
        !colChartId ||
        !rowLevelNodes ||
        !colLevelNodes ||
        !streamPath ||
        typeof data !== 'object'
      ) {
        return new Response(
          JSON.stringify({ error: 'Missing one of: rowChartId, colChartId, rowLevelNodes, colLevelNodes, streamPath, or data' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Normalize row/col node arrays:
      const rowIds =
        Array.isArray(rowLevelNodes) ?
          rowLevelNodes.map(Number) :
          String(rowLevelNodes).split(',').map((x) => Number(x));
      const colIds =
        Array.isArray(colLevelNodes) ?
          colLevelNodes.map(Number) :
          String(colLevelNodes).split(',').map((x) => Number(x));

      // Build a JSON‐stringable matrix from the `data` object:
      // (we assume `data` is already in the form { rowLabel: { colLabel: value, … }, … })
      const newMatrix = {};
      Object.entries(data).forEach(([rLabel, cols]) => {
        newMatrix[rLabel] = {};
        Object.entries(cols).forEach(([cLabel, val]) => {
          // You may wish to coerce val to number/string here
          newMatrix[rLabel][cLabel] = val;
        });
      });

      // Check for an existing row in volume_data with the same stream & row‐chart
      const [existingRows] = await pool.query(
        'SELECT id, data FROM volume_data WHERE stream = ? AND format_chart_id = ?',
        [streamPath, rowChartId]
      );

      if (existingRows.length > 0) {
        // Merge into existing JSON
        const existing = existingRows[0];
        let existingMatrix = {};
        try {
          existingMatrix = JSON.parse(existing.data);
        } catch {
          existingMatrix = {};
        }

        // Merge row by row:
        for (const rLabel of Object.keys(newMatrix)) {
          if (!existingMatrix[rLabel]) {
            existingMatrix[rLabel] = {};
          }
          for (const cLabel of Object.keys(newMatrix[rLabel])) {
            const newVal = newMatrix[rLabel][cLabel];
            const oldVal = existingMatrix[rLabel][cLabel];
            if (newVal !== oldVal) {
              existingMatrix[rLabel][cLabel] = newVal;
            }
          }
        }

        await pool.query(
          'UPDATE volume_data SET data = ? WHERE id = ?',
          [JSON.stringify(existingMatrix), existing.id]
        );
      } else {
        // Insert brand‐new row
        await pool.query(
          'INSERT INTO volume_data (stream, format_chart_id, data) VALUES (?, ?, ?)',
          [streamPath, rowChartId, JSON.stringify(newMatrix)]
        );
      }

      return new Response(
        JSON.stringify({ message: 'Manual data stored successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      console.error('Manual‐entry error:', err);
      return new Response(
        JSON.stringify({ error: 'Manual entry failed: ' + err.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // 2) Otherwise, treat as “Excel upload” (formidable parsing + XLSX)
  // ──────────────────────────────────────────────────────────────────────────────
  try {
    // Set up Formidable to write to a tmp folder
    const form = new IncomingForm({
      uploadDir: './public/uploads',
      keepExtensions: true,
      multiples: false,
    });
    fs.mkdirSync('./public/uploads', { recursive: true });

    // Next.js’ request is a Web Request; convert to Node Readable for Formidable
    const nodeReq = Object.assign(Readable.fromWeb(req.body), {
      headers: Object.fromEntries(req.headers),
      method: req.method,
      url: '',
    });

    return await new Promise((resolve, reject) => {
      form.parse(nodeReq, async (err, fields, files) => {
        if (err) {
          console.error('Formidable error:', err);
          return reject(
            new Response(
              JSON.stringify({ error: 'File parsing failed' }),
              { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }

        // Extract fields from Formidable
        const {
          rowChartId,
          colChartId,
          rowLevelNodes,
          colLevelNodes,
          streamPath,
        } = fields;

        if (
          !rowChartId ||
          !colChartId ||
          !rowLevelNodes ||
          !colLevelNodes ||
          !streamPath
        ) {
          return resolve(
            new Response(
              JSON.stringify({ error: 'Missing required form fields' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }

        const rowIds = (Array.isArray(rowLevelNodes) ? rowLevelNodes[0] : rowLevelNodes)
          .split(',')
          .map(Number);
        const colIds = (Array.isArray(colLevelNodes) ? colLevelNodes[0] : colLevelNodes)
          .split(',')
          .map(Number);

        // Path to the uploaded file
        const uploadedFilePath = path.resolve(files.file[0].filepath);
        try {
          await fs.promises.access(uploadedFilePath, fs.constants.R_OK);
        } catch {
          return resolve(
            new Response(
              JSON.stringify({ error: 'Uploaded file is not accessible' }),
              { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }

        // Read & parse Excel
        const fileBuffer = await fs.promises.readFile(uploadedFilePath);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const headers = jsonData[0] || [];
        const rows = jsonData.slice(1);

        if (!headers.length || !rows.length) {
          return resolve(
            new Response(
              JSON.stringify({ error: 'Invalid Excel format' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }

        // Fetch expected row/column names from format_hierarchy table
        const [rowNodes] = await pool.query(
          `SELECT name FROM format_hierarchy WHERE chart_id = ? AND id IN (?)`,
          [rowChartId, rowIds]
        );
        const [colNodes] = await pool.query(
          `SELECT name FROM format_hierarchy WHERE chart_id = ? AND id IN (?)`,
          [colChartId, colIds]
        );

        const expectedRowNames = rowNodes.map((n) => n.name);
        const expectedColNames = colNodes.map((n) => n.name);
        const excelRowNames = rows.map((r) => r[0]);
        const excelColNames = headers.slice(1);

        const missingRows = expectedRowNames.filter((r) => !excelRowNames.includes(r));
        const missingCols = expectedColNames.filter((c) => !excelColNames.includes(c));

        if (missingRows.length || missingCols.length) {
          return resolve(
            new Response(
              JSON.stringify({
                error: 'Excel format does not match selected format hierarchy.',
                details: {
                  missingRowLabels: missingRows,
                  missingColumnLabels: missingCols,
                },
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }

        // Build newMatrix from the sheet
        const newMatrix = {};
        rows.forEach((rowArr) => {
          const rowKey = rowArr[0];
          newMatrix[rowKey] = {};
          headers.slice(1).forEach((colHeader, idx) => {
            newMatrix[rowKey][colHeader] = rowArr[idx + 1];
          });
        });

        // Check for existing volume_data (same stream + rowChartId)
        const [existingRows] = await pool.query(
          'SELECT id, data FROM volume_data WHERE stream = ? AND format_chart_id = ?',
          [streamPath, rowChartId]
        );

        if (existingRows.length > 0) {
          const existing = existingRows[0];
          let existingMatrix = {};
          try {
            existingMatrix = JSON.parse(existing.data);
          } catch {
            existingMatrix = {};
          }

          // Merge newMatrix into existingMatrix
          for (const rKey in newMatrix) {
            if (!existingMatrix[rKey]) existingMatrix[rKey] = {};
            for (const cKey in newMatrix[rKey]) {
              const newVal = newMatrix[rKey][cKey];
              const oldVal = existingMatrix[rKey][cKey];
              if (newVal !== oldVal) {
                existingMatrix[rKey][cKey] = newVal;
              }
            }
          }

          await pool.query(
            'UPDATE volume_data SET data = ? WHERE id = ?',
            [JSON.stringify(existingMatrix), existing.id]
          );
        } else {
          await pool.query(
            'INSERT INTO volume_data (stream, format_chart_id, data) VALUES (?, ?, ?)',
            [streamPath, rowChartId, JSON.stringify(newMatrix)]
          );
        }

        // Clean up uploaded file
        fs.unlink(uploadedFilePath, () => {});

        return resolve(
          new Response(
            JSON.stringify({ message: 'Upload and storage successful' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      });
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}


// // app/api/uploadVolumeData/route.js
// export const dynamic = "force-dynamic";

// import { IncomingForm } from 'formidable';
// import { Readable } from 'stream';
// import * as XLSX from 'xlsx';
// import fs from 'fs';
// import path from 'path';
// import pool from '@/lib/db';

// // export const config = {
// //   api: {
// //     bodyParser: false,
// //   },
// // };

// export async function POST(req) {
//   try {
//     const form = new IncomingForm({
//       uploadDir: './public/uploads',
//       keepExtensions: true,
//       multiples: false,
//     });
//     fs.mkdirSync('./public/uploads', { recursive: true });

//     const nodeReq = Object.assign(Readable.fromWeb(req.body), {
//       headers: Object.fromEntries(req.headers),
//       method: req.method,
//       url: '',
//     });

//     return await new Promise((resolve, reject) => {
//       form.parse(nodeReq, async (err, fields, files) => {
//         if (err) {
//           console.error('Formidable error:', err);
//           return reject(new Response(JSON.stringify({ error: 'File parsing failed' }), { status: 500 }));
//         }

//         const {
//           rowChartId,
//           colChartId,
//           rowLevelNodes,
//           colLevelNodes,
//           streamPath
//         } = fields;

//         const rowIds = (Array.isArray(rowLevelNodes) ? rowLevelNodes[0] : rowLevelNodes).split(',').map(Number);
//         const colIds = (Array.isArray(colLevelNodes) ? colLevelNodes[0] : colLevelNodes).split(',').map(Number);
//         const uploadedFilePath = path.resolve(files.file[0].filepath);

//         try {
//           await fs.promises.access(uploadedFilePath, fs.constants.R_OK);
//         } catch {
//           return resolve(new Response(JSON.stringify({ error: 'Uploaded file is not accessible' }), { status: 500 }));
//         }

//         const fileBuffer = await fs.promises.readFile(uploadedFilePath);
//         const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
//         const sheetName = workbook.SheetNames[0];
//         const worksheet = workbook.Sheets[sheetName];
//         const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

//         const headers = jsonData[0];
//         const rows = jsonData.slice(1);

//         if (!headers || headers.length === 0 || rows.length === 0) {
//           return resolve(new Response(JSON.stringify({ error: 'Invalid Excel format' }), { status: 400 }));
//         }

//         const [rowNodes] = await pool.query(
//           `SELECT name FROM format_hierarchy WHERE chart_id = ? AND id IN (?)`,
//           [rowChartId, rowIds]
//         );
//         const [colNodes] = await pool.query(
//           `SELECT name FROM format_hierarchy WHERE chart_id = ? AND id IN (?)`,
//           [colChartId, colIds]
//         );

//         const expectedRowNames = rowNodes.map(n => n.name);
//         const expectedColNames = colNodes.map(n => n.name);
//         const excelRowNames = rows.map(row => row[0]);
//         const excelColNames = headers.slice(1);

//         const missingRows = expectedRowNames.filter(r => !excelRowNames.includes(r));
//         const missingCols = expectedColNames.filter(c => !excelColNames.includes(c));

//         if (missingRows.length || missingCols.length) {
//           return resolve(new Response(JSON.stringify({
//             error: 'Excel format does not match selected format hierarchy.',
//             details: {
//               missingRowLabels: missingRows,
//               missingColumnLabels: missingCols
//             }
//           }), { status: 400 }));
//         }

//         const [existingRows] = await pool.query(
//           'SELECT id, stream, data FROM volume_data WHERE stream = ? AND format_chart_id = ?',
//           [streamPath, rowChartId]
//         );

//         const newMatrix = {};
//         rows.forEach((row) => {
//           const rowKey = row[0];
//           newMatrix[rowKey] = {};
//           headers.slice(1).forEach((colHeader, index) => {
//             newMatrix[rowKey][colHeader] = row[index + 1];
//           });
//         });

//         if (existingRows.length > 0) {
//           const existing = existingRows[0];
//           let existingMatrix = {};

//           try {
//             existingMatrix = JSON.parse(existing.data);
//           } catch {
//             console.warn('Failed to parse existing data');
//           }

//           for (const rowKey in newMatrix) {
//             if (!existingMatrix[rowKey]) {
//               existingMatrix[rowKey] = {};
//             }
//             for (const colKey in newMatrix[rowKey]) {
//               const newVal = newMatrix[rowKey][colKey];
//               const oldVal = existingMatrix[rowKey][colKey];
//               if (newVal !== oldVal) {
//                 existingMatrix[rowKey][colKey] = newVal;
//               }
//             }
//           }

//           await pool.query(
//             'UPDATE volume_data SET data = ? WHERE id = ?',
//             [JSON.stringify(existingMatrix), existing.id]
//           );
//         } else {
//           await pool.query(
//             'INSERT INTO volume_data (stream, format_chart_id, data) VALUES (?, ?, ?)',
//             [streamPath, rowChartId, JSON.stringify(newMatrix)]
//           );
//         }

//         fs.unlink(uploadedFilePath, () => {});

//         return resolve(new Response(JSON.stringify({ message: 'Upload and storage successful' }), {
//           status: 200,
//           headers: { 'Content-Type': 'application/json' },
//         }));
//       });
//     });
//   } catch (error) {
//     console.error('Unexpected error:', error);
//     return new Response(JSON.stringify({ error: error.message }), {
//       status: 500,
//       headers: { 'Content-Type': 'application/json' },
//     });
//   }
// }



