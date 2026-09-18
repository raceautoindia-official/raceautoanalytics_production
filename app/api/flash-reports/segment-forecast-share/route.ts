import { NextResponse } from "next/server";
import {
  normalizeCountryKey,
  resolveFlashReportContext,
} from "@/lib/flashReportCountry";
import { requireProtectedDataAccess } from "@/lib/requestAuth";

export const dynamic = "force-dynamic";

/**
 * Segment forecast share — OEM share of a segment, per forecast month.
 *
 * Reads the same hierarchy + volume_data CMS structure every other flash chart
 * uses, from a "segment forecast" node beside the segment's "market share" node:
 *
 *   flash-reports → [countries → <country> →] <segment> → segment forecast
 *                   → <year> → <month>
 *   volume_data JSON: { data: { "<OEM NAME>": <percent> } }
 *
 * Values are percentages, exactly like the market-share node they sit beside,
 * so the chart can stack them into one column per month.
 *
 * Returns only months that actually carry data, so the UI can hide the whole
 * section rather than draw an empty frame.
 */

const MONTHS_SHORT = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
] as const;

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

function getOrigin(req: Request) {
  const url = new URL(req.url);
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = (forwardedHost || req.headers.get("host") || url.host).trim();

  let protocol = (forwardedProto || url.protocol.replace(":", "")).trim();
  if (!protocol) protocol = "http";
  protocol = protocol.split(",")[0].trim();

  const hostname = host.replace(/:\d+$/, "").trim().toLowerCase();
  const isPrivate172 = /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
  const isLocalOrPrivate =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    isPrivate172;

  if (protocol === "https" && isLocalOrPrivate) protocol = "http";
  return `${protocol}://${host}`;
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
  return (s || "").toLowerCase().trim().replace(/[\s\-_]+/g, "");
}

const sid = (v: any) => String(v ?? "");
const eqId = (a: any, b: any) => sid(a) === sid(b);

type MonthPoint = { month: string; label: string; values: Record<string, number> };

