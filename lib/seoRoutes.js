export const SITE_URL = "https://raceautoanalytics.com";

// NOTE: the per-country slug list now lives in the country registry
// (lib/flashReportRegistry.ts → FLASH_COUNTRY_SLUGS) and is consumed directly by
// the sitemap. Country-data routes stay indexable via the regex pattern below,
// which matches any slug, so no hardcoded slug list is needed here.

export const INDEXABLE_ROUTE_PATTERNS = [
  /^\/$/,
  /^\/flash-reports\/overview\/?$/,
  /^\/forecast\/overview\/?$/,
  /^\/flash-reports\/country-data\/?$/, // country coverage hub
  /^\/flash-reports\/country-data\/[a-z0-9-]+\/?$/, // individual country pages
  /^\/automotive-market-intelligence\/?$/,
  /^\/privacy-policy\/?$/,
  /^\/terms-conditions\/?$/,
  /^\/disclaimer\/?$/,
];

export const SEO_SKIP_PREFIXES = [
  "/_next/",
  "/api/",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/images/",
  "/assets/",
  "/icons/",
];

export function isIndexableSeoPath(pathname) {
  return INDEXABLE_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}
