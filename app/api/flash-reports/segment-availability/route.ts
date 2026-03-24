import { NextResponse } from "next/server";
import { resolveFlashReportContext } from "@/lib/flashReportCountry";
import { getOverallChartDataWithMeta } from "@/lib/flashReportsServer";

export const dynamic = "force-dynamic";

type BlockType = "marketShare" | "ev" | "app" | "segmentSplit" | "forecast";

type SegmentRule = {
  segmentNames: string[];
  blocks: BlockType[];
};

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

const SEGMENT_RULES: Record<string, SegmentRule> = {
  "overall-automotive-industry": {
    segmentNames: [],
    blocks: ["forecast"],
  },
  "two-wheeler": {
    segmentNames: ["two-wheeler", "two wheeler", "2w"],
    blocks: ["marketShare", "ev", "app", "forecast"],
  },
  "three-wheeler": {
    segmentNames: ["three-wheeler", "three wheeler", "3w"],
    blocks: ["marketShare", "ev", "app", "forecast"],
  },
  "commercial-vehicles": {
    segmentNames: [
      "commercial vehicle",
      "commercial vehicles",
      "commercial-vehicles",
      "cv",
    ],
    blocks: ["marketShare", "segmentSplit", "forecast"],
  },
  "passenger-vehicles": {
    segmentNames: [
      "passenger vehicle",
      "passenger vehicles",
      "passenger-vehicles",
      "pv",
    ],
    blocks: ["marketShare", "ev", "app", "forecast"],
  },
  tractor: {
    segmentNames: ["tractor", "trac"],
    blocks: ["marketShare", "app", "forecast"],
  },
  "construction-equipment": {
    segmentNames: [
      "construction equipment",
      "construction-equipment",
      "ce",
    ],
    blocks: ["marketShare", "ev", "app", "forecast"],
  },
};

const FORECAST_SERIES_KEY_BY_SEGMENT: Record<string, string> = {
  "overall-automotive-industry": "Total",
  "two-wheeler": "2W",
  "three-wheeler": "3W",
  "commercial-vehicles": "CV",
  "passenger-vehicles": "PV",
  tractor: "TRAC",
  "construction-equipment": "CE",
};

function getOrigin(req: Request) {
  return new URL(req.url).origin;
}

function prevMonthRefIST() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const y = Number(parts.find((p) => p.type === "year")?.value ?? "1970");
  const m = Number(parts.find((p) => p.type === "month")?.value ?? "01");
  const d = Number(parts.find((p) => p.type === "day")?.value ?? "01");

  const back = d < 5 ? 2 : 1;
  let year = y;
  let month = m - back;

  while (month <= 0) {
    month += 12;
    year -= 1;
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}

function parseBaseMonth(value?: string | null) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;

  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11) {
    return null;
  }

  return { year, monthIndex };
}

function norm(value: any) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[\s\-_]+/g, "");
}

function eqId(a: any, b: any) {
  return String(a ?? "") === String(b ?? "");
}

function buildPath(hierarchyData: any[], id: any) {
  const path: Array<number | string> = [];
  let current = hierarchyData.find((node) => eqId(node?.id, id));

  while (current) {
    path.unshift(current.id);
    const parentId = current.parent_id;
    if (parentId == null) break;
    current = hierarchyData.find((node) => eqId(node?.id, parentId));
  }

  return path.join(",");
}

