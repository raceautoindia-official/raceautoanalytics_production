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
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

  let y = ist.getFullYear();
  let m = ist.getMonth() + 1;
  const d = ist.getDate();

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
  const key = String(k || "").toLowerCase().trim();
  if (key === "two wheeler" || key === "two-wheeler" || key === "2w") return "2W";
  if (key === "three wheeler" || key === "three-wheeler" || key === "3w") return "3W";
  if (key === "passenger" || key === "passenger vehicle" || key === "pv") return "PV";
  if (key === "tractor" || key === "agri tractor" || key === "trac") return "Tractor";
  if (key === "cv" || key === "commercial vehicle") return "CV";
  return null;
}

// ✅ helpers
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[-_\s]+/g, "");
}
function sid(v) {
  return String(v ?? "");
}
function eqId(a, b) {
  return sid(a) === sid(b);
}
function normalizeCountry(raw) {
  const k = norm(raw);
  if (!k || k === "india" || k === "in") return "india";
  if (k === "bazil") return "brazil";
  return k;
}

function findNodeByName(nodes, parentId, nameLower) {
  return nodes.find(
    (n) =>
      eqId(n?.parent_id, parentId) &&
      String(n?.name || "").toLowerCase().trim() === nameLower,
  );
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const segmentName = (searchParams.get("segmentName") || "").toLowerCase().trim();
    const baseMonth = searchParams.get("baseMonth") || prevMonthRefIST();

    // ✅ NEW
    const rawCountry = searchParams.get("country");
    const countryKey = normalizeCountry(rawCountry);
    const wantsNonIndia = !!rawCountry && countryKey !== "india";

    if (!segmentName) {
      return NextResponse.json({ error: "Missing segmentName" }, { status: 400 });
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

    const backendBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

    const [hierarchyRes, volumeRes] = await Promise.all([
      fetch(`${backendBase}api/contentHierarchy`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }),
      fetch(`${backendBase}api/volumeData`, {
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

    // ✅ id-safe buildPath for correct stream (works for countries depth)
    const buildPath = (id) => {
      const path = [];
      let current = hierarchyData.find((n) => eqId(n.id, id));
      while (current) {
        path.unshift(current.id);
        const pid = current.parent_id;
        if (pid == null) break;
        current = hierarchyData.find((n) => eqId(n.id, pid));
      }
      return path.join(",");
    };

    const mainRoot = hierarchyData.find(
      (n) => String(n?.name || "").toLowerCase().trim() === "main root",
    );
    if (!mainRoot) return NextResponse.json({});

    const flashReports = hierarchyData.find(
      (n) =>
        String(n?.name || "").toLowerCase().trim() === "flash-reports" &&
        eqId(n?.parent_id, mainRoot.id),
    );
    if (!flashReports) return NextResponse.json({});

    // ✅ choose segments root
    let segmentsRoot = flashReports;

    if (wantsNonIndia) {
      const countriesNode = hierarchyData.find(
        (n) => eqId(n.parent_id, flashReports.id) && norm(n.name) === "countries",
      );

      const countryNode = countriesNode
        ? hierarchyData.find(
            (n) =>
              eqId(n.parent_id, countriesNode.id) &&
              norm(n.name) === norm(countryKey),
          )
        : null;

      if (!countryNode) {
        // non-india requested but missing -> empty
        return NextResponse.json({});
      }

      segmentsRoot = countryNode;
    }

    const altFuel = hierarchyData.find(
      (n) =>
        String(n?.name || "").toLowerCase().trim() === "alternative fuel" &&
        eqId(n?.parent_id, segmentsRoot.id),
    );
    if (!altFuel) return NextResponse.json({});

    const out = { "2W": {}, "3W": {}, PV: {}, Tractor: {}, CV: {} };

    const readMonth = (y, mIdx, uiLabel) => {
      const yearNode = findNodeByName(hierarchyData, altFuel.id, String(y));
      if (!yearNode) return;

      const monthNode = findNodeByName(hierarchyData, yearNode.id, MONTHS_LOWER[mIdx]);
      if (!monthNode) return;

      // ✅ stream derived from actual node ancestry (works for india + countries)
      const streamPath = buildPath(monthNode.id);
      const matched = volumeData.find((v) => String(v.stream) === String(streamPath));
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}