export type CountryCardAction =
  | { type: "navigate"; href: string }
  | { type: "auth"; href: string }
  | { type: "subscribe" }
  | { type: "notIncluded" };

const FULL_ACCESS_ROLES = new Set(["admin", "moderator"]);

function hasAuthTokenCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith("authToken="));
}

function normalizeCountry(value: string) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function buildCountryHref(countrySlug: string, targetMonth: string) {
  return `/flash-reports?country=${encodeURIComponent(
    countrySlug,
  )}&month=${encodeURIComponent(targetMonth)}`;
}

export async function resolveCountryCardAction(
  countrySlug: string,
  targetMonth: string,
): Promise<CountryCardAction> {
  const normalizedCountry = normalizeCountry(countrySlug) || "india";
  const href = buildCountryHref(normalizedCountry, targetMonth);

  if (!hasAuthTokenCookie()) {
    return { type: "auth", href };
  }

  try {
    const entitlementRes = await fetch("/api/subscription/flash-entitlement", {
      credentials: "include",
      cache: "no-store",
    });

    if (!entitlementRes.ok) {
      if (entitlementRes.status === 401) return { type: "auth", href };
      return { type: "notIncluded" };
    }

    const entitlement = await entitlementRes.json();
    const role = String(entitlement?.role || "").toLowerCase();
    const hasRoleOverride =
      Boolean(entitlement?.hasFullAccess) || FULL_ACCESS_ROLES.has(role);
    const hasSubscriptionAccess =
      Boolean(entitlement?.isSubscribed) &&
      String(entitlement?.effectiveStatus || "").toLowerCase() === "active";

    if (!hasRoleOverride && !hasSubscriptionAccess) {
      return { type: "subscribe" };
    }

    if (hasRoleOverride) {
      return { type: "navigate", href };
    }

    const countriesRes = await fetch("/api/flash-reports/user-countries", {
      credentials: "include",
      cache: "no-store",
    });

    if (!countriesRes.ok) {
      return { type: "notIncluded" };
    }

    const countriesJson = await countriesRes.json();
    const assigned = Array.isArray(countriesJson?.countries)
      ? countriesJson.countries
      : [];
    const assignedSet = new Set(
      assigned
        .map((row: any) => normalizeCountry(row?.country_id || ""))
        .filter(Boolean),
    );

    if (assignedSet.has(normalizedCountry)) {
      return { type: "navigate", href };
    }

    return { type: "notIncluded" };
  } catch {
    return { type: "notIncluded" };
  }
}
