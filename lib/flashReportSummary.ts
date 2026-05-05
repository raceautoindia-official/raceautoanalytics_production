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

function cleanPercent(value: number | null | undefined, maxDecimals = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return Number(Number(value).toFixed(maxDecimals)).toString();
}

function formatPercentExact(value: number | null | undefined) {
  const cleaned = cleanPercent(value, 2);
  return cleaned === "—" ? "—" : `${cleaned}%`;
}

function formatDelta(delta: number) {
  const cleaned = cleanPercent(delta, 2);
  if (cleaned === "—") return "—";
  const numeric = Number(cleaned);
  return `${numeric >= 0 ? "+" : ""}${cleaned}%`;
}

function isOthers(name: string) {
  return name.trim().toLowerCase() === "others";
}

function isOtherLike(name: string) {
  const normalized = name.trim().toLowerCase();
  return normalized === "others" || normalized === "other";
}

/**
 * Permissive "Others" detector — matches the bare "Others" label AND any
 * customized variant the admin may have authored in the CMS, e.g.:
 *   "Others", "Other"
 *   "Others[tata, mahindra, etc]"
 *   "Others (small OEMs)"
 *   "Others - misc"
 *   "Others: long tail"
 *   "Others 2024"
 * The chart's bar grouping merges across months by exact name; if admin
 * renamed the row mid-quarter, two bars would render. This matcher catches
 * both shapes so they can be merged into a single bucket.
 */
