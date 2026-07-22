import { NextResponse } from "next/server";
import {
  normalizeCountryKey,
  resolveFlashReportContext,
} from "@/lib/flashReportCountry";
import { requireProtectedDataAccess } from "@/lib/requestAuth";

export const dynamic = "force-dynamic";

// Brand → sub-model sales bar chart data. Same hierarchy + volume_data source as
// the OEM market-share chart (/api/fetchMarketData), but reads the segment's
// "model"/"models" node instead of "market share":
//
//   flash-reports → [countries → <country> →] <segment> → model(s) → <BRAND>
//                   → <year> → <month>   (volume_data JSON: { <modelName>: value|null })
//
// Only the brand's own models carry values (the rest of the shared model list is
// null), so we keep non-null, > 0 values. Returns only brands that actually have
// data for the requested month, so the UI can hide the whole chart when empty.

const MONTHS_SHORT = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
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

type ModelPoint = { name: string; value: number };
type BrandModels = { brand: string; models: ModelPoint[] };

export async function GET(req: Request) {
  try {
    const access = await requireProtectedDataAccess(req, { allowTrial: true });
    if (!access.ok) {
      return NextResponse.json({ brands: [] }, { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const rawCountry = searchParams.get("country");
    const rawSegmentName = searchParams.get("segmentName") || "";
    const baseMonth = searchParams.get("baseMonth");

    const parsed = parseBaseMonth(baseMonth);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid baseMonth (use YYYY-MM)", brands: [] },
        { status: 400 },
      );
    }
    const { year: baseYear, monthIndex } = parsed;
    const monthName = MONTHS_SHORT[monthIndex];
    const segmentName = rawSegmentName.toLowerCase().trim();

    const origin = getOrigin(req);
    const [hierarchyRes, volumeRes] = await Promise.all([
      fetch(`${origin}/api/contentHierarchy`, { cache: "no-store" }),
      fetch(`${origin}/api/volumeData`, { cache: "no-store" }),
    ]);
    if (!hierarchyRes.ok || !volumeRes.ok) {
      return NextResponse.json({ brands: [] }, { status: 200 });
    }
    const hierarchyData: any[] = await hierarchyRes.json();
    const volumeData: any[] = await volumeRes.json();

    // Index once — the tree is ~30k nodes; repeated .find would be slow.
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

    // ---- Resolve country root (mirrors fetchMarketData) ----
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
      const countryNode = countriesNode
        ? childrenOf(countriesNode.id).find(
            (n) => normalize(n?.name || "") === normalize(countryKey),
          ) || null
        : null;
      return countryNode;
    };

    const rootNode = ctx.dataRoot || getFallbackRoot();
    if (wantsNonIndia && !rootNode) return NextResponse.json({ brands: [] });
    if (!rootNode) return NextResponse.json({ brands: [] });
    const isIndia = !wantsNonIndia;

    // ---- Segment node under root ----
    let segmentNode =
      childrenOf(rootNode.id).find(
        (n) => normalize(n.name || "") === normalize(segmentName),
      ) || null;
    if (!segmentNode && isIndia) {
      segmentNode =
        hierarchyData.find(
          (n) =>
            normalize(n.name || "") === normalize(segmentName) ||
            (normalize(segmentName) === "overall" &&
              normalize(n.name || "").includes("overall")),
        ) || null;
    }
    if (!segmentNode) return NextResponse.json({ brands: [] });

    // ---- "model" / "models" node under segment ----
    const modelsNode =
      childrenOf(segmentNode.id).find((n) =>
        normalize(n.name || "").includes("model"),
      ) || null;
    if (!modelsNode) return NextResponse.json({ brands: [] });

    // ---- Each brand → year → month → volume JSON ----
    const findYearNode = (brandId: any) =>
      childrenOf(brandId).find(
        (n) => String(n.name || "").trim() === String(baseYear),
      ) || null;

    // A month can appear more than once under a year (dirty data); pick the
    // instance that actually has a volume_data row with values.
    const resolveMonthData = (yearNode: any): Record<string, any> | null => {
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

    const brands: BrandModels[] = [];
    for (const brand of childrenOf(modelsNode.id)) {
      const yearNode = findYearNode(brand.id);
      if (!yearNode) continue;
      const data = resolveMonthData(yearNode);
      if (!data) continue;

      const models: ModelPoint[] = [];
      for (const [name, raw] of Object.entries(data)) {
        if (raw == null) continue;
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0) continue;
        models.push({ name: String(name).trim(), value });
      }
      if (!models.length) continue;
      models.sort((a, b) => b.value - a.value);
      brands.push({ brand: String(brand.name || "").trim(), models });
    }

    brands.sort((a, b) => a.brand.localeCompare(b.brand));
    return NextResponse.json({
      month: `${baseYear}-${String(monthIndex + 1).padStart(2, "0")}`,
      brands,
    });
  } catch (err) {
    console.error("model-data error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", brands: [] },
      { status: 500 },
    );
  }
}
