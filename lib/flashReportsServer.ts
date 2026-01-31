// lib/flashReportsServer.ts
import "server-only";

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
  allowForecast: boolean; // true only when baseMonth is previous IST month
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
  if (normalizedKey === "total") return "Total";

  return null;
}

function getPrevMonthIST(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const y = Number(parts.find((p) => p.type === "year")?.value ?? "1970");
  const m = Number(parts.find((p) => p.type === "month")?.value ?? "01");

  let year = y;
  let month = m - 1;
  if (month <= 0) {
    month = 12;
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
    if (out.length > 240) break; // safety
  }
  return out;
}

function buildWindowMonths(
  baseMonth: string,
  horizon: number,
  allowForecast: boolean,
): string[] {
  if (allowForecast) {
    // 10 months total: baseMonth-3 ... baseMonth+horizon (horizon default 6)
    const start = addMonths(baseMonth, -3);
    const end = addMonths(baseMonth, horizon);
    return monthsInclusive(start, end);
  }
  // old month view: strictly historical 10 months ending at baseMonth
  const start = addMonths(baseMonth, -9);
  const end = baseMonth;
  return monthsInclusive(start, end);
}

// ✅ main function with meta
export async function getOverallChartDataWithMeta(opts?: {
  baseMonth?: string;
  horizon?: number;
  forceHistorical?: boolean;
}): Promise<OverallChartResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_BACKEND_URL is not set");

  const token = process.env.BACKEND_API_TOKEN;
  if (!token) throw new Error("BACKEND_API_TOKEN is not set");

  const horizon = Number.isFinite(opts?.horizon) ? Number(opts?.horizon) : 6;

  const prevMonthIST = getPrevMonthIST();
  const baseMonth = isYYYYMM(opts?.baseMonth)
    ? String(opts?.baseMonth)
    : prevMonthIST;

  // ✅ forecast only allowed when baseMonth == previous IST calendar month
  const allowForecast = !opts?.forceHistorical && baseMonth === prevMonthIST;

  const windowMonths = buildWindowMonths(baseMonth, horizon, allowForecast);
  const targetMonthsSet = new Set(windowMonths);

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

  if (!hierarchyRes.ok || !volumeRes.ok)
    throw new Error("Failed to fetch content hierarchy or volume data");

  const hierarchyData = await hierarchyRes.json();
  const volumeData = await volumeRes.json();

  const mainRoot = hierarchyData.find(
    (n: any) => n.name?.toLowerCase() === "main root",
  );
  if (!mainRoot) {
    // Important: return nulls (empty data) not zeros.
    // Zeros get treated as real observations and will corrupt regression and forecasts.
    return {
      data: windowMonths.map((m) => ({ month: m, data: {} })),
      meta: { baseMonth, allowForecast, horizon, windowMonths },
    };
  }

  const flashReports = hierarchyData.find(
    (n: any) =>
      n.name?.toLowerCase() === "flash-reports" && n.parent_id === mainRoot.id,
  );
  if (!flashReports) {
    return {
      data: windowMonths.map((m) => ({ month: m, data: {} })),
      meta: { baseMonth, allowForecast, horizon, windowMonths },
    };
  }

  const overall = hierarchyData.find(
    (n: any) =>
      n.name?.toLowerCase() === "overall" && n.parent_id === flashReports.id,
  );
  if (!overall) {
    return {
      data: windowMonths.map((m) => ({ month: m, data: {} })),
      meta: { baseMonth, allowForecast, horizon, windowMonths },
    };
  }

  const yearNodes = hierarchyData.filter(
    (n: any) => n.parent_id === overall.id,
  );

  // map month -> data
  const byMonth = new Map<string, Record<string, number>>();

  for (const yearNode of yearNodes) {
    const year = String(yearNode.name);
    const monthNodes = hierarchyData.filter(
      (n: any) => n.parent_id === yearNode.id,
    );

    for (const monthNode of monthNodes) {
      const monthIndex = monthsList.indexOf(
        String(monthNode.name).toLowerCase(),
      );
      if (monthIndex === -1) continue;

      const formattedMonth = `${year}-${String(monthIndex + 1).padStart(
        2,
        "0",
      )}`;
      if (!targetMonthsSet.has(formattedMonth)) continue;

      const streamPath = [
        mainRoot.id,
        flashReports.id,
        overall.id,
        yearNode.id,
        monthNode.id,
      ].join(",");
      const matchedEntry = volumeData.find((v: any) => v.stream === streamPath);
      if (!matchedEntry?.data) continue;

      const rawData = (matchedEntry.data as any).data ?? matchedEntry.data;

      const data: Record<string, number> = {};
      for (const [key, value] of Object.entries(rawData)) {
        const catKey = mapBackendKeyToCategory(
          String(key).toLowerCase().trim(),
        );
        if (!catKey) continue;
        const num = Number(value);
        if (Number.isFinite(num)) data[catKey] = num;
      }

      // ✅ Trust DB Total if present; compute only as fallback
      const hasStoredTotal = Number.isFinite(data["Total"]);

      if (!hasStoredTotal) {
        const catKeys = ["2W", "3W", "PV", "TRAC", "CV", "CE"];
        const total = catKeys.reduce((sum, k) => sum + (data[k] || 0), 0);
        data["Total"] = total;
      }

      byMonth.set(formattedMonth, data);
    }
  }

  // Include all months for windowing, but do NOT invent zeros for missing months.
  // Missing months must stay null so charts and regressions can ignore them.
  const points: OverallChartPoint[] = windowMonths.map((m) => ({
    month: m,
    data: byMonth.get(m) ?? {},
  }));

  return {
    data: points,
    meta: { baseMonth, allowForecast, horizon, windowMonths },
  };
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

  const res = await fetch(
    `${siteUrl}/api/fetchMarketBarData?${qs.toString()}`,
    {
      cache: "no-store",
    },
  );

  if (!res.ok) return null;
  return (await res.json()) as MarketBarRawData;
}
