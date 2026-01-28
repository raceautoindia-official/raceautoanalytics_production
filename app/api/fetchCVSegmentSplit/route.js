import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MONTHS_SHORT = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];
const MONTHS_TITLE = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getOrigin(req) {
  return new URL(req.url).origin;
}

function prevMonthRefIST() {
  const now = new Date();
  const ist = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  let y = ist.getFullYear();
  let m = ist.getMonth() + 1; // 1..12
  m -= 1;
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

function parseBaseMonth(baseMonth) {
  const s = String(baseMonth || "").trim();
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const monthIndex = parseInt(m[2], 10) - 1; // 0..11
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

function parseNumber(val) {
  if (typeof val === "string") val = val.replace(",", ".");
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const segmentName = searchParams.get("segmentName")?.toLowerCase()?.trim();
    const baseMonth = searchParams.get("baseMonth") || prevMonthRefIST();

    if (!segmentName) {
      return NextResponse.json(
        { error: "Missing segmentName" },
        { status: 400 }
      );
    }

    const parsed = parseBaseMonth(baseMonth);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid baseMonth. Use YYYY-MM" },
        { status: 400 }
      );
    }

    const { year: baseYear, monthIndex: baseMonthIndex } = parsed;

    // ✅ Internal calls (same Next app), no token
    const origin = getOrigin(req);
    const [hierarchyRes, volumeRes] = await Promise.all([
      fetch(`${origin}/api/contentHierarchy`, { cache: "no-store" }),
      fetch(`${origin}/api/volumeData`, { cache: "no-store" }),
    ]);

    const hierarchyData = await hierarchyRes.json();
    const volumeData = await volumeRes.json();

    // Build full path from node ID (same as your original logic)
    const buildPath = (id) => {
      const path = [];
      let current = hierarchyData.find((n) => n.id === id);
      while (current) {
        path.unshift(current.id);
        current = hierarchyData.find((n) => n.id === current.parent_id);
      }
      return path.join(",");
    };

    // Resolve segment and split node
    const segment = hierarchyData.find(
      (n) =>
        String(n.name || "")
          .toLowerCase()
          .trim() === segmentName
    );
    if (!segment) return NextResponse.json([], { status: 404 });

    const splitNode = hierarchyData.find(
      (n) =>
        String(n.name || "")
          .toLowerCase()
          .trim() === "segment split" && n.parent_id === segment.id
    );
    if (!splitNode) return NextResponse.json([], { status: 404 });

    // Build target window around baseMonth (same offsets as your old code: -3..+6)
    const targets = [];
    for (let offset = -3; offset <= 6; offset++) {
      const d = new Date(baseYear, baseMonthIndex + offset, 1);
      targets.push({
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        label: `${MONTHS_TITLE[d.getMonth()]} ${d.getFullYear()}`, // ✅ matches UI format "Apr 2025"
        monthName: MONTHS_SHORT[d.getMonth()],
      });
    }

    const result = [];

    for (const t of targets) {
      // Find year node for the target year (IMPORTANT: handles Dec-25 → Jan-26 crossing)
      const yearNode = hierarchyData.find(
        (n) =>
          String(n.name || "").trim() === String(t.year) &&
          n.parent_id === splitNode.id
      );
      if (!yearNode) continue;

      // Find month node under that year
      const monthNode = hierarchyData.find(
        (n) =>
          n.parent_id === yearNode.id &&
          String(n.name || "")
            .toLowerCase()
            .trim() === t.monthName
      );
      if (!monthNode) continue;

      const stream = buildPath(monthNode.id);
      const volumeEntry = volumeData.find((v) => v.stream === stream);
      if (!volumeEntry?.data?.data) continue;

      const raw = volumeEntry.data.data;

      const LCV = parseNumber(raw["LCV"]);
      const MCV = parseNumber(raw["MCV"]);
      const HCV = parseNumber(raw["HCV"]);
      const total = LCV + MCV + HCV;
      if (total <= 0) continue;

      result.push({
        month: t.label,
        lcv: (LCV / total) * 100,
        mcv: (MCV / total) * 100,
        hcv: (HCV / total) * 100,
      });
    }

    // Sort chronologically
    result.sort((a, b) => {
      const [ma, ya] = a.month.split(" ");
      const [mb, yb] = b.month.split(" ");
      const ia = MONTHS_TITLE.map((x) => x.toLowerCase()).indexOf(
        ma.toLowerCase()
      );
      const ib = MONTHS_TITLE.map((x) => x.toLowerCase()).indexOf(
        mb.toLowerCase()
      );
      const da = new Date(`${ya}-${String(ia + 1).padStart(2, "0")}-01`);
      const db = new Date(`${yb}-${String(ib + 1).padStart(2, "0")}-01`);
      return da.getTime() - db.getTime();
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("fetchCVSegmentSplit error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
