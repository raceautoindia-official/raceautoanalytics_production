import db from "@/lib/db";
import {
  decodeJwtPayload,
  fetchRaiAccessSummary,
  type RaiAccessSummary,
} from "@/lib/internalSubscriptionFetch";

const ADMIN_ROLES = new Set(["admin", "moderator"]);

// ---------------------------------------------------------------------------
// RAI access-summary cache (guards only — subscription endpoints unaffected).
//
// requireProtectedDataAccess / requireAdminAccess run on every protected data
// request, and each uncached call is a live HTTP round-trip to Race Auto India.
// Observed in production (2026-07-17): RAI slowness made data endpoints hang,
// and transient RAI failures made the guard deny access — which /api/graphs
// maps to a silent empty list, i.e. blank CMS panes with no visible error.
//
// - Successful summaries are cached ~60s per email (entitlement changes still
//   reflect within a minute; the client entitlement poll is 90s).
// - On upstream failure a recent stale summary (≤10 min) is served instead of
//   denying, so an RAI blip never locks out a valid session.
// - A hard timeout stops a hung upstream call from holding requests open.
// ---------------------------------------------------------------------------
const ACCESS_SUMMARY_TTL_MS = 60_000;
const ACCESS_SUMMARY_STALE_MAX_MS = 10 * 60_000;
const ACCESS_SUMMARY_TIMEOUT_MS = 8_000;

type CachedSummary = { summary: RaiAccessSummary; fetchedAt: number };
const accessSummaryCache = new Map<string, CachedSummary>();

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`RAI access-summary timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function getAccessSummaryCached(
  email: string,
): Promise<RaiAccessSummary> {
  const key = email.trim().toLowerCase();
  const now = Date.now();
  const cached = accessSummaryCache.get(key);

  if (cached && now - cached.fetchedAt < ACCESS_SUMMARY_TTL_MS) {
    return cached.summary;
  }

  try {
    const summary = await withTimeout(
      fetchRaiAccessSummary(key),
      ACCESS_SUMMARY_TIMEOUT_MS,
    );
    accessSummaryCache.set(key, { summary, fetchedAt: now });
    return summary;
  } catch (error) {
    if (cached && now - cached.fetchedAt < ACCESS_SUMMARY_STALE_MAX_MS) {
      console.error(
        "getAccessSummaryCached: upstream failed, serving stale summary:",
        error,
      );
      return cached.summary;
    }
    throw error;
  }
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function parseCookie(cookieHeader: string, name: string): string | null {
  const cookieName = `${name}=`;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(cookieName)) {
      return decodeURIComponent(trimmed.slice(cookieName.length));
    }
  }
  return null;
}

function readBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  const cleaned = token.trim();
  return cleaned || null;
}

function getInternalKeys(): string[] {
  return [
    process.env.INTERNAL_API_KEY,
    process.env.BACKEND_API_TOKEN,
    process.env.APP_INTERNAL_API_KEY,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
}

export function isInternalRequest(req: Request): boolean {
  const keys = getInternalKeys();
  if (!keys.length) return false;

  const candidates = [
    req.headers.get("x-internal-api-key"),
    req.headers.get("x-api-key"),
    readBearerToken(req),
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);

  if (!candidates.length) return false;
  return candidates.some((candidate) => keys.includes(candidate));
}

export function getAuthenticatedEmailFromRequest(req: Request): string | null {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const token = parseCookie(cookieHeader, "authToken");
    if (!token) return null;

    const payload = decodeJwtPayload(token);
    if (!payload?.email) return null;
    return String(payload.email).trim().toLowerCase();
  } catch {
    return null;
  }
}

export type GuardResult = {
  ok: boolean;
  status: number;
  message?: string;
  email?: string | null;
  isInternal?: boolean;
};

export async function requireAdminAccess(req: Request): Promise<GuardResult> {
  if (isInternalRequest(req)) {
    return { ok: true, status: 200, isInternal: true };
  }

  const email = getAuthenticatedEmailFromRequest(req);
  if (!email) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  try {
    const summary = await getAccessSummaryCached(email);
    const role = normalizeText(summary.role);
    // const hasRoleAccess =
    //   Boolean(summary.hasFullAccess) || ADMIN_ROLES.has(role);

    // if (!hasRoleAccess) {
    //   return { ok: false, status: 403, message: "Admin access required" };
    // }

    return { ok: true, status: 200, email };
  } catch (error) {
    console.error("requireAdminAccess error:", error);
    return { ok: false, status: 503, message: "Unable to validate access" };
  }
}

export async function requireSameUserOrInternal(
  req: Request,
  requestedEmail?: string | null,
): Promise<GuardResult> {
  if (isInternalRequest(req)) {
    return { ok: true, status: 200, isInternal: true };
  }

  const email = getAuthenticatedEmailFromRequest(req);
  if (!email) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  if (requestedEmail) {
    const wanted = normalizeText(requestedEmail);
    if (wanted && wanted !== email) {
      return { ok: false, status: 403, message: "Forbidden for this user" };
    }
  }

  return { ok: true, status: 200, email };
}

async function hasActiveLocalTrial(email: string): Promise<boolean> {
  try {
    type TrialRow = { free_trial_expires_at: string | null };
    const [rows] = await db.execute(
      "SELECT free_trial_expires_at FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    const user = (rows as TrialRow[])[0];
    if (!user?.free_trial_expires_at) return false;
    const expiresAt = new Date(user.free_trial_expires_at);
    return expiresAt.getTime() > Date.now();
  } catch (error) {
    console.error("hasActiveLocalTrial error:", error);
    return false;
  }
}

export async function requireProtectedDataAccess(
  req: Request,
  options?: { allowTrial?: boolean },
): Promise<GuardResult> {
  const allowTrial = options?.allowTrial !== false;

  if (isInternalRequest(req)) {
    return { ok: true, status: 200, isInternal: true };
  }

  const email = getAuthenticatedEmailFromRequest(req);

  if (!email) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  try {
    const summary = await getAccessSummaryCached(email);
    const role = normalizeText(summary.role);
    const hasRoleAccess =
      Boolean(summary.hasFullAccess) || ADMIN_ROLES.has(role);

    if (hasRoleAccess) {
      return { ok: true, status: 200, email };
    }

    const activeStatus = normalizeText(summary.effectiveStatus) === "active";
    const membershipPending = Boolean(summary.membershipPendingApproval);
    const hasSubscription =
      !membershipPending &&
      activeStatus &&
      (summary.accessType === "direct" ||
        summary.accessType === "shared" ||
        Boolean(summary.hasDirectPlan) ||
        Boolean(summary.hasSharedPlan) ||
        Boolean(summary.effectivePlan));

    if (hasSubscription) {
      return { ok: true, status: 200, email };
    }

    if (allowTrial && (await hasActiveLocalTrial(email))) {
      return { ok: true, status: 200, email };
    }

    return { ok: false, status: 403, message: "Active subscription required" };
  } catch (error) {
    console.error("requireProtectedDataAccess error:", error);
    return { ok: false, status: 503, message: "Unable to validate access" };
  }
}
