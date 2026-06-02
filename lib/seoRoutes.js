export const SITE_URL = "https://raceautoanalytics.com";

export const SEO_COUNTRY_SLUGS = [
  "india",
  "brazil",
  "south-africa",
  "japan",
  "sweden",
  "vietnam",
  "chile",
  "pakistan",
  "colombia",
  "australia",
  "germany",
  "peru",
  "russia",
  "belgium",
];

export const INDEXABLE_ROUTE_PATTERNS = [
  /^\/$/,
  /^\/flash-reports\/overview\/?$/,
  /^\/forecast\/overview\/?$/,
  /^\/flash-reports\/country-data\/[a-z0-9-]+\/?$/,
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
