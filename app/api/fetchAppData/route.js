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

function getOrigin(req) {
  return new URL(req.url).origin;
}

// previous calendar month in Asia/Kolkata -> "YYYY-MM"
function prevMonthRefIST() {
  // Flash reporting month rolls over on the 5th (IST):
  // - 1st–4th: treat "latest available" as two months ago
  // - 5th onwards: treat "latest available" as previous calendar month
  const now = new Date();
  const ist = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );

  let y = ist.getFullYear();
  let m = ist.getMonth() + 1; // 1..12 (current month)
  const d = ist.getDate(); // 1..31

  const cutoffDay = 5;
  const back = d >= cutoffDay ? 1 : 2;

  m -= back;
  while (m <= 0) {
    m += 12;
    y -= 1;
  }

  return `${y}-${String(m).padStart(2, "0")}`;
}

function parseBaseMonth(yyyymm) {
  const s = String(yyyymm || "").trim();
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const monthIndex = parseInt(m[2], 10) - 1; // 0..11
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const segmentName = searchParams.get("segmentName");
    const segmentType = searchParams.get("segmentType") || "app";

    // Support either:
    // - baseMonth=YYYY-MM  (preferred)
    // - selectedMonth=YYYY-MM
    // - selectedMonth=jan/feb/... (fallback, uses baseMonth year)
    const baseMonth =
      searchParams.get("baseMonth") ||
      (searchParams.get("selectedMonth")?.match(/^\d{4}-\d{2}$/)
        ? searchParams.get("selectedMonth")
        : null) ||
      prevMonthRefIST();

    if (!segmentName) {
      return NextResponse.json(
        { error: "Missing segmentName" },
        { status: 400 },
      );
    }

    const parsed = parseBaseMonth(baseMonth);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid baseMonth (use YYYY-MM)" },
        { status: 400 },
      );
    }

    const { year: baseYear, monthIndex: baseMonthIndex } = parsed;

    // Determine monthName: if selectedMonth provided as "jan".."dec", respect it; else use baseMonth month
    const selectedMonthRaw = (searchParams.get("selectedMonth") || "")
      .toLowerCase()
      .trim();
    const monthName = MONTHS_SHORT.includes(selectedMonthRaw)
      ? selectedMonthRaw
      : MONTHS_SHORT[baseMonthIndex];

    // Compute target months:
    // 1) current month = monthName in baseYear
    // 2) previous month (may cross year)
    // 3) same month last year
    const current = { year: baseYear, month: monthName };

    const currentMonthIdx = MONTHS_SHORT.indexOf(monthName);
    const prevDate = new Date(baseYear, currentMonthIdx - 1, 1); // handles year crossing
    const previous = {
      year: prevDate.getFullYear(),
      month: MONTHS_SHORT[prevDate.getMonth()],
    };

    const lastYearSameMonth = { year: baseYear - 1, month: monthName };

    // ✅ Internal calls to same Next.js app (no NEXT_PUBLIC_BACKEND_URL, no placeholder token)
    const origin = getOrigin(req);
    const [hierarchyRes, volumeRes] = await Promise.all([
      fetch(`${origin}/api/contentHierarchy`, { cache: "no-store" }),
      fetch(`${origin}/api/volumeData`, { cache: "no-store" }),
    ]);

    if (!hierarchyRes.ok || !volumeRes.ok) {
      return NextResponse.json(
        { error: "Failed to load hierarchy/volume data" },
        { status: 500 },
      );
    }

    const hierarchyData = await hierarchyRes.json();
    const volumeData = await volumeRes.json();

    const buildPath = (id) => {
      const path = [];
      let current = hierarchyData.find((n) => n.id === id);
      while (current) {
        path.unshift(current.id);
        current = hierarchyData.find((n) => n.id === current.parent_id);
      }
      return path.join(",");
    };

    const norm = (s) =>
      String(s || "")
        .toLowerCase()
        .trim()
        .replace(/[-_\s]+/g, "");

    // Prefer the segment under: Main Root → flash-reports → <segment>
    const mainRoot = hierarchyData.find(
      (n) =>
        String(n.name || "")
          .toLowerCase()
          .trim() === "main root" &&
        (n.parent_id == null || n.parent_id === 0),
    );
    const flashReports = hierarchyData.find(
      (n) =>
        String(n.name || "")
          .toLowerCase()
          .trim() === "flash-reports" &&
        (mainRoot ? n.parent_id === mainRoot.id : true),
    );

    let segmentNode = null;
    if (flashReports) {
      segmentNode =
        hierarchyData.find(
          (n) =>
            n.parent_id === flashReports.id &&
            norm(n.name) === norm(segmentName),
        ) || null;
    }

    // Fallback: previous behavior (exact name match anywhere)
    if (!segmentNode) {
      segmentNode =
        hierarchyData.find(
          (n) =>
            String(n.name || "")
              .toLowerCase()
              .trim() === segmentName.toLowerCase().trim() ||
            norm(n.name) === norm(segmentName),
        ) || null;
    }
    if (!segmentNode) return NextResponse.json([], { status: 404 });

    const appNode = hierarchyData.find(
      (n) =>
        n.parent_id === segmentNode.id && norm(n.name) === norm(segmentType),
    );
    if (!appNode) return NextResponse.json([], { status: 404 });

    // Helper: find a month node under year node
    const findMonthNode = (year, month) => {
      const yearNode = hierarchyData.find(
        (n) =>
          String(n.name || "").trim() === String(year) &&
          n.parent_id === appNode.id,
      );
      if (!yearNode) return null;

      return hierarchyData.find(
        (n) =>
          n.parent_id === yearNode.id &&
          String(n.name || "")
            .toLowerCase()
            .trim() === month,
      );
    };

    const nodes = [
      findMonthNode(previous.year, previous.month),
      findMonthNode(current.year, current.month),
      findMonthNode(lastYearSameMonth.year, lastYearSameMonth.month),
    ];

    const merged = {};

    for (const node of nodes) {
      if (!node) continue;

      const stream = buildPath(node.id);
      const volumeEntry = volumeData.find((v) => v.stream === stream);
      if (!volumeEntry?.data?.data) continue;

      const nodeYear = hierarchyData.find((n) => n.id === node.parent_id)?.name;
      const label = `${String(node.name || "")
        .toLowerCase()
        .trim()} ${nodeYear}`; // e.g. "dec 2025"

      for (const [name, value] of Object.entries(volumeEntry.data.data)) {
        if (!merged[name]) merged[name] = { name };
        merged[name][label] = value;
      }
    }

    return NextResponse.json(Object.values(merged));
  } catch (err) {
    console.error("fetchAppData error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
