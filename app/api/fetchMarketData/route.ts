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
] as const;

function getOrigin(req: Request) {
  return new URL(req.url).origin;
}

// ✅ Flash cadence: rollover happens on/after 5th of the month (IST)
// Returns the *effective* "latest available" month key in YYYY-MM.
function prevMonthRefISTCutoff5(): string {
  const now = new Date();
  const istParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const y = Number(istParts.find((p) => p.type === "year")?.value ?? "1970");
  const m = Number(istParts.find((p) => p.type === "month")?.value ?? "01");
  const d = Number(istParts.find((p) => p.type === "day")?.value ?? "01");

  // before the 5th: treat latest available month as TWO months ago
  const back = d < 5 ? 2 : 1;
  let year = y;
  let month = m - back;
  while (month <= 0) {
    month += 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

function parseBaseMonth(yyyymm: string | null) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(yyyymm || "").trim());
  if (!m) return null;
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

function normalize(s: string) {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/[\s\-_]+/g, "");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const rawSegmentName = searchParams.get("segmentName") || "";
    const rawSegmentType = searchParams.get("segmentType") || "";

    // Support either:
    // - baseMonth=YYYY-MM (preferred, fixes year drift)
    // - selectedMonth=YYYY-MM
    // - selectedMonth=jan/feb/... (fallback)
    const baseMonth =
      searchParams.get("baseMonth") ||
      (searchParams.get("selectedMonth")?.match(/^\d{4}-\d{2}$/)
        ? searchParams.get("selectedMonth")
        : null) ||
      prevMonthRefISTCutoff5();

    const selectedMonthRaw = (searchParams.get("selectedMonth") || "")
      .toLowerCase()
      .trim();

    const parsed = parseBaseMonth(baseMonth);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid baseMonth (use YYYY-MM)" },
        { status: 400 },
      );
    }

    const { year: baseYear, monthIndex: baseMonthIndex } = parsed;
    const monthName = MONTHS_SHORT.includes(selectedMonthRaw as any)
      ? (selectedMonthRaw as (typeof MONTHS_SHORT)[number])
      : MONTHS_SHORT[baseMonthIndex];

    // current, previous month (with year crossing), and same month last year
    const currentMonthIdx = MONTHS_SHORT.indexOf(monthName);
    const prevDate = new Date(baseYear, currentMonthIdx - 1, 1);
    const prevMonthYear = prevDate.getFullYear();
    const prevMonthName = MONTHS_SHORT[prevDate.getMonth()];
    const lastYearSameMonthYear = baseYear - 1;

    const segmentName = rawSegmentName.toLowerCase().trim();
    const segmentType = rawSegmentType.toLowerCase().trim();

    // ✅ Use internal Next.js APIs (local DB) so dev/prod behave consistently
    const origin = getOrigin(req);
    const [hierarchyRes, volumeRes] = await Promise.all([
      fetch(`${origin}/api/contentHierarchy`, { cache: "no-store" }),
      fetch(`${origin}/api/volumeData`, { cache: "no-store" }),
    ]);

    if (!hierarchyRes.ok || !volumeRes.ok) {
      return NextResponse.json([], { status: 200 });
    }

    const hierarchyData = await hierarchyRes.json();
    const volumeData = await volumeRes.json();

    const buildPath = (id: number | string) => {
      const path: Array<number | string> = [];
      let cur = hierarchyData.find((n: any) => n.id === id);
      while (cur) {
        path.unshift(cur.id);
        cur = hierarchyData.find((n: any) => n.id === cur.parent_id);
      }
      return path.join(",");
    };

    // ✅ Prefer: Main Root → flash-reports → <segment>
    const mainRoot = hierarchyData.find(
      (n: any) =>
        String(n?.name || "")
          .toLowerCase()
          .trim() === "main root" &&
        (n.parent_id == null || n.parent_id === 0),
    );
    const flashReports = hierarchyData.find(
      (n: any) =>
        String(n?.name || "")
          .toLowerCase()
          .trim() === "flash-reports" &&
        (mainRoot ? n.parent_id === mainRoot.id : true),
    );

    let segmentNode: any = null;
    if (flashReports) {
      segmentNode =
        hierarchyData.find(
          (n: any) =>
            n.parent_id === flashReports.id &&
            normalize(n.name || "") === normalize(segmentName),
        ) || null;
    }

    // Fallback: older behavior (match anywhere)
    if (!segmentNode) {
      segmentNode =
        hierarchyData.find(
          (n: any) =>
            normalize(n.name || "") === normalize(segmentName) ||
            (normalize(segmentName) === "overall" &&
              normalize(n.name || "").includes("overall")),
        ) || null;
    }

    if (!segmentNode) return NextResponse.json([], { status: 200 });

    // Find "market share" node (or segmentType match) under segment
    const marketShareNode = hierarchyData.find(
      (n: any) =>
        n.parent_id === segmentNode.id &&
        normalize(n.name || "").includes(
          segmentType ? normalize(segmentType) : "marketshare",
        ),
    );

    if (!marketShareNode) return NextResponse.json([], { status: 200 });

    const findYearNode = (y: number) =>
      hierarchyData.find(
        (n: any) =>
          String(n.name || "").trim() === String(y) &&
          n.parent_id === marketShareNode.id,
      ) || null;

    const findMonthNode = (y: number, m: string) => {
      const yearNode = findYearNode(y);
      if (!yearNode) return null;
      return (
        hierarchyData.find(
          (n: any) =>
            n.parent_id === yearNode.id &&
            String(n.name || "")
              .toLowerCase()
              .trim() === m,
        ) || null
      );
    };

    const previousMonthNode = findMonthNode(prevMonthYear, prevMonthName);
    const currentMonthNode = findMonthNode(baseYear, monthName);
    const lastYearSameMonthNode = findMonthNode(
      lastYearSameMonthYear,
      monthName,
    );

    const nodes = [previousMonthNode, currentMonthNode, lastYearSameMonthNode];
    const merged: Record<string, any> = {};

    for (const node of nodes) {
      if (!node) continue;

      const stream = buildPath(node.id);
      const volumeEntry = volumeData.find((v: any) => v.stream === stream);
      if (!volumeEntry?.data?.data) continue;

      const nodeYear = hierarchyData.find(
        (n: any) => n.id === node.parent_id,
      )?.name;
      const label = `${String(node.name || "")
        .toLowerCase()
        .trim()} ${String(nodeYear || "").trim()}`;

      for (const [name, value] of Object.entries(volumeEntry.data.data)) {
        if (!merged[name]) merged[name] = { name };
        merged[name][label] = value;
      }
    }

    return NextResponse.json(Object.values(merged));
  } catch (err) {
    console.error("fetchMarketData error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
