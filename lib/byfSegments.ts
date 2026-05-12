// Shared BYF (Build Your Forecast) segment metadata used by the overview
// teaser, country modals (overview hero + homepage QuickGuides), and the
// subscription gate. Centralised so the dropdown options + graph-fallback
// preference stay in one place.

export type ByfSegmentKey =
  | "pv"
  | "cv"
  | "tw"
  | "threew"
  | "tractor"
  | "truck"
  | "bus"
  | "ce";

export type ByfSegment = {
  configKey: ByfSegmentKey;
  label: string;
};

export const BYF_SEGMENTS: ByfSegment[] = [
  { configKey: "pv", label: "Passenger Vehicles" },
  { configKey: "cv", label: "Commercial Vehicles" },
  { configKey: "tw", label: "Two-Wheeler" },
  { configKey: "threew", label: "Three-Wheeler" },
  { configKey: "tractor", label: "Tractor" },
  { configKey: "truck", label: "Trucks" },
  { configKey: "bus", label: "Buses" },
  { configKey: "ce", label: "Construction Equipment" },
];

// Order used when falling back from the user-preferred segment to whatever
// is configured for the country.
export const BYF_FALLBACK_KEYS: ByfSegmentKey[] = [
  "pv",
  "cv",
  "tw",
  "threew",
  "tractor",
  "truck",
  "bus",
  "ce",
];

export type ByfConfigShape = Partial<Record<ByfSegmentKey, number | null>>;

/**
 * Resolve a usable graphId from a `/api/flash-reports/config` response,
 * preferring the user-selected segment when present.
 */
export function pickByfGraphId(
  config: ByfConfigShape | null | undefined,
  preferredKey?: ByfSegmentKey | null,
): { graphId: number | null; usedKey: ByfSegmentKey | null } {
  if (!config) return { graphId: null, usedKey: null };
  if (preferredKey) {
    const v = config[preferredKey];
    if (typeof v === "number" && Number.isFinite(v)) {
      return { graphId: v, usedKey: preferredKey };
    }
  }
  for (const k of BYF_FALLBACK_KEYS) {
    const v = config[k];
    if (typeof v === "number" && Number.isFinite(v)) {
      return { graphId: v, usedKey: k };
    }
  }
  return { graphId: null, usedKey: null };
}

export type ByfAvailability =
  | { status: "available"; graphId: number }
  | { status: "unavailable"; reason: "no-graph" | "no-questions" }
  | { status: "error"; message: string };

async function fetchByfConfig(
  country: string,
): Promise<ByfConfigShape | null> {
  try {
    const res = await fetch(
      `/api/flash-reports/config?country=${encodeURIComponent(country)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as ByfConfigShape;
  } catch {
    return null;
  }
}

/**
 * Resolve the graphId for a (country, segment) combo. Strategy:
 *  1. Try the country-specific config row first — if an admin has added a
 *     per-country graph mapping (the table supports it), use that.
 *  2. Otherwise fall back to India's config — in current production, the
 *     `flash_reports_text` table only has a fully-populated row under India,
 *     and segment pages already hardcode `country=india` to read graphIds.
 *     Per-country differentiation lives in the `questions` table, not the
 *     config mapping.
 */
async function resolveByfGraphId(
  country: string,
  segmentKey: ByfSegmentKey,
): Promise<number | null> {
  const norm = String(country || "").toLowerCase().trim();
  const isIndia = !norm || norm === "india" || norm === "in";

  if (!isIndia) {
    const cfg = await fetchByfConfig(norm);
    const v = cfg?.[segmentKey];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }

  const indiaCfg = await fetchByfConfig("india");
  const iv = indiaCfg?.[segmentKey];
  if (typeof iv === "number" && Number.isFinite(iv)) return iv;
  return null;
}

/**
 * Strict availability check for a (country, segment) combo:
 *  1. Resolve a graphId (country-specific config first, India fallback) —
 *     see resolveByfGraphId for why the fallback is required.
 *  2. If still no graphId → `no-graph`
 *  3. Fetch /api/questions?graphId=<id>&country=<slug> — this filters by
 *     the user's actually-selected country, so per-country question sets
 *     are honoured.
 *  4. If empty → `no-questions`
 *  5. Else → available
 */
export async function checkByfAvailability(
  country: string,
  segmentKey: ByfSegmentKey,
): Promise<ByfAvailability> {
  try {
    const graphId = await resolveByfGraphId(country, segmentKey);
    if (graphId == null) {
      return { status: "unavailable", reason: "no-graph" };
    }

    const qRes = await fetch(
      `/api/questions?graphId=${graphId}&country=${encodeURIComponent(country)}`,
      { cache: "no-store" },
    );
    if (!qRes.ok) {
      return { status: "error", message: `Questions ${qRes.status}` };
    }
    const qJson = await qRes.json();
    const list = Array.isArray(qJson) ? qJson : [];
    if (list.length === 0) {
      return { status: "unavailable", reason: "no-questions" };
    }

    return { status: "available", graphId };
  } catch (err: any) {
    return { status: "error", message: err?.message || "Network error" };
  }
}
