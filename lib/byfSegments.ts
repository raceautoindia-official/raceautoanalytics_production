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

/**
 * Strict availability check for a (country, segment) combo:
 *  1. Fetch /api/flash-reports/config?country=<slug>
 *  2. If no graphId is configured for that exact segment → `no-graph`
 *  3. Else fetch /api/questions?graphId=<id>&country=<slug>
 *  4. If the questions array is empty → `no-questions`
 *  5. Else → available with the graphId
 *
 * Used by every newly-added BYF launcher (overview teaser, country modals,
 * subscribe gate) to decide whether to enable the navigate button or render
 * a disabled "Coming soon" state. Strict — does NOT fall back to a different
 * segment, so the user always sees feedback for the segment they picked.
 */
export async function checkByfAvailability(
  country: string,
  segmentKey: ByfSegmentKey,
): Promise<ByfAvailability> {
  try {
    const cfgRes = await fetch(
      `/api/flash-reports/config?country=${encodeURIComponent(country)}`,
      { cache: "no-store" },
    );
    if (!cfgRes.ok) {
      return { status: "error", message: `Config ${cfgRes.status}` };
    }
    const cfg = (await cfgRes.json()) as ByfConfigShape;
    const raw = cfg?.[segmentKey];
    const graphId =
      typeof raw === "number" && Number.isFinite(raw) ? raw : null;
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
