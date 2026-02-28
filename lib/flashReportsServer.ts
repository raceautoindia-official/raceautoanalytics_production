// lib/flashReportsServer.ts
import "server-only";
import { normalizeCountryKey } from "./flashReportCountry";

const monthsList = [
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

export type OverallChartPoint = {
  month: string; // "YYYY-MM"
  data: Record<string, number>; // 2W,3W,PV,TRAC,Truck,Bus,CV,CE,Total
};

export type OverallChartMeta = {
  baseMonth: string; // YYYY-MM
  allowForecast: boolean; // true only when baseMonth is latest available month (5th cutoff)
  horizon: number; // months ahead (used only if allowForecast)
  windowMonths: string[]; // final months used in chart
};

export type OverallChartResponse = {
  data: OverallChartPoint[];
  meta: OverallChartMeta;
};

function mapBackendKeyToCategory(normalizedKey: string): string | null {
  if (
    normalizedKey === "two wheeler" ||
    normalizedKey === "2-wheeler" ||
    normalizedKey === "two-wheeler" ||
    normalizedKey === "2w"
  )
    return "2W";
  if (
    normalizedKey === "three wheeler" ||
    normalizedKey === "3-wheeler" ||
    normalizedKey === "three-wheeler" ||
    normalizedKey === "3w"
  )
    return "3W";
  if (
    normalizedKey === "passenger" ||
    normalizedKey === "passenger vehicle" ||
    normalizedKey === "pv"
  )
    return "PV";
  if (normalizedKey === "tractor" || normalizedKey === "trac") return "TRAC";
  if (normalizedKey === "cv" || normalizedKey === "commercial vehicle")
    return "CV";
  if (normalizedKey === "truck") return "Truck";
  if (normalizedKey === "bus") return "Bus";
  if (
    normalizedKey === "ce" ||
    normalizedKey === "constructionequipment" ||
    normalizedKey === "construction equipment" ||
    normalizedKey === "construction-equipment"
  )
    return "CE";
  // ✅ IMPORTANT: keep and trust stored Total if present in DB
  if (normalizedKey === "total") return "Total";
  return null;
}

function getPrevMonthIST(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = Number(parts.find((p) => p.type === "year")?.value ?? "1970");
  const m = Number(parts.find((p) => p.type === "month")?.value ?? "01");
  const d = Number(parts.find((p) => p.type === "day")?.value ?? "01");

  const cutoffDay = 5;
  const back = d >= cutoffDay ? 1 : 2;

  let year = y;
  let month = m - back;
  while (month <= 0) {
    month += 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

function isYYYYMM(s?: string | null) {
  return !!s && /^\d{4}-\d{2}$/.test(s);
}

function addMonths(yyyymm: string, delta: number): string {
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthsInclusive(startYYYYMM: string, endYYYYMM: string): string[] {
  const out: string[] = [];
  let cur = startYYYYMM;
  while (cur <= endYYYYMM) {
    out.push(cur);
    cur = addMonths(cur, 1);
    if (out.length > 240) break;
  }
  return out;
}

function buildWindowMonths(
  baseMonth: string,
  horizon: number,
  allowForecast: boolean,
): string[] {
  if (allowForecast) {
    const start = addMonths(baseMonth, -3);
    const end = addMonths(baseMonth, horizon);
    return monthsInclusive(start, end);
  }
  const start = addMonths(baseMonth, -9);
  const end = baseMonth;
  return monthsInclusive(start, end);
}

function normName(s: any) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[\s\-_]+/g, "");
}

function toNumLoose(v: any) {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/,/g, "").trim();
    if (!cleaned) return NaN;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

// ✅ main function with meta
export async function getOverallChartDataWithMeta(opts?: {
  baseMonth?: string;
  horizon?: number;
  forceHistorical?: boolean;
  segmentName?: string;
  country?: string;
  debug?: boolean;
}): Promise<OverallChartResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_BACKEND_URL is not set");

  const token = process.env.BACKEND_API_TOKEN;
  if (!token) throw new Error("BACKEND_API_TOKEN is not set");

  const DBG = (...args: any[]) => {
    if (opts?.debug) console.log("[overallChart-debug]", ...args);
  };

  const horizon = Number.isFinite(opts?.horizon) ? Number(opts?.horizon) : 6;

  const prevMonthIST = getPrevMonthIST();
  const baseMonth = isYYYYMM(opts?.baseMonth)
    ? String(opts?.baseMonth)
    : prevMonthIST;

  const allowForecast = !opts?.forceHistorical && baseMonth === prevMonthIST;

  const windowMonths = buildWindowMonths(baseMonth, horizon, allowForecast);

  // ✅ country flags (India behavior unchanged)
  const countryKey = normalizeCountryKey(opts?.country);
  const wantsNonIndia = !!opts?.country && countryKey !== "india";

  const backendBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const siteUrlRaw = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const siteUrl = siteUrlRaw.replace(/\/$/, "");

  const loadBackend = async () => {
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

    if (!hierarchyRes.ok || !volumeRes.ok)
      throw new Error("Failed to fetch backend hierarchy/volume");

    return {
      hierarchyData: await hierarchyRes.json(),
      volumeData: await volumeRes.json(),
    };
  };

  const loadLocal = async () => {
    const [hierarchyRes, volumeRes] = await Promise.all([
      fetch(`${siteUrl}/api/contentHierarchy`, { cache: "no-store" }),
      fetch(`${siteUrl}/api/volumeData`, { cache: "no-store" }),
    ]);

    if (!hierarchyRes.ok || !volumeRes.ok)
      throw new Error("Failed to fetch local hierarchy/volume");

    return {
      hierarchyData: await hierarchyRes.json(),
      volumeData: await volumeRes.json(),
    };
  };

  // ✅ compute using the SAME reliable path logic for India + all countries
  const computeFrom = (hierarchyData: any[], volumeData: any[]): OverallChartResponse => {
    const sid = (v: any) => String(v ?? "");
    const eqId = (a: any, b: any) => sid(a) === sid(b);

    // Build full stream path by walking parents
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

    // Fast stream lookup
    const volumeByStream = new Map<string, any>();
    for (const v of volumeData || []) volumeByStream.set(String(v.stream), v);

    const mainRoot =
      hierarchyData.find((n: any) => normName(n?.name) === "mainroot") ||
      hierarchyData.find((n: any) => normName(n?.name) === "mainroot") ||
      hierarchyData.find((n: any) => normName(n?.name) === "mainroot") ||
      hierarchyData.find((n: any) => normName(n?.name) === "mainroot") ||
      hierarchyData.find((n: any) => normName(n?.name) === "mainroot") ||
      hierarchyData.find((n: any) => String(n.name || "").toLowerCase().trim() === "main root") ||
      null;

    if (!mainRoot) {
      return {
        data: windowMonths.map((m) => ({ month: m, data: {} })),
        meta: { baseMonth, allowForecast, horizon, windowMonths },
      };
    }

    const flashReports =
      hierarchyData.find(
        (n: any) =>
          eqId(n.parent_id, mainRoot.id) && normName(n?.name) === "flashreports",
      ) ||
      hierarchyData.find(
        (n: any) =>
          eqId(n.parent_id, mainRoot.id) &&
          String(n.name || "").toLowerCase().trim() === "flash-reports",
      ) ||
      null;

    if (!flashReports) {
      return {
        data: windowMonths.map((m) => ({ month: m, data: {} })),
        meta: { baseMonth, allowForecast, horizon, windowMonths },
      };
    }

    // ✅ resolve root node exactly like your probe (this is the key fix)
    let rootNode: any = flashReports;

    if (wantsNonIndia) {
      const countriesNode =
        hierarchyData.find(
          (n: any) =>
            eqId(n.parent_id, flashReports.id) &&
            normName(n?.name) === "countries",
        ) || null;

      const countryNode =
        countriesNode
          ? hierarchyData.find(
              (n: any) =>
                eqId(n.parent_id, countriesNode.id) &&
                normName(n?.name) === normName(countryKey),
            ) || null
          : null;

      if (!countryNode) {
        // non-india requested but not present -> empty
        return {
          data: windowMonths.map((m) => ({ month: m, data: {} })),
          meta: { baseMonth, allowForecast, horizon, windowMonths },
        };
      }

      rootNode = countryNode;
    }

    const overall =
      hierarchyData.find(
        (n: any) =>
          eqId(n.parent_id, rootNode.id) &&
          String(n.name || "").toLowerCase().trim() === "overall",
      ) || null;

    if (!overall) {
      return {
        data: windowMonths.map((m) => ({ month: m, data: {} })),
        meta: { baseMonth, allowForecast, horizon, windowMonths },
      };
    }

    DBG("country:", opts?.country, "rootNode:", rootNode?.id, rootNode?.name);
    DBG("overall:", overall?.id, overall?.name);

    const byMonth = new Map<string, Record<string, number>>();

    // ✅ robust: drive traversal from windowMonths (YYYY-MM)
    for (const yyyymm of windowMonths) {
      const [yy, mmStr] = String(yyyymm).split("-");
      const mm = Number(mmStr);
      if (!yy || !Number.isFinite(mm) || mm < 1 || mm > 12) continue;

      const yearNode =
        hierarchyData.find(
          (n: any) =>
            eqId(n.parent_id, overall.id) &&
            String(n.name || "").trim() === String(yy).trim(),
        ) || null;

      if (!yearNode) continue;

      const monthShort = monthsList[mm - 1];
      const monthNode =
        hierarchyData.find(
          (n: any) =>
            eqId(n.parent_id, yearNode.id) &&
            String(n.name || "").toLowerCase().trim() === monthShort,
        ) || null;

      if (!monthNode) continue;

      const streamPath = buildPath(monthNode.id);
      const matchedEntry = volumeByStream.get(String(streamPath));
      if (!matchedEntry?.data) continue;

      // handle both shapes: {data:{...}} and {...}
      const raw1 = (matchedEntry.data as any).data ?? matchedEntry.data;
      const rawData =
        raw1 &&
        typeof raw1 === "object" &&
        (raw1 as any).data &&
        typeof (raw1 as any).data === "object"
          ? (raw1 as any).data
          : raw1;

      const data: Record<string, number> = {};
      for (const [key, value] of Object.entries(rawData || {})) {
        const catKey = mapBackendKeyToCategory(String(key).toLowerCase().trim());
        if (!catKey) continue;
        const num = toNumLoose(value);
        if (Number.isFinite(num)) data[catKey] = num;
      }

      // ✅ TOTAL RULE unchanged
      if (!Number.isFinite(data["Total"])) {
        const baseKeys = ["2W", "3W", "PV", "TRAC", "CE"];
        const baseSum = baseKeys.reduce((sum, k) => sum + (data[k] || 0), 0);

        const cv = data["CV"] || 0;
        const truck = data["Truck"] || 0;
        const bus = data["Bus"] || 0;

        data["Total"] = cv > 0 ? baseSum + cv : baseSum + truck + bus;
      }

      byMonth.set(yyyymm, data);
    }

    const points: OverallChartPoint[] = windowMonths.map((m) => ({
      month: m,
      data: byMonth.get(m) ?? {},
    }));

    return {
      data: points,
      meta: { baseMonth, allowForecast, horizon, windowMonths },
    };
  };

  // ✅ INDIA: keep existing behavior (backend only)
  if (!wantsNonIndia) {
    const backend = await loadBackend();
    return computeFrom(backend.hierarchyData, backend.volumeData);
  }

  // ✅ NON-INDIA: backend first; if empty, fallback to local
  const backend = await loadBackend();
  const resBackend = computeFrom(backend.hierarchyData, backend.volumeData);
  const hasAnyBackend = resBackend.data.some(
    (p) => Object.keys(p.data || {}).length > 0,
  );

  if (hasAnyBackend) return resBackend;

  const local = await loadLocal();
  return computeFrom(local.hierarchyData, local.volumeData);
}

// Backwards-compatible helper (if anything still calls it)
export async function getOverallChartData(opts?: {
  baseMonth?: string;
  horizon?: number;
}): Promise<OverallChartPoint[]> {
  const res = await getOverallChartDataWithMeta(opts);
  return res.data;
}

// ---- OVERALL PAGE TEXT (SERVER) ----
export async function getOverallText() {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_BACKEND_URL is not set");

  const res = await fetch(
    `${baseUrl}api/admin/flash-dynamic/flash-reports-text`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Failed to fetch overall text");
  return res.json();
}

export type MarketBarRawData = {
  [category: string]: { [monthLabel: string]: number };
};

export async function getMarketBarRawData(
  segmentName: string,
  baseMonth?: string,
): Promise<MarketBarRawData | null> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const qs = new URLSearchParams({
    segmentName,
    ...(baseMonth ? { baseMonth } : {}),
  });

  const res = await fetch(`${siteUrl}/api/fetchMarketBarData?${qs.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) return null;
  return (await res.json()) as MarketBarRawData;
}