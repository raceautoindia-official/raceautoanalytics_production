import jwt from "jsonwebtoken";
import db from "@/lib/db";

/**
 * Server-side helper for calling Race Auto India internal subscription APIs.
 * Never import this in client components - it reads server-only env vars.
 */

const INTERNAL_BASE =
  process.env.RACE_AUTO_INDIA_INTERNAL_BASE || "https://raceautoindia.com";
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "";

export interface RaiAccessSummary {
  email: string;
  hasDirectPlan: boolean;
  hasSharedPlan: boolean;
  accessType: string; // "direct" | "shared" | "none"
  directPlan: string | null;
  sharedPlan: string | null;
  effectivePlan: string | null;
  effectiveStatus: string;
  planSource: string; // "direct" | "shared" | "none"
  parentEmail: string | null;
  flashReportCountryLimit: number;
  role: string | null;
  hasFullAccess: boolean;
  membershipApprovalStatus: string;
  membershipPendingApproval: boolean;
  membershipPendingMessage: string | null;
}

export interface RaiFlashEntitlement {
  effectivePlan: string | null;
  accessType: string; // "direct" | "shared" | "none"
  isSubscribed: boolean;
  effectiveStatus: string;
  parentEmail: string | null;
  flashReportCountryLimit: number;
  hasDirectPlan: boolean;
  hasSharedPlan: boolean;
  role: string | null;
  hasFullAccess: boolean;
  membershipApprovalStatus: string;
  membershipPendingApproval: boolean;
  membershipPendingMessage: string | null;
}

const PLAN_COUNTRY_LIMITS: Record<string, number> = {
  bronze: 1,
  silver: 4,
  gold: 5,
  platinum: 11,
};

// Canonical paid plan keys — used to distinguish paid vs free in local DB fallback.
const PAID_PLAN_KEYS = new Set(["bronze", "silver", "gold", "platinum"]);

export const FORECAST_REGION_LIMITS: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 1,
  platinum: 2,
};

const FULL_ACCESS_ROLES = new Set(["admin", "moderator"]);

function normalizeText(value: any): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

function normalizeRole(data: any): string | null {
  const role =
    data?.role ??
    data?.userRole ??
    data?.accountRole ??
    data?.user_role ??
    data?.account_role ??
    data?.meta?.role ??
    null;
  const normalized = normalizeText(role);
  return normalized || null;
}

function normalizeStatus(value: any): string {
  const normalized = normalizeText(value);
  return normalized || "inactive";
}

function normalizeAccessType(raw: any): "direct" | "shared" | "none" {
  const value = normalizeText(raw);
  if (!value) return "none";

  if (
    [
      "shared",
      "shared-member",
      "shared-membership",
      "business-member",
      "member",
      "inherited",
      "parent-plan",
      "team-member",
    ].includes(value)
  ) {
    return "shared";
  }

  if (
    [
      "direct",
      "direct-plan",
      "owner",
      "subscriber",
      "paid",
    ].includes(value)
  ) {
    return "direct";
  }

  if (["none", "free", "not-assigned", "unassigned"].includes(value)) {
    return "none";
  }

  return "none";
}

function readExpiryCandidate(data: any): string | null {
  if (!data || typeof data !== "object") return null;

  const candidates = [
    data?.endDate,
    data?.end_date,
    data?.expiryDate,
    data?.expiry_date,
    data?.planExpiryDate,
    data?.plan_expiry_date,
    data?.subscriptionEndDate,
    data?.subscription_end_date,
    data?.currentPlanEndDate,
    data?.current_plan_end_date,
    data?.directEndDate,
    data?.direct_end_date,
    data?.sharedEndDate,
    data?.shared_end_date,
    data?.subscription?.endDate,
    data?.subscription?.end_date,
    data?.subscription?.expiryDate,
    data?.subscription?.expiry_date,
    data?.currentSubscription?.endDate,
    data?.currentSubscription?.end_date,
    data?.currentSubscription?.expiryDate,
    data?.currentSubscription?.expiry_date,
    data?.effectiveSubscription?.endDate,
    data?.effectiveSubscription?.end_date,
    data?.effectiveSubscription?.expiryDate,
    data?.effectiveSubscription?.expiry_date,
  ];

  for (const value of candidates) {
    const normalized = String(value ?? "").trim();
    if (normalized) return normalized;
  }
  return null;
}

function parseExpiryMs(expiryRaw: string | null): number | null {
  const value = String(expiryRaw || "").trim();
  if (!value) return null;

  // Date-only values should remain active through the end of that day.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const endOfDay = `${value}T23:59:59.999Z`;
    const ms = new Date(endOfDay).getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function enforceNonExpiredActiveStatus(status: string, data: any): string {
  const normalized = normalizeStatus(status);
  if (normalized !== "active") return normalized;

  const expiry = readExpiryCandidate(data);
  const expiryMs = parseExpiryMs(expiry);
  if (expiryMs == null) return normalized;

  if (expiryMs < Date.now()) return "inactive";
  return normalized;
}

async function readLocalSubscriptionExpiry(email: string): Promise<string | null> {
  try {
    const [rows]: any = await db.execute(
      `
      SELECT end_date
      FROM subscription_reference
      WHERE email = ?
      ORDER BY synced_at DESC
      LIMIT 1
      `,
      [email],
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    const value = String(row?.end_date ?? "").trim();
    return value || null;
  } catch (error) {
    console.error("readLocalSubscriptionExpiry error:", error);
    return null;
  }
}

/**
 * Returns true when the local subscription_reference table has a non-expired
 * paid plan row for this email. Used to correct upstream misreporting of status.
 */
async function readLocalValidPaidSubscription(email: string): Promise<boolean> {
  try {
    const [rows]: any = await db.execute(
      `SELECT plan_name, end_date
       FROM subscription_reference
       WHERE email = ?
       ORDER BY synced_at DESC
       LIMIT 1`,
      [email],
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return false;
    const planName = String(row?.plan_name ?? "").trim().toLowerCase();
    if (!PAID_PLAN_KEYS.has(planName)) return false;
    const expiryMs = parseExpiryMs(String(row?.end_date ?? "").trim());
    if (expiryMs == null) return false;
    return expiryMs >= Date.now();
  } catch (error) {
    console.error("readLocalValidPaidSubscription error:", error);
    return false;
  }
}

async function enforceEffectiveStatusWithFallbackExpiry(
  email: string,
  status: string,
  data: any,
): Promise<string> {
  const normalized = normalizeStatus(status);
  if (normalized !== "active") {
    // Upstream returned a non-active status. Before accepting it, check the
    // local subscription_reference table: if the user has a paid plan whose
    // end_date is still in the future, the upstream is misreporting and we
    // override to "active". Expired or truly free users return unchanged.
    const hasLocalActivePaid = await readLocalValidPaidSubscription(email);
    if (hasLocalActivePaid) return "active";
    return normalized;
  }

  const directStatus = enforceNonExpiredActiveStatus(normalized, data);
  if (directStatus !== "active") return directStatus;

  // If upstream payload has no expiry field, fall back to local subscription_reference.
  const hasUpstreamExpiry = Boolean(readExpiryCandidate(data));
  if (hasUpstreamExpiry) return directStatus;

  const localExpiry = await readLocalSubscriptionExpiry(email);
  if (!localExpiry) return directStatus;

  const localStatus = enforceNonExpiredActiveStatus("active", {
    end_date: localExpiry,
  });
  return localStatus;
}

function asBoolean(value: any): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;

  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (["true", "yes", "active", "approved", "verified"].includes(normalized)) {
    return true;
  }
  if (["false", "no", "inactive", "pending", "rejected"].includes(normalized)) {
    return false;
  }
  return null;
}

function normalizeMembershipStatus(raw: any): string {
  const status = normalizeText(raw);
  if (!status) return "unknown";

  if (
    ["approved", "accepted", "verified", "confirmed", "active"].includes(status)
  ) {
    return "approved";
  }

  if (
    [
      "pending",
      "awaiting-approval",
      "awaiting-acceptance",
      "invited",
      "invite-sent",
      "sent",
      "unverified",
    ].includes(status)
  ) {
    return "pending";
  }

  if (["not-assigned", "unassigned", "none", "na", "n-a"].includes(status)) {
    return "not_assigned";
  }

  return status;
}

function normalizeMembershipApproval(data: any, accessType: string) {
  const normalizedAccessType = normalizeText(accessType || "none");
  const rawStatus =
    data?.membershipApprovalStatus ??
    data?.memberApprovalStatus ??
    data?.sharedMembershipApprovalStatus ??
    data?.sharedMembershipStatus ??
    data?.shared_member_status ??
    data?.membership_status ??
    data?.membership?.approvalStatus ??
    data?.membership?.status ??
    null;

  const approvedFlag =
    asBoolean(data?.membershipApproved) ??
    asBoolean(data?.isMembershipApproved) ??
    asBoolean(data?.sharedMembershipApproved) ??
    asBoolean(data?.memberApproved) ??
    asBoolean(data?.membership_verified);

  const pendingFlag =
    asBoolean(data?.membershipPending) ??
    asBoolean(data?.isMembershipPending) ??
    asBoolean(data?.sharedMembershipPending) ??
    asBoolean(data?.memberPendingApproval);

  const approvalRequiredFlag =
    asBoolean(data?.membershipApprovalRequired) ??
    asBoolean(data?.sharedMembershipApprovalRequired);

  const normalizedStatus = normalizeMembershipStatus(rawStatus);

  let pending = false;

  if (normalizedAccessType === "shared") {
    pending =
      pendingFlag === true ||
      approvedFlag === false ||
      normalizedStatus === "pending" ||
      normalizedStatus === "not_assigned" ||
      (normalizedStatus === "unknown" &&
        approvalRequiredFlag === true &&
        approvedFlag !== true);
  }

  const status = pending
    ? normalizedStatus === "unknown"
      ? "pending"
      : normalizedStatus
    : normalizedStatus;

  const message = pending
    ? "You have membership available, but approval is still pending. Check your inbox to accept the membership invitation, or ask the parent user to resend the approval link."
    : null;

  return {
    status,
    pending,
    message,
  };
}

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

  const effectivePlan = data.effectivePlan ?? null;
  const role = normalizeRole(data);
  const hasFullAccess = !!role && FULL_ACCESS_ROLES.has(role);
  const accessType = normalizeAccessType(
    data.accessType ?? data.access_type ?? data.membershipType ?? data.member_type,
  );
  const membership = normalizeMembershipApproval(data, accessType);
  const hasStatusField = normalizeText(data.effectiveStatus) !== "";
  const hasAnyPlan = Boolean(
    data.hasDirectPlan || data.hasSharedPlan || data.isSubscribed || effectivePlan,
  );
  let effectiveStatus = hasStatusField
    ? normalizeStatus(data.effectiveStatus)
    : hasAnyPlan
      ? "active"
      : "inactive";
  effectiveStatus = await enforceEffectiveStatusWithFallbackExpiry(
    email,
    effectiveStatus,
    data,
  );
  if (membership.pending) effectiveStatus = "pending";

  const limit =
    data.flashReportCountryLimit != null
      ? Number(data.flashReportCountryLimit)
      : derivedCountryLimit(effectivePlan);

  return {
    email: data.email ?? email,
    hasDirectPlan: Boolean(data.hasDirectPlan),
    hasSharedPlan: Boolean(data.hasSharedPlan),
    accessType,
    directPlan: data.directPlan ?? null,
    sharedPlan: data.sharedPlan ?? null,
    effectivePlan,
    effectiveStatus,
    planSource: data.planSource ?? "none",
    parentEmail:
      data.parentEmail ??
      data.parent_email ??
      data.sharedParentEmail ??
      data.shared_parent_email ??
      null,
    flashReportCountryLimit: limit,
    role,
    hasFullAccess,
    membershipApprovalStatus: membership.status,
    membershipPendingApproval: membership.pending,
    membershipPendingMessage: membership.message,
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
  const accessType = normalizeAccessType(
    data.accessType ?? data.access_type ?? data.membershipType ?? data.member_type,
  );
  const role = normalizeRole(data);
  const hasFullAccess = !!role && FULL_ACCESS_ROLES.has(role);
  const membership = normalizeMembershipApproval(data, accessType);
  const upstreamNormalizedStatus = normalizeStatus(data.effectiveStatus);
  let effectiveStatus = upstreamNormalizedStatus;
  effectiveStatus = await enforceEffectiveStatusWithFallbackExpiry(
    email,
    effectiveStatus,
    data,
  );
  // True when upstream said non-active but local DB override corrected it to active.
  const wasLocallyActivated =
    upstreamNormalizedStatus !== "active" && effectiveStatus === "active";
  const hasStatusField = normalizeText(data.effectiveStatus) !== "";
  const activeStatus = effectiveStatus === "active";
  // When locally activated, trust the local DB over any upstream isSubscribed=false.
  let isSubscribed = wasLocallyActivated
    ? true
    : data.isSubscribed != null
      ? Boolean(data.isSubscribed)
      : Boolean(data.hasDirectPlan || data.hasSharedPlan || effectivePlan);
  if (hasStatusField && !wasLocallyActivated) {
    isSubscribed = isSubscribed && activeStatus;
  }
  if (membership.pending) {
    isSubscribed = false;
    effectiveStatus = "pending";
  }

  const limit =
    data.flashReportCountryLimit != null
      ? Number(data.flashReportCountryLimit)
      : derivedCountryLimit(effectivePlan);

  return {
    effectivePlan,
    accessType,
    isSubscribed,
    effectiveStatus,
    parentEmail:
      data.parentEmail ??
      data.parent_email ??
      data.sharedParentEmail ??
      data.shared_parent_email ??
      null,
    flashReportCountryLimit: limit,
    hasDirectPlan: Boolean(data.hasDirectPlan),
    hasSharedPlan: Boolean(data.hasSharedPlan),
    role,
    hasFullAccess,
    membershipApprovalStatus: membership.status,
    membershipPendingApproval: membership.pending,
    membershipPendingMessage: membership.message,
  };
}

export interface RaiForecastEntitlement {
  effectivePlan: string | null;
  accessType: string; // "direct" | "shared" | "none"
  isSubscribed: boolean;
  effectiveStatus: string;
  parentEmail: string | null;
  forecastRegionLimit: number;
  hasDirectPlan: boolean;
  hasSharedPlan: boolean;
  role: string | null;
  hasFullAccess: boolean;
  membershipApprovalStatus: string;
  membershipPendingApproval: boolean;
  membershipPendingMessage: string | null;
}

/**
 * Fetch forecast entitlement - reuses the same RAI flash-entitlement endpoint
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
    role: base.role,
    hasFullAccess: base.hasFullAccess,
    membershipApprovalStatus: base.membershipApprovalStatus,
    membershipPendingApproval: base.membershipPendingApproval,
    membershipPendingMessage: base.membershipPendingMessage,
  };
}

/**
 * Verify JWT signature and return payload.
 * Used server-side to extract trusted claims from authToken cookie.
 */
export function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const secret = process.env.JWT_KEY;
    if (!secret) return null;
    const verified = jwt.verify(token, secret);
    if (!verified || typeof verified !== "object") return null;
    return verified as Record<string, any>;
  } catch {
    return null;
  }
}