function toNumberLoose(value: any) {
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    if (!cleaned) return Number.NaN;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function hasPositivePayload(payload: any) {
  if (!payload || typeof payload !== "object") return false;

  return Object.values(payload).some((value) => {
    const num = toNumberLoose(value);
    return Number.isFinite(num) && num > 0;
  });
}

function findChild(
  hierarchyData: any[],
  parentId: any,
  matcher: (node: any) => boolean,
) {
  return (
    hierarchyData.find(
      (node) => eqId(node?.parent_id, parentId) && matcher(node),
    ) || null
  );
}

function findSegmentNode(
  hierarchyData: any[],
  rootId: any,
  candidates: string[],
) {
  const names = candidates.map(norm);
  return findChild(
    hierarchyData,
    rootId,
    (node) => names.includes(norm(node?.name)),
  );
}

function findTypeNode(
  hierarchyData: any[],
  segmentId: any,
  block: BlockType,
) {
  return findChild(hierarchyData, segmentId, (node) => {
    const nodeName = norm(node?.name);

    if (block === "marketShare") return nodeName.includes("marketshare");
    if (block === "ev") return nodeName === "ev";
    if (block === "app") return nodeName === "app";
    if (block === "segmentSplit") return nodeName === "segmentsplit";

    return false;
  });
}

function hasForecastSeriesData(
  segmentId: string,
  overallPoints: Array<{ data?: Record<string, any> }> = [],
) {
  const seriesKey = FORECAST_SERIES_KEY_BY_SEGMENT[segmentId];
  if (!seriesKey) return false;

  return overallPoints.some((point) => {
    const value = point?.data?.[seriesKey];
    const num = toNumberLoose(value);
    return Number.isFinite(num) && num > 0;
  });
}

function hasBlockData(params: {
  hierarchyData: any[];
  volumeData: any[];
  rootId: any;
  segmentNames: string[];
  block: BlockType;
  year: number;
  monthName: string;
}) {
  const {
    hierarchyData,
    volumeData,
    rootId,
    segmentNames,
    block,
    year,
    monthName,
  } = params;

  const segmentNode = findSegmentNode(hierarchyData, rootId, segmentNames);
  if (!segmentNode) return false;

  const typeNode = findTypeNode(hierarchyData, segmentNode.id, block);
  if (!typeNode) return false;

  const yearNode = findChild(
    hierarchyData,
    typeNode.id,
    (node) => String(node?.name || "").trim() === String(year),
  );
  if (!yearNode) return false;

  const monthNode = findChild(
    hierarchyData,
    yearNode.id,
    (node) => norm(node?.name) === monthName,
  );
  if (!monthNode) return false;

  const stream = buildPath(hierarchyData, monthNode.id);
  const volumeEntry = volumeData.find(
    (entry) => String(entry?.stream) === String(stream),
  );

  return hasPositivePayload(volumeEntry?.data?.data);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const month = searchParams.get("month") || prevMonthRefIST();
    const country = searchParams.get("country") || undefined;

    const parsed = parseBaseMonth(month);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid month. Use YYYY-MM." },
        { status: 400 },
      );
    }

    const { year, monthIndex } = parsed;
    const monthName = MONTHS_SHORT[monthIndex];

    const origin = getOrigin(req);
    const [hierarchyRes, volumeRes] = await Promise.all([
      fetch(`${origin}/api/contentHierarchy`, { cache: "no-store" }),
      fetch(`${origin}/api/volumeData`, { cache: "no-store" }),
    ]);

    if (!hierarchyRes.ok || !volumeRes.ok) {
      return NextResponse.json({
        month,
        country: country || "india",
        segments: {},
      });
    }

    const hierarchyData = await hierarchyRes.json();
    const volumeData = await volumeRes.json();

    const ctx = resolveFlashReportContext(hierarchyData, country);
    const rootNode = ctx.dataRoot;
    const countryLabel =
      ctx.countryKey === "india"
        ? "India"
        : String(rootNode?.name || country || "Selected country").trim();

    if (!rootNode) {
      const emptySegments = Object.fromEntries(
        Object.keys(SEGMENT_RULES).map((segmentId) => [
          segmentId,
          {
            isAvailable: false,
            availableBlocks: [],
            missingBlocks: SEGMENT_RULES[segmentId].blocks,
            message: `Data for this segment will be available soon in ${countryLabel}.`,
          },
        ]),
      );

      return NextResponse.json({
        month,
        country: countryLabel,
        segments: emptySegments,
      });
    }

    let overallChartPoints: Array<{ data?: Record<string, any> }> = [];

    try {
      const overallChart = await getOverallChartDataWithMeta({
        baseMonth: month,
        horizon: 6,
        country,
      });

      overallChartPoints = Array.isArray(overallChart?.data)
        ? overallChart.data
        : [];
    } catch (error) {
      console.error("segment-availability overall-chart check error:", error);
      overallChartPoints = [];
    }

    const segments: Record<string, any> = {};

    for (const [segmentId, rule] of Object.entries(SEGMENT_RULES)) {
      if (segmentId === "overall-automotive-industry") continue;

      const availableBlocks = rule.blocks.filter((block) => {
        if (block === "forecast") {
          return hasForecastSeriesData(segmentId, overallChartPoints);
        }

        return hasBlockData({
          hierarchyData,
          volumeData,
          rootId: rootNode.id,
          segmentNames: rule.segmentNames,
          block,
          year,
          monthName,
        });
      });

      segments[segmentId] = {
        isAvailable: availableBlocks.length > 0,
        availableBlocks,
        missingBlocks: rule.blocks.filter(
          (block) => !availableBlocks.includes(block),
        ),
        message:
          availableBlocks.length > 0
            ? ""
            : `Data for this segment will be available soon in ${countryLabel}.`,
      };
    }

    const anyOtherSegmentAvailable = Object.values(segments).some(
      (item: any) => item?.isAvailable,
    );

    const overallForecastAvailable = hasForecastSeriesData(
      "overall-automotive-industry",
      overallChartPoints,
    );

    segments["overall-automotive-industry"] = {
      isAvailable: anyOtherSegmentAvailable || overallForecastAvailable,
      availableBlocks: [
        ...(overallForecastAvailable ? ["forecast"] : []),
        ...(anyOtherSegmentAvailable ? ["overview"] : []),
      ],
      missingBlocks: ["forecast", "overview"].filter((block) => {
        if (block === "forecast") return !overallForecastAvailable;
        return !anyOtherSegmentAvailable;
      }),
      message:
        anyOtherSegmentAvailable || overallForecastAvailable
          ? ""
          : `Data for this segment will be available soon in ${countryLabel}.`,
    };

    return NextResponse.json({
      month,
      country: countryLabel,
      segments,
    });
  } catch (error) {
    console.error("segment-availability error:", error);
    return NextResponse.json(
      { error: "Failed to load segment availability" },
      { status: 500 },
    );
  }
}