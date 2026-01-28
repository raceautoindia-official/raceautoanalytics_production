import { NextResponse } from "next/server";
import db from "@/lib/db";

const TABLE_DDL = `
CREATE TABLE IF NOT EXISTS score_settings (
  \`key\` VARCHAR(255) NOT NULL PRIMARY KEY,
  \`value\` JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

function pad2(n) {
  return String(n).padStart(2, "0");
}

// baseMonth = "YYYY-MM"
function addMonthsYM(baseMonth, delta) {
  const [yStr, mStr] = String(baseMonth).split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return baseMonth;

  const idx = y * 12 + (m - 1) + delta;
  const yy = Math.floor(idx / 12);
  const mm = (idx % 12) + 1;
  return `${yy}-${pad2(mm)}`;
}

function safeJson(v) {
  if (v == null) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

export async function GET(request) {
  try {
    await db.query(TABLE_DDL);

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key") || "scoreSettings";

    // flash-only dynamic labels
    const baseMonth = searchParams.get("baseMonth");
    const horizonRaw = searchParams.get("horizon");
    const horizon = Math.max(1, Math.min(24, parseInt(horizonRaw || "6", 10)));

    const [rows] = await db.query(
      "SELECT `value`, `updated_at` FROM score_settings WHERE `key` = ? LIMIT 1",
      [key]
    );

    let stored = { yearNames: [], scoreLabels: [] };
    let updatedAt = null;

    if (Array.isArray(rows) && rows.length > 0) {
      const parsed = safeJson(rows[0].value);
      if (parsed && typeof parsed === "object") stored = parsed;
      updatedAt = rows[0].updated_at || null;
    }

    const yearNames = baseMonth
      ? Array.from({ length: horizon }, (_, i) => addMonthsYM(baseMonth, i + 1))
      : Array.isArray(stored.yearNames)
      ? stored.yearNames
      : [];

    const scoreLabels = Array.isArray(stored.scoreLabels)
      ? stored.scoreLabels
      : [];

    // IMPORTANT: old code expects just {yearNames, scoreLabels}
    // New code can use key/updatedAt too.
    return NextResponse.json({ key, yearNames, scoreLabels, updatedAt });
  } catch (e) {
    console.error("GET /api/scoreSettings error:", e);
    // Old behavior was to return empty arrays on failure
    return NextResponse.json(
      { yearNames: [], scoreLabels: [], error: e?.message || "Server error" },
      { status: 200 }
    );
  }
}

export async function POST(request) {
  try {
    await db.query(TABLE_DDL);

    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));

    // Accept key from body OR query param OR default (back-compat)
    const key = body.key || searchParams.get("key") || "scoreSettings";

    const yearNames = Array.isArray(body.yearNames) ? body.yearNames : [];
    const scoreLabels = Array.isArray(body.scoreLabels) ? body.scoreLabels : [];

    await db.query(
      `
      INSERT INTO score_settings (\`key\`, \`value\`)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)
      `,
      [key, JSON.stringify({ yearNames, scoreLabels })]
    );

    // Return both old/new success shapes
    return NextResponse.json({ ok: true, success: true, key });
  } catch (e) {
    console.error("POST /api/scoreSettings error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

// import { NextResponse } from "next/server";
// import db from "@/lib/db";

// function pad2(n) {
//   return String(n).padStart(2, "0");
// }

// // baseMonth = "YYYY-MM"
// function addMonthsYM(baseMonth, delta) {
//   const [yStr, mStr] = String(baseMonth).split("-");
//   const y = Number(yStr);
//   const m = Number(mStr);
//   if (!Number.isFinite(y) || !Number.isFinite(m)) return baseMonth;

//   const idx = y * 12 + (m - 1) + delta;
//   const yy = Math.floor(idx / 12);
//   const mm = (idx % 12) + 1;
//   return `${yy}-${pad2(mm)}`;
// }

// export async function GET(request) {
//   try {
//     const { searchParams } = new URL(request.url);

//     const key = searchParams.get("key") || "scoreSettings";
//     const baseMonth = searchParams.get("baseMonth"); // flash only
//     const horizonRaw = searchParams.get("horizon");
//     const horizon = Math.max(1, Math.min(24, parseInt(horizonRaw || "6", 10)));

//     const [rows] = await db.query(
//       "SELECT `value`, `updated_at` FROM score_settings WHERE `key` = ? LIMIT 1",
//       [key]
//     );

//     let stored = { yearNames: [], scoreLabels: [] };
//     let updatedAt = null;

//     if (Array.isArray(rows) && rows.length > 0) {
//       try {
//         stored = JSON.parse(rows[0].value);
//       } catch {
//         stored = { yearNames: [], scoreLabels: [] };
//       }
//       updatedAt = rows[0].updated_at || null;
//     }

//     // Flash: dynamic month labels (baseMonth+1 .. baseMonth+horizon)
//     const yearNames = baseMonth
//       ? Array.from({ length: horizon }, (_, i) => addMonthsYM(baseMonth, i + 1))
//       : stored.yearNames || [];

//     return NextResponse.json({
//       key,
//       yearNames,
//       scoreLabels: stored.scoreLabels || [],
//       updatedAt,
//     });
//   } catch (e) {
//     console.error("GET /api/scoreSettings error:", e);
//     return NextResponse.json({ error: e.message }, { status: 500 });
//   }
// }

// export async function POST(request) {
//   try {
//     const body = await request.json();
//     const key = body.key || "scoreSettings";
//     const yearNames = Array.isArray(body.yearNames) ? body.yearNames : [];
//     const scoreLabels = Array.isArray(body.scoreLabels) ? body.scoreLabels : [];

//     await db.query(
//       `
//       INSERT INTO score_settings (\`key\`, \`value\`)
//       VALUES (?, ?)
//       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)
//       `,
//       [key, JSON.stringify({ yearNames, scoreLabels })]
//     );

//     return NextResponse.json({ ok: true, key });
//   } catch (e) {
//     console.error("POST /api/scoreSettings error:", e);
//     return NextResponse.json({ error: e.message }, { status: 500 });
//   }
// }
