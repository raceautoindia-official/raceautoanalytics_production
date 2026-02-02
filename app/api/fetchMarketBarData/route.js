import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MONTHS = [
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
const MONTHS_LOWER = [
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

function parseBaseMonth(baseMonth) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(baseMonth || "").trim());
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const monthIndex = parseInt(m[2], 10) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

function toUiMonthLabel(year, monthIndex) {
  return `${MONTHS[monthIndex]} ${year}`;
}

function mapAltFuelKey(k) {
  const key = String(k || "")
    .toLowerCase()
    .trim();
  if (key === "two wheeler" || key === "two-wheeler" || key === "2w")
    return "2W";
  if (key === "three wheeler" || key === "three-wheeler" || key === "3w")
    return "3W";
  if (key === "passenger" || key === "passenger vehicle" || key === "pv")
    return "PV";
  if (key === "tractor" || key === "agri tractor" || key === "trac")
    return "Tractor";
  if (key === "cv" || key === "commercial vehicle") return "CV";
  return null;
}

function findNodeByName(nodes, parentId, nameLower) {
  return nodes.find(
    (n) =>
      n?.parent_id === parentId &&
      String(n?.name || "")
        .toLowerCase()
        .trim() === nameLower,
  );
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const segmentName = (searchParams.get("segmentName") || "")
      .toLowerCase()
      .trim();
    const baseMonth = searchParams.get("baseMonth") || prevMonthRefIST();

    if (!segmentName) {
      return NextResponse.json(
        { error: "Missing segmentName" },
        { status: 400 },
      );
    }

    const parsed = parseBaseMonth(baseMonth);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid baseMonth. Use YYYY-MM" },
        { status: 400 },
      );
    }

    // Only used for Overall Automotive Industry -> Alternative Fuel summary
    if (segmentName !== "alternative fuel") {
      return NextResponse.json(
        { error: "Unsupported segmentName for this endpoint" },
        { status: 400 },
      );
    }

    const { year, monthIndex } = parsed;
    const prevDate = new Date(year, monthIndex - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonthIndex = prevDate.getMonth();

    const currUi = toUiMonthLabel(year, monthIndex);
    const prevUi = toUiMonthLabel(prevYear, prevMonthIndex);

    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const token = process.env.BACKEND_API_TOKEN;

    if (!baseUrl)
      return NextResponse.json(
        { error: "NEXT_PUBLIC_BACKEND_URL is not set" },
        { status: 500 },
      );
    if (!token)
      return NextResponse.json(
        { error: "BACKEND_API_TOKEN is not set" },
        { status: 500 },
      );

    const [hierarchyRes, volumeRes] = await Promise.all([
      fetch(`${baseUrl}api/contentHierarchy`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }),
      fetch(`${baseUrl}api/volumeData`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }),
    ]);

    if (!hierarchyRes.ok || !volumeRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch backend hierarchy/data" },
        { status: 500 },
      );
    }

    const hierarchyData = await hierarchyRes.json();
    const volumeData = await volumeRes.json();

    const mainRoot = hierarchyData.find(
      (n) =>
        String(n?.name || "")
          .toLowerCase()
          .trim() === "main root",
    );
    if (!mainRoot) return NextResponse.json({});

    const flashReports = hierarchyData.find(
      (n) =>
        String(n?.name || "")
          .toLowerCase()
          .trim() === "flash-reports" && n?.parent_id === mainRoot.id,
    );
    if (!flashReports) return NextResponse.json({});

    const altFuel = hierarchyData.find(
      (n) =>
        String(n?.name || "")
          .toLowerCase()
          .trim() === "alternative fuel" && n?.parent_id === flashReports.id,
    );
    if (!altFuel) return NextResponse.json({});

    const out = { "2W": {}, "3W": {}, PV: {}, Tractor: {}, CV: {} };

    const readMonth = (y, mIdx, uiLabel) => {
      const yearNode = findNodeByName(hierarchyData, altFuel.id, String(y));
      if (!yearNode) return;

      const monthNode = findNodeByName(
        hierarchyData,
        yearNode.id,
        MONTHS_LOWER[mIdx],
      );
      if (!monthNode) return;

      const streamPath = [
        mainRoot.id,
        flashReports.id,
        altFuel.id,
        yearNode.id,
        monthNode.id,
      ].join(",");
      const matched = volumeData.find((v) => v.stream === streamPath);
      if (!matched?.data) return;

      const raw = matched.data?.data ?? matched.data;
      if (!raw || typeof raw !== "object") return;

      for (const [k, v] of Object.entries(raw)) {
        const cat = mapAltFuelKey(k);
        if (!cat) continue;
        const num = Number(v);
        if (!Number.isFinite(num)) continue;
        out[cat][uiLabel] = num;
      }
    };

    // previous and current (base) months
    readMonth(prevYear, prevMonthIndex, prevUi);
    readMonth(year, monthIndex, currUi);

    const hasAny = Object.values(out).some((m) => Object.keys(m).length > 0);
    return NextResponse.json(hasAny ? out : {});
  } catch (err) {
    console.error("fetchMarketBarData error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
