// One-off generator: world-countries -> lib/worldCountries.ts
// Run: node gen-world-countries.js <outPath>
const fs = require("fs");
const countries = require("world-countries");

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");

// Map world-countries region/subregion -> the 5 flash regions already in use.
// North America is whitelisted by ISO (world-countries' Americas subregion naming
// is inconsistent, and Mexico belongs with Latin America for auto markets).
const NORTH_AMERICA_ISO2 = new Set(["US", "CA", "BM", "GL", "PM"]);
function mapRegion(c) {
  const region = c.region || "";
  const sub = c.subregion || "";
  if (NORTH_AMERICA_ISO2.has(c.cca2)) return "north-america";
  if (region === "Africa") return "middle-east-africa";
  if (region === "Europe") return "europe";
  if (region === "Oceania") return "asia-pacific";
  if (region === "Asia") return sub === "Western Asia" ? "middle-east-africa" : "asia-pacific";
  if (region === "Americas") return "latin-america";
  return "asia-pacific";
}

// Common hierarchy names that differ from world-countries' "common" name.
const ALIASES = {
  usa: "US", "united-states-of-america": "US",
  uk: "GB", britain: "GB", "great-britain": "GB",
  uae: "AE",
  turkey: "TR", turkiye: "TR",
  "south-korea": "KR", korea: "KR", "republic-of-korea": "KR",
  "north-korea": "KP",
  "ivory-coast": "CI", "cote-divoire": "CI",
  "czech-republic": "CZ",
  laos: "LA", syria: "SY", iran: "IR", russia: "RU", vietnam: "VN",
  taiwan: "TW", "hong-kong": "HK", macau: "MO", macao: "MO",
  burma: "MM", myanmar: "MM", swaziland: "SZ", "cape-verde": "CV",
  "democratic-republic-of-the-congo": "CD", "dr-congo": "CD",
  "republic-of-the-congo": "CG",
  "saudi-arabia": "SA", brunei: "BN", moldova: "MD",
};

// Build slug -> meta. Primary key = common name; add official + altSpellings as
// secondary keys (first-come wins) so "czech-republic", "usa", etc. also resolve.
const bySlug = {};
const iso2Region = {};
const byIso2 = {};

function add(slug, meta) {
  if (!slug || slug.length < 2) return;
  if (!bySlug[slug]) bySlug[slug] = meta;
}

for (const c of countries) {
  const iso2 = c.cca2;
  if (!iso2 || iso2.length !== 2) continue;
  const name = c.name.common;
  const region = mapRegion(c);
  const meta = { name, iso2, region };
  iso2Region[iso2] = region;
  byIso2[iso2] = meta;

  add(norm(name), meta); // primary
  add(norm(c.name.official), meta);
  for (const alt of c.altSpellings || []) {
    const s = norm(alt);
    if (s.length >= 4) add(s, meta); // skip 2-3 char codes like "CZ"
  }
}

// Force curated aliases (override) so common hierarchy names resolve.
for (const [slug, iso2] of Object.entries(ALIASES)) {
  if (byIso2[iso2]) bySlug[slug] = byIso2[iso2];
}

const slugs = Object.keys(bySlug).sort();
const iso2s = Object.keys(iso2Region).sort();

const out =
  `// AUTO-GENERATED — do not edit by hand. Regenerate with scripts/gen-world-countries.js\n` +
  `// (requires: npm i world-countries --no-save). Complete ISO 3166-1 country ->\n` +
  `// { name, iso2, region } so ANY country in the hierarchy resolves a flag + region,\n` +
  `// not just the launch markets. Region keys match FlashRegionKey in flashReportRegistry.\n` +
  `import type { FlashRegionKey } from "@/lib/flashReportRegistry";\n\n` +
  `export type WorldCountry = { name: string; iso2: string; region: FlashRegionKey };\n\n` +
  `// Keyed by normalized country name/alias (matches the countries API normKey).\n` +
  `export const WORLD_COUNTRIES: Record<string, WorldCountry> = {\n` +
  slugs
    .map(
      (s) =>
        `  ${JSON.stringify(s)}: { name: ${JSON.stringify(bySlug[s].name)}, iso2: ${JSON.stringify(
          bySlug[s].iso2,
        )}, region: ${JSON.stringify(bySlug[s].region)} },`,
    )
    .join("\n") +
  `\n};\n\n` +
  `// iso2 -> region, for callers that already hold the ISO code.\n` +
  `export const REGION_BY_ISO2: Record<string, FlashRegionKey> = {\n` +
  iso2s.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(iso2Region[k])},`).join("\n") +
  `\n};\n`;

fs.writeFileSync(process.argv[2], out);
console.log("Wrote", slugs.length, "slug keys,", iso2s.length, "countries");
for (const t of ["czech-republic", "czechia", "mexico", "united-states", "usa", "turkey", "russia", "vietnam"]) {
  console.log(" ", t, "=>", JSON.stringify(bySlug[t] || null));
}
