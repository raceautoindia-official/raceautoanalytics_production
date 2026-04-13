/**
 * Server-side helper for calling Race Auto India internal subscription APIs.
 * Never import this in client components — it reads server-only env vars.
 */

const INTERNAL_BASE =
  process.env.RACE_AUTO_INDIA_INTERNAL_BASE || "https://raceautoindia.com";
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "";

export interface RaiAccessSummary {
  email: string;
  hasDirectPlan: boolean;
  hasSharedPlan: boolean;
  accessType: string;          // "direct" | "shared" | "none"
  directPlan: string | null;
  sharedPlan: string | null;
  effectivePlan: string | null;
  effectiveStatus: string;
  planSource: string;          // "direct" | "shared" | "none"
  parentEmail: string | null;
  flashReportCountryLimit: number;
}

export interface RaiFlashEntitlement {
  effectivePlan: string | null;
  accessType: string;          // "direct" | "shared" | "none"
  isSubscribed: boolean;
  effectiveStatus: string;
  parentEmail: string | null;
  flashReportCountryLimit: number;
  hasDirectPlan: boolean;
  hasSharedPlan: boolean;
}

const PLAN_COUNTRY_LIMITS: Record<string, number> = {
  bronze: 1,
  silver: 4,
  gold: 5,
  platinum: 11,
};

export const FORECAST_REGION_LIMITS: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 1,
  platinum: 2,
};

function derivedCountryLimit(plan: string | null): number {
  if (!plan) return 0;
  return PLAN_COUNTRY_LIMITS[plan.toLowerCase().trim()] ?? 0;
}

function derivedRegionLimit(plan: string | null): number {
  if (!plan) return 0;
  return FORECAST_REGION_LIMITS[plan.toLowerCase().trim()] ?? 0;
}

export async function fetchRaiAccessSummary(
  email: string,
): Promise<RaiAccessSummary> {
  const url = `${INTERNAL_BASE}/api/internal/subscription/access-summary?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, {
    headers: { "x-internal-api-key": INTERNAL_KEY },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`RaiAccessSummary fetch failed: ${res.status}`);
  }

  const data = await res.json();

  // Normalize and ensure flashReportCountryLimit is always present
  const effectivePlan = data.effectivePlan ?? null;
  const limit =
    data.flashReportCountryLimit != null
      ? Number(data.flashReportCountryLimit)
      : derivedCountryLimit(effectivePlan);

  return {
    email: data.email ?? email,
    hasDirectPlan: Boolean(data.hasDirectPlan),
    hasSharedPlan: Boolean(data.hasSharedPlan),
    accessType: data.accessType ?? "none",
    directPlan: data.directPlan ?? null,
    sharedPlan: data.sharedPlan ?? null,
    effectivePlan,
    effectiveStatus: data.effectiveStatus ?? "inactive",
    planSource: data.planSource ?? "none",
    parentEmail: data.parentEmail ?? null,
    flashReportCountryLimit: limit,
  };
}

export async function fetchRaiFlashEntitlement(
  email: string,
): Promise<RaiFlashEntitlement> {
  const url = `${INTERNAL_BASE}/api/internal/subscription/flash-entitlement?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, {
    headers: { "x-internal-api-key": INTERNAL_KEY },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`RaiFlashEntitlement fetch failed: ${res.status}`);
  }

  const data = await res.json();

  const effectivePlan = data.effectivePlan ?? null;
  const isSubscribed =
    data.isSubscribed != null
      ? Boolean(data.isSubscribed)
      : Boolean(data.hasDirectPlan || data.hasSharedPlan);
  const limit =
    data.flashReportCountryLimit != null
      ? Number(data.flashReportCountryLimit)
      : derivedCountryLimit(effectivePlan);

  return {
    effectivePlan,
    accessType: data.accessType ?? "none",
    isSubscribed,
    effectiveStatus: data.effectiveStatus ?? "inactive",
    parentEmail: data.parentEmail ?? null,
    flashReportCountryLimit: limit,
    hasDirectPlan: Boolean(data.hasDirectPlan),
    hasSharedPlan: Boolean(data.hasSharedPlan),
  };
}

export interface RaiForecastEntitlement {
  effectivePlan: string | null;
  accessType: string;          // "direct" | "shared" | "none"
  isSubscribed: boolean;
  effectiveStatus: string;
  parentEmail: string | null;
  forecastRegionLimit: number;
  hasDirectPlan: boolean;
  hasSharedPlan: boolean;
}

/**
 * Fetch forecast entitlement — reuses the same RAI flash-entitlement endpoint
 * since plan metadata is identical; derives forecastRegionLimit from plan.
 */
export async function fetchRaiForecastEntitlement(
  email: string,
): Promise<RaiForecastEntitlement> {
  const base = await fetchRaiFlashEntitlement(email);
  return {
    effectivePlan: base.effectivePlan,
    accessType: base.accessType,
    isSubscribed: base.isSubscribed,
    effectiveStatus: base.effectiveStatus,
    parentEmail: base.parentEmail,
    forecastRegionLimit: derivedRegionLimit(base.effectivePlan),
    hasDirectPlan: base.hasDirectPlan,
    hasSharedPlan: base.hasSharedPlan,
  };
}

/**
 * Decode JWT payload only (no signature validation — matches existing app pattern).
 * Used server-side to extract email from authToken cookie.
 */
export function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const b64 = token.split(".")[1];
    if (!b64) return null;
    const json = Buffer.from(
      b64.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}