export async function GET(req: Request) {
  try {
    const access = await requireProtectedDataAccess(req, { allowTrial: true });
    if (!access.ok) {
      return NextResponse.json({ months: [], oems: [] }, { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const rawCountry = searchParams.get("country");
    const rawSegmentName = searchParams.get("segmentName") || "";
    const baseMonth = searchParams.get("baseMonth");
    const horizon = Math.min(
      12,
      Math.max(1, Number(searchParams.get("horizon")) || 6),
    );

    const parsed = parseBaseMonth(baseMonth);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid baseMonth (use YYYY-MM)", months: [], oems: [] },
        { status: 400 },
      );
    }

    const segmentName = rawSegmentName.toLowerCase().trim();

    const origin = getOrigin(req);
    const [hierarchyRes, volumeRes] = await Promise.all([
      fetch(`${origin}/api/contentHierarchy`, { cache: "no-store" }),
      fetch(`${origin}/api/volumeData`, { cache: "no-store" }),
    ]);
    if (!hierarchyRes.ok || !volumeRes.ok) {
      return NextResponse.json({ months: [], oems: [] }, { status: 200 });
    }
    const hierarchyData: any[] = await hierarchyRes.json();
    const volumeData: any[] = await volumeRes.json();

    const nodeById = new Map<string, any>();
    const childrenByParent = new Map<string, any[]>();
    for (const n of hierarchyData) {
      nodeById.set(sid(n.id), n);
      const pk = sid(n.parent_id);
      const arr = childrenByParent.get(pk);
      if (arr) arr.push(n);
      else childrenByParent.set(pk, [n]);
    }
    const volumeByStream = new Map<string, any>();
    for (const v of volumeData) volumeByStream.set(String(v.stream), v);

    const childrenOf = (id: any) => childrenByParent.get(sid(id)) || [];

    const buildPath = (id: number | string) => {
      const path: Array<number | string> = [];
      let cur = nodeById.get(sid(id));
      while (cur) {
        path.unshift(cur.id);
        if (cur.parent_id == null) break;
        cur = nodeById.get(sid(cur.parent_id));
      }
      return path.join(",");
    };

    // ---- Resolve country root (mirrors model-data / fetchMarketData) ----
    const countryKey = normalizeCountryKey(rawCountry);
    const wantsNonIndia = !!rawCountry && countryKey !== "india";
    const ctx = resolveFlashReportContext(hierarchyData, rawCountry);

    const getFallbackRoot = () => {
      const mainRoot =
        hierarchyData.find((n) => normalize(n?.name || "") === "mainroot") || null;
      const flashReports =
        hierarchyData.find(
          (n) =>
            normalize(n?.name || "") === "flashreports" &&
            (!mainRoot || eqId(n.parent_id, mainRoot.id)),
        ) ||
        hierarchyData.find((n) => normalize(n?.name || "") === "flashreports") ||
        null;
      if (!flashReports) return null;
      if (!wantsNonIndia) return flashReports;

      const countriesNode =
        childrenOf(flashReports.id).find(
          (n) => normalize(n?.name || "") === "countries",
        ) || null;
      return countriesNode
        ? childrenOf(countriesNode.id).find(
            (n) => normalize(n?.name || "") === normalize(countryKey),
          ) || null
        : null;
    };

    const rootNode = ctx.dataRoot || getFallbackRoot();
    if (!rootNode) return NextResponse.json({ months: [], oems: [] });
    const isIndia = !wantsNonIndia;

    // ---- Segment node under root ----
    let segmentNode =
      childrenOf(rootNode.id).find(
        (n) => normalize(n.name || "") === normalize(segmentName),
      ) || null;
    if (!segmentNode && isIndia) {
      segmentNode =
        hierarchyData.find(
          (n) => normalize(n.name || "") === normalize(segmentName),
        ) || null;
    }
    if (!segmentNode) return NextResponse.json({ months: [], oems: [] });

    // ---- "segment forecast" node under the segment ----
    // No other child of a segment carries "forecast" in its name (they are
    // market share / ev / app / model), so a contains-match is unambiguous and
    // tolerates the trailing-space naming seen elsewhere in the CMS.
    const forecastNode =
      childrenOf(segmentNode.id).find((n) =>
        normalize(n.name || "").includes("forecast"),
      ) || null;
    if (!forecastNode) return NextResponse.json({ months: [], oems: [] });

    // A month can appear more than once under a year (dirty CMS data); take the
    // instance that actually carries values.
    const resolveMonthData = (
      yearNode: any,
      monthName: string,
    ): Record<string, any> | null => {
      const candidates = childrenOf(yearNode.id).filter(
        (n) => normalize(n.name || "") === monthName,
      );
      for (const mn of candidates) {
        const entry = volumeByStream.get(buildPath(mn.id));
        const data = entry?.data?.data;
        if (data && typeof data === "object" && Object.keys(data).length) {
          return data as Record<string, any>;
        }
      }
      return null;
    };

    // ---- Walk the forecast window month by month ----
    const months: MonthPoint[] = [];
    const oemTotals: Record<string, number> = {};

    for (let i = 1; i <= horizon; i++) {
      const total = parsed.year * 12 + parsed.monthIndex + i;
      const year = Math.floor(total / 12);
      const mIdx = total % 12;

      const yearNode =
        childrenOf(forecastNode.id).find(
          (n) => String(n.name || "").trim() === String(year),
        ) || null;
      if (!yearNode) continue;

      const data = resolveMonthData(yearNode, MONTHS_SHORT[mIdx]);
      if (!data) continue;

      const values: Record<string, number> = {};
      for (const [name, raw] of Object.entries(data)) {
        if (raw == null) continue;
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0) continue;
        const oem = String(name).trim();
        values[oem] = value;
        oemTotals[oem] = (oemTotals[oem] || 0) + value;
      }
      if (!Object.keys(values).length) continue;

      months.push({
        month: `${year}-${String(mIdx + 1).padStart(2, "0")}`,
        label: `${MONTH_LABELS[mIdx]} ${String(year).slice(2)}`,
        values,
      });
    }

    // Largest share first, so the biggest OEM sits at the bottom of the stack.
    const oems = Object.keys(oemTotals).sort(
      (a, b) => oemTotals[b] - oemTotals[a],
    );

    return NextResponse.json({ baseMonth, horizon, months, oems });
  } catch (err) {
    console.error("segment-forecast-share error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", months: [], oems: [] },
      { status: 500 },
    );
  }
}
