// lib/flashReportRegistry.ts
//
// SINGLE SOURCE OF TRUTH for Flash Report countries + regions.
//
// Replaces the scattered hardcoded lists as they are migrated onto it:
//   - lib/flashReportCountryDataset.ts (FLASH_REPORT_COUNTRY_DATASETS)
//   - lib/seoRoutes.js (SEO_COUNTRY_SLUGS)
//   - the FLAG_MAP in app/api/flash-reports/countries/route.ts
//   - the homepage countryLinks (app/page.tsx)
//
// Consumed by: the countries API (enrichment), the country selector + subscriber
// picker, the SEO country-data pages, and the homepage/overview region views.
//
// FUTURE-SAFE: a `flash_report_countries` DB table can later ADD or OVERRIDE
// entries for CMS management. The API is intended to MERGE DB rows over these
// code defaults, so the product always works even if that table doesn't exist
// yet — the code registry is both the seed and the permanent fallback.
//
// NOTE: this file is metadata only (catalog + region + flag). Whether a country
// actually has data to show ("live") is still decided by data-availability
// (hierarchy/volume) — see resolveFlashReportContext / segment-availability.
// `status` here is the *product* intent (live / coming_soon / hidden), not a
// substitute for the data check.

import { WORLD_COUNTRIES } from "@/lib/worldCountries";

export type FlashRegionKey =
  | "asia-pacific"
  | "europe"
  | "latin-america"
  | "middle-east-africa"
  | "north-america";

export type CountryStatus = "live" | "coming_soon" | "hidden";

export type FlashCountry = {
  /** url key — matches flash_reports_text.country_key and the hierarchy node */
  slug: string;
  name: string;
  /** ISO 3166-1 alpha-2, drives the flag (no per-country flag table needed) */
  iso2: string;
  region: FlashRegionKey;
  status: CountryStatus;
};

export const FLASH_REGIONS: { key: FlashRegionKey; label: string }[] = [
  { key: "asia-pacific", label: "Asia-Pacific" },
  { key: "europe", label: "Europe" },
  { key: "latin-america", label: "Latin America" },
  { key: "middle-east-africa", label: "Middle East & Africa" },
  { key: "north-america", label: "North America" },
];

// The 14 currently-live markets, now with region + iso2. Add new markets here
// (or, later, via the CMS-backed flash_report_countries table which overrides).
export const FLASH_COUNTRIES: FlashCountry[] = [
  // Asia-Pacific
  { slug: "india", name: "India", iso2: "IN", region: "asia-pacific", status: "live" },
  { slug: "pakistan", name: "Pakistan", iso2: "PK", region: "asia-pacific", status: "live" },
  { slug: "japan", name: "Japan", iso2: "JP", region: "asia-pacific", status: "live" },
  { slug: "vietnam", name: "Vietnam", iso2: "VN", region: "asia-pacific", status: "live" },
  { slug: "australia", name: "Australia", iso2: "AU", region: "asia-pacific", status: "live" },
  // Europe
  { slug: "germany", name: "Germany", iso2: "DE", region: "europe", status: "live" },
  { slug: "belgium", name: "Belgium", iso2: "BE", region: "europe", status: "live" },
  { slug: "sweden", name: "Sweden", iso2: "SE", region: "europe", status: "live" },
  { slug: "russia", name: "Russia", iso2: "RU", region: "europe", status: "live" },
  // Latin America
  { slug: "brazil", name: "Brazil", iso2: "BR", region: "latin-america", status: "live" },
  { slug: "chile", name: "Chile", iso2: "CL", region: "latin-america", status: "live" },
  { slug: "colombia", name: "Colombia", iso2: "CO", region: "latin-america", status: "live" },
  { slug: "peru", name: "Peru", iso2: "PE", region: "latin-america", status: "live" },
  // Middle East & Africa
  { slug: "south-africa", name: "South Africa", iso2: "ZA", region: "middle-east-africa", status: "live" },
  // Newly added markets (data live in the hierarchy; catalog metadata here)
  { slug: "czech-republic", name: "Czech Republic", iso2: "CZ", region: "europe", status: "live" },
  { slug: "uruguay", name: "Uruguay", iso2: "UY", region: "latin-america", status: "live" },
];