export function isOthersLike(name: string | null | undefined): boolean {
  const n = String(name || "").trim().toLowerCase();
  if (!n) return false;
  if (n === "others" || n === "other") return true;
  // matches "others[" "others(" "others " "others-" "others:" and the singular
  // forms — case-insensitive (we already lowercased above)
  return /^others?[\s\[\(:\-]/.test(n);
}

/**
 * Compare-row shape used by the OEM and EV bar charts on segment pages.
 * Re-declared here (not imported from page files) so the helper stays
 * standalone and reusable.
 */
type MergeableCompareRow = {
  name: string;
  current: number;
  previous?: number;
  symbol?: "" | "▲" | "▼";
  deltaPct?: number | null;
};

/**
 * Merges any "Others"-like rows (per `isOthersLike`) into a single bucket
 * appended to the END of the returned list. Sums `current` and `previous`
 * values; preserves the most descriptive admin-authored label (longest
 * name, e.g. "Others[tata, mahindra]" beats bare "Others").
 *
 * If only one Others-like row exists (current healthy state), the merged
 * row is functionally identical to the input row — backward compatible.
 *
 * If zero Others rows exist, returns the input rows unchanged (just sorted
 * order preserved by caller — we do not re-sort here).
 */
export function mergeOthersRows<T extends MergeableCompareRow>(rows: T[]): T[] {
  if (!Array.isArray(rows) || rows.length === 0) return rows;

  const others: T[] = [];
  const nonOthers: T[] = [];
  for (const row of rows) {
    if (row && isOthersLike(row.name)) {
      others.push(row);
    } else {
      nonOthers.push(row);
    }
  }

  if (others.length === 0) return rows;

  // Pick the most descriptive label — longest name wins. This preserves
  // admin customization ("Others[tata, mahindra]") over the bare "Others"
  // when both exist in the merged dataset across months.
  const labelSource = others.reduce(
    (best, r) => (String(r.name).length > String(best.name).length ? r : best),
    others[0],
  );
  const labelLower = String(labelSource.name).trim().toLowerCase();
  const displayName =
    labelLower === "others" || labelLower === "other"
      ? "Others"
      : String(labelSource.name);

  const sumCurrent = others.reduce(
    (s, r) => s + (Number.isFinite(r.current) ? Number(r.current) : 0),
    0,
  );
  const sumPrevious = others.reduce(
    (s, r) => s + (Number.isFinite(r.previous) ? Number(r.previous) : 0),
    0,
  );
  const delta = sumCurrent - sumPrevious;
  const symbol: "" | "▲" | "▼" =
    delta > 0 ? "▲" : delta < 0 ? "▼" : "";

  // Build the merged row using the first row as a template (preserves any
  // extra fields outside our minimum shape).
  const merged: T = {
    ...others[0],
    name: displayName,
    current: sumCurrent,
    previous: sumPrevious,
    deltaPct: delta,
    symbol,
  };

  return [...nonOthers, merged];
}

export function buildLeadershipGrowthSummary({
  rows,
  compareMode,
  emptyMessage,
  metricLabel,
}: SummaryOptions) {
  if (!rows?.length) return emptyMessage;

  const validRows = rows.filter(
    (row) =>
      row &&
      row.name &&
      !isOthers(row.name) &&
      !isOtherLike(row.name) &&
      Number.isFinite(row.current),
  );

  if (!validRows.length) return emptyMessage;

  const leader = validRows[0];
  const compareLabel =
    compareMode === "mom" ? "month-on-month" : "year-on-year";

  const growthCandidates = validRows.filter((row) =>
    Number.isFinite(row.deltaPct as number),
  );

  const growthPerformer = [...growthCandidates].sort(
    (a, b) =>
      (b.deltaPct ?? Number.NEGATIVE_INFINITY) -
      (a.deltaPct ?? Number.NEGATIVE_INFINITY),
  )[0];

  if (!growthPerformer) {
    return `${leader.name} leads with ${formatPercentExact(
      leader.current,
    )} ${metricLabel}.`;
  }

  const growthDelta = growthPerformer.deltaPct ?? 0;

  if (growthPerformer.name === leader.name) {
    if (growthDelta > 0) {
      return `${leader.name} leads with ${formatPercentExact(
        leader.current,
      )} ${metricLabel} and is also the fastest-growing performer, up ${formatDelta(
        growthDelta,
      )} ${compareLabel}.`;
    }
    if (growthDelta === 0) {
      return `${leader.name} leads with ${formatPercentExact(
        leader.current,
      )} ${metricLabel} and remained flat ${compareLabel}.`;
    }
    return `${leader.name} leads with ${formatPercentExact(
      leader.current,
    )} ${metricLabel} despite a ${formatDelta(
      growthDelta,
    )} ${compareLabel} move.`;
  }

  if (growthDelta > 0) {
    return `${leader.name} leads with ${formatPercentExact(
      leader.current,
    )} ${metricLabel}, while ${growthPerformer.name} is the fastest-growing performer at ${formatDelta(
      growthDelta,
    )} ${compareLabel}.`;
  }

  if (growthDelta === 0) {
    return `${leader.name} leads with ${formatPercentExact(
      leader.current,
    )} ${metricLabel}, while ${growthPerformer.name} remained flat ${compareLabel}.`;
  }

  return `${leader.name} leads with ${formatPercentExact(
    leader.current,
  )} ${metricLabel}, while ${growthPerformer.name} recorded the mildest decline at ${formatDelta(
    growthDelta,
  )} ${compareLabel}.`;
}

export function formatSignedPercent(
  value: number | null | undefined,
  decimals = 0,
) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${Number(value.toFixed(decimals)).toString()}%`;
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

  const mom =
    Number.isFinite(curr) && Number.isFinite(prev) && prev > 0
      ? ((curr - prev) / prev) * 100
      : null;

  const yoy =
    Number.isFinite(curr) && Number.isFinite(prevYr) && prevYr > 0
      ? ((curr - prevYr) / prevYr) * 100
      : null;

  return {
    mom,
    yoy,
    text: `${formatSignedPercent(mom, decimals)} MoM | ${formatSignedPercent(yoy, decimals)} YoY`,
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
  return `${cleanPercent(value, 2)}%`;
}

export function formatLeadingOemLabel(
  topRowOrRows:
    | { name?: string | null; current?: number | null }
    | Array<{ name?: string | null; current?: number | null }>
    | null
    | undefined,
) {
  const candidate = Array.isArray(topRowOrRows)
    ? topRowOrRows.find(
        (row) =>
          row?.name &&
          !isOthers(String(row.name)) &&
          String(row.name).trim().toLowerCase() !== "other",
      ) ?? topRowOrRows[0]
    : topRowOrRows;

  if (!candidate?.name) return "—";
  if (candidate.current == null || Number.isNaN(candidate.current))
    return String(candidate.name);
  return `${candidate.name} (${cleanPercent(Number(candidate.current), 2)}%)`;
}