export type SummaryCompareMode = "mom" | "yoy";

export type SummaryRow = {
  name: string;
  current: number;
  previous?: number;
  deltaPct: number | null;
};

type SummaryOptions = {
  rows?: SummaryRow[] | null;
  compareMode: SummaryCompareMode;
  emptyMessage: string;
  metricLabel: string;
};

function formatDelta(delta: number, decimals = 1) {
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(decimals)}%`;
}

function isOthers(name: string) {
  return name.trim().toLowerCase() === "others";
}

export function buildLeadershipGrowthSummary({
  rows,
  compareMode,
  emptyMessage,
  metricLabel,
}: SummaryOptions) {
  if (!rows?.length) return emptyMessage;

  const validRows = rows.filter(
    (row) => row && row.name && !isOthers(row.name) && Number.isFinite(row.current),
  );

  if (!validRows.length) return emptyMessage;

  const leader = validRows[0];
  const compareLabel = compareMode === "mom" ? "month-on-month" : "year-on-year";
  const versusLabel = compareMode === "mom" ? "previous month" : "same month last year";

  const growthCandidates = validRows.filter((row) => Number.isFinite(row.deltaPct as number));
  const distinctGrowthCandidates = growthCandidates.filter((row) => row.name !== leader.name);
  const growthSource = distinctGrowthCandidates.length ? distinctGrowthCandidates : growthCandidates;
  const growthPerformer = [...growthSource].sort(
    (a, b) => (b.deltaPct ?? Number.NEGATIVE_INFINITY) - (a.deltaPct ?? Number.NEGATIVE_INFINITY),
  )[0];

  if (!growthPerformer) {
    return `${leader.name} leads with ${leader.current.toFixed(1)}% ${metricLabel}.`;
  }

  const growthDelta = growthPerformer.deltaPct ?? 0;

  if (growthPerformer.name === leader.name) {
    if (growthDelta > 0) {
      return `${leader.name} leads with ${leader.current.toFixed(1)}% ${metricLabel} and is also the fastest-growing performer, up ${formatDelta(growthDelta)} ${compareLabel} versus ${versusLabel}.`;
    }
    if (growthDelta === 0) {
      return `${leader.name} leads with ${leader.current.toFixed(1)}% ${metricLabel} and remained flat ${compareLabel} versus ${versusLabel}.`;
    }
    return `${leader.name} leads with ${leader.current.toFixed(1)}% ${metricLabel} despite a ${formatDelta(growthDelta)} ${compareLabel} move versus ${versusLabel}.`;
  }

  if (growthDelta > 0) {
    return `${leader.name} leads with ${leader.current.toFixed(1)}% ${metricLabel}, while ${growthPerformer.name} is the fastest-growing performer at ${formatDelta(growthDelta)} ${compareLabel} to ${growthPerformer.current.toFixed(1)}% versus ${versusLabel}.`;
  }

  if (growthDelta === 0) {
    return `${leader.name} leads with ${leader.current.toFixed(1)}% ${metricLabel}, while ${growthPerformer.name} remained flat ${compareLabel} at ${growthPerformer.current.toFixed(1)}% versus ${versusLabel}.`;
  }

  return `${leader.name} leads with ${leader.current.toFixed(1)}% ${metricLabel}, while ${growthPerformer.name} recorded the mildest decline at ${formatDelta(growthDelta)} ${compareLabel} to ${growthPerformer.current.toFixed(1)}% versus ${versusLabel}.`;
}

export function formatSignedPercent(value: number | null | undefined, decimals = 0) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

export function formatGrowthWithYoY(
  current: number | null | undefined,
  previous: number | null | undefined,
  previousYear: number | null | undefined,
  decimals = 0,
) {
  const curr = Number(current ?? NaN);
  const prev = Number(previous ?? NaN);
  const prevYr = Number(previousYear ?? NaN);

  const mom = Number.isFinite(curr) && Number.isFinite(prev) && prev > 0
    ? ((curr - prev) / prev) * 100
    : null;

  const yoy = Number.isFinite(curr) && Number.isFinite(prevYr) && prevYr > 0
    ? ((curr - prevYr) / prevYr) * 100
    : null;

  return {
    mom,
    yoy,
    text: `${formatSignedPercent(mom, decimals)} MoM`,
  };
}

const MONTHS_TITLE = [
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

export function toUiMonthLabel(yyyymm: string) {
  const [y, m] = String(yyyymm || "").split("-");
  const mi = Number(m) - 1;
  return `${MONTHS_TITLE[mi] ?? "Jan"} ${y}`;
}

export function getAltFuelMonthShare(
  altFuelData: Record<string, Record<string, number>> | null | undefined,
  categoryKey: string,
  baseMonth: string,
) {
  const category = altFuelData?.[categoryKey];
  if (!category || typeof category !== "object") return null;

  const exactLabel = toUiMonthLabel(baseMonth);
  const exactValue = Number(category[exactLabel]);
  if (Number.isFinite(exactValue)) return exactValue;

  const keys = Object.keys(category);
  if (!keys.length) return null;
  const fallbackValue = Number(category[keys[keys.length - 1]]);
  return Number.isFinite(fallbackValue) ? fallbackValue : null;
}

export function formatAltFuelHeaderLabel(
  altFuelData: Record<string, Record<string, number>> | null | undefined,
  categoryKey: string,
  baseMonth: string,
) {
  const value = getAltFuelMonthShare(altFuelData, categoryKey, baseMonth);
  if (value == null) return "—";
  return `${value.toFixed(1)}%`;
}

export function formatLeadingOemLabel(
  topRowOrRows:
    | { name?: string | null; current?: number | null }
    | Array<{ name?: string | null; current?: number | null }>
    | null
    | undefined,
) {
  const candidate = Array.isArray(topRowOrRows)
    ? topRowOrRows.find((row) => row?.name && !isOthers(String(row.name)) && String(row.name).trim().toLowerCase() !== "other") ?? topRowOrRows[0]
    : topRowOrRows;

  if (!candidate?.name) return "—";
  if (candidate.current == null || Number.isNaN(candidate.current)) return String(candidate.name);
  return `${candidate.name} (${Number(candidate.current).toFixed(1)}%)`;
}