/** ISO2 → flag emoji via regional-indicator symbols. Falls back to 🌍. */
export function flagFromIso2(iso2?: string | null): string {
  const cc = String(iso2 || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "🌍";
  const BASE = 0x1f1e6; // regional indicator 'A'
  return String.fromCodePoint(
    BASE + (cc.charCodeAt(0) - 65),
    BASE + (cc.charCodeAt(1) - 65),
  );
}

const BY_SLUG = new Map(FLASH_COUNTRIES.map((c) => [c.slug, c]));
const REGION_LABEL = new Map(FLASH_REGIONS.map((r) => [r.key, r.label]));

export function getFlashCountry(slug?: string | null): FlashCountry | null {
  return BY_SLUG.get(String(slug || "").toLowerCase().trim()) ?? null;
}

/**
 * Resolve display metadata (name, iso2, region) for ANY country slug/alias.
 * The explicit launch registry wins (it carries product status); otherwise the
 * full ISO-3166 world dataset fills in iso2 + region — so every country the CMS
 * ever adds gets a flag and a region, not just the 14 launch markets.
 */
export function resolveCountryMeta(slug?: string | null): {
  slug: string;
  name: string;
  iso2: string | null;
  region: FlashRegionKey | null;
} | null {
  const s = String(slug || "").toLowerCase().trim();
  if (!s) return null;
  const explicit = BY_SLUG.get(s);
  if (explicit) {
    return { slug: s, name: explicit.name, iso2: explicit.iso2, region: explicit.region };
  }
  const world = WORLD_COUNTRIES[s];
  if (world) return { slug: s, name: world.name, iso2: world.iso2, region: world.region };
  return null;
}

/** ISO2 for any country slug/alias (registry or world dataset), or null. */
export function iso2ForSlug(slug?: string | null): string | null {
  return resolveCountryMeta(slug)?.iso2 ?? null;
}

export function flagForSlug(slug?: string | null): string {
  const iso2 = resolveCountryMeta(slug)?.iso2;
  return iso2 ? flagFromIso2(iso2) : "🌍";
}

export function regionLabel(key: FlashRegionKey): string {
  return REGION_LABEL.get(key) ?? key;
}

/** Group any list of countries by region (in FLASH_REGIONS order); empty regions dropped. */
export function groupByRegion<T extends { region: FlashRegionKey; name: string }>(
  countries: T[],
): { key: FlashRegionKey; label: string; countries: T[] }[] {
  return FLASH_REGIONS.map((r) => ({
    key: r.key,
    label: r.label,
    countries: countries
      .filter((c) => c.region === r.key)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((g) => g.countries.length > 0);
}

/**
 * Group an arbitrary list of country-like items ({ slug, name, ... }) by region,
 * looking up each item's region from the registry by slug. Items whose slug is
 * not in the registry fall into an "Other" bucket (never dropped). Region order
 * follows FLASH_REGIONS; each bucket is sorted alphabetically by name. Preserves
 * every item's own extra fields (modules, flag, etc.) via the generic.
 */
export function groupCountriesByRegion<T extends { slug: string; name: string }>(
  items: T[],
): { key: string; label: string; items: T[] }[] {
  const byRegion = new Map<string, T[]>();
  for (const it of items) {
    const key = resolveCountryMeta(it.slug)?.region || "other";
    const bucket = byRegion.get(key);
    if (bucket) bucket.push(it);
    else byRegion.set(key, [it]);
  }

  const sortByName = (list: T[]) =>
    list.slice().sort((a, b) => a.name.localeCompare(b.name));

  const ordered: { key: string; label: string; items: T[] }[] = [];
  for (const r of FLASH_REGIONS) {
    const list = byRegion.get(r.key);
    if (list && list.length) ordered.push({ key: r.key, label: r.label, items: sortByName(list) });
  }
  const other = byRegion.get("other");
  if (other && other.length) ordered.push({ key: "other", label: "Other", items: sortByName(other) });
  return ordered;
}

export const LIVE_FLASH_COUNTRIES = FLASH_COUNTRIES.filter((c) => c.status !== "hidden");
export const FLASH_COUNTRY_SLUGS = FLASH_COUNTRIES.map((c) => c.slug);
