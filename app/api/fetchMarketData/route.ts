import { NextResponse } from "next/server";
import {
  normalizeCountryKey,
  resolveFlashReportContext,
} from "@/lib/flashReportCountry";

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

const sid = (v: any) => String(v ?? "");
const eqId = (a: any, b: any) => sid(a) === sid(b);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const rawCountry = searchParams.get("country");

    const rawSegmentName = searchParams.get("segmentName") || "";
    const rawSegmentType = searchParams.get("segmentType") || "";

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

    const currentMonthIdx = MONTHS_SHORT.indexOf(monthName);
    const prevDate = new Date(baseYear, currentMonthIdx - 1, 1);
    const prevMonthYear = prevDate.getFullYear();
    const prevMonthName = MONTHS_SHORT[prevDate.getMonth()];
    const lastYearSameMonthYear = baseYear - 1;

    const segmentName = rawSegmentName.toLowerCase().trim();
    const segmentType = rawSegmentType.toLowerCase().trim();

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

    // ✅ Build stream path safely even if id/parent_id types differ (number vs string)
    const buildPath = (id: number | string) => {
      const path: Array<number | string> = [];
      let cur = hierarchyData.find((n: any) => eqId(n.id, id));
      while (cur) {
        path.unshift(cur.id);
        const pid = cur.parent_id;
        if (pid == null) break;
        cur = hierarchyData.find((n: any) => eqId(n.id, pid));
      }
      return path.join(",");
    };

    // ✅ Country context (primary)
    const countryKey = normalizeCountryKey(rawCountry);
    const wantsNonIndia = !!rawCountry && countryKey !== "india";
    const ctx = resolveFlashReportContext(hierarchyData, rawCountry);

    // ✅ Robust fallback root resolver (in case ctx fails due to naming/parent_id)
    const getFallbackRoot = () => {
      const mainRoot =
        hierarchyData.find(
          (n: any) => normalize(n?.name || "") === "mainroot",
        ) || null;

      const flashReports =
        hierarchyData.find(
          (n: any) =>
            normalize(n?.name || "") === "flashreports" &&
            (!mainRoot || eqId(n.parent_id, mainRoot.id)),
        ) ||
        hierarchyData.find(
          (n: any) => normalize(n?.name || "") === "flashreports",
        ) ||
        null;

      if (!flashReports) return null;

      if (!wantsNonIndia) return flashReports;

      const countriesNode =
        hierarchyData.find(
          (n: any) =>
            eqId(n.parent_id, flashReports.id) &&
            normalize(n?.name || "") === "countries",
        ) || null;

      const countryNode =
        countriesNode
          ? hierarchyData.find(
              (n: any) =>
                eqId(n.parent_id, countriesNode.id) &&
                normalize(n?.name || "") === normalize(countryKey),
            ) || null
          : null;

      return countryNode;
    };

    const rootNode = ctx.dataRoot || getFallbackRoot();

    // If non-india requested but node missing → return [] (DON’T fall back to India)
    if (wantsNonIndia && !rootNode) return NextResponse.json([], { status: 200 });

    // If even India root missing → []
    if (!rootNode) return NextResponse.json([], { status: 200 });

    const isIndia = !wantsNonIndia;

    // ✅ Find segment ONLY under rootNode
    let segmentNode =
      hierarchyData.find(
        (n: any) =>
          eqId(n.parent_id, rootNode.id) &&
          normalize(n.name || "") === normalize(segmentName),
      ) || null;

    // Fallback ONLY for India (older behavior)
    if (!segmentNode && isIndia) {
      segmentNode =
        hierarchyData.find(
          (n: any) =>
            normalize(n.name || "") === normalize(segmentName) ||
            (normalize(segmentName) === "overall" &&
              normalize(n.name || "").includes("overall")),
        ) || null;
    }

    if (!segmentNode) return NextResponse.json([], { status: 200 });

    // Find segmentType node under segment
    const segmentTypeNode = hierarchyData.find(
      (n: any) =>
        eqId(n.parent_id, segmentNode.id) &&
        normalize(n.name || "").includes(
          segmentType ? normalize(segmentType) : "marketshare",
        ),
    );

    if (!segmentTypeNode) return NextResponse.json([], { status: 200 });

    const findYearNode = (y: number) =>
      hierarchyData.find(
        (n: any) =>
          eqId(n.parent_id, segmentTypeNode.id) &&
          String(n.name || "").trim() === String(y),
      ) || null;

    const findMonthNode = (y: number, m: string) => {
      const yearNode = findYearNode(y);
      if (!yearNode) return null;
      return (
        hierarchyData.find(
          (n: any) =>
            eqId(n.parent_id, yearNode.id) &&
            String(n.name || "").toLowerCase().trim() === m,
        ) || null
      );
    };

    const previousMonthNode = findMonthNode(prevMonthYear, prevMonthName);
    const currentMonthNode = findMonthNode(baseYear, monthName);
    const lastYearSameMonthNode = findMonthNode(lastYearSameMonthYear, monthName);

    const nodes = [previousMonthNode, currentMonthNode, lastYearSameMonthNode];
    const merged: Record<string, any> = {};

    for (const node of nodes) {
      if (!node) continue;

      const stream = buildPath(node.id);
      const volumeEntry = volumeData.find((v: any) => String(v.stream) === String(stream));
      if (!volumeEntry?.data?.data) continue;

      const nodeYear = hierarchyData.find((n: any) => eqId(n.id, node.parent_id))?.name;

      const label = `${String(node.name || "").toLowerCase().trim()} ${String(
        nodeYear || "",
      ).trim()}`;

      for (const [name, value] of Object.entries(volumeEntry.data.data)) {
        if (!merged[name]) merged[name] = { name };
        merged[name][label] = value;
      }
    }

    return NextResponse.json(Object.values(merged));
  } catch (err) {
    console.error("fetchMarketData error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}