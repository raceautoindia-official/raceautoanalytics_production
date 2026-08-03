import db from "@/lib/db";
import {
  LIVE_FLASH_COUNTRIES,
  groupByRegion,
  resolveCountryMeta,
  type FlashRegionKey,
} from "@/lib/flashReportRegistry";
import {
  getFlashReportCountryDatasetOrDefault,
  type FlashReportCountryDataset,
} from "@/lib/flashReportCountryDataset";

// Server-only (imports the DB pool). Returns the LIVE flash-report country slugs
// straight from the content hierarchy (the `countries` node's children) UNION
// the launch registry — so a market added in the CMS shows up on the country
// surfaces automatically, without a code change. Falls back to the registry on
// any DB error so the pages are never empty.

const normKey = (s: any) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

const REGISTRY_SLUGS = LIVE_FLASH_COUNTRIES.map((c) => c.slug);

export async function getLiveFlashCountrySlugs(): Promise<string[]> {
  try {
    const [rows] = await db.query(`SELECT id, parent_id, name FROM hierarchy_nodes`);
    const nodes = Array.isArray(rows) ? (rows as any[]) : [];
    const norm = (n: any) => String(n?.name || "").toLowerCase().trim();

    const mainRoot = nodes.find(
      (n) =>
        (norm(n) === "main root" || norm(n) === "mainroot") &&
        (n.parent_id == null || n.parent_id === 0),
    );
    const flashReports = mainRoot
      ? nodes.find(
          (n) =>
            String(n.parent_id) === String(mainRoot.id) &&
            (norm(n) === "flash-reports" || norm(n) === "flashreports"),
        )
      : null;
    const countriesNode = flashReports
      ? nodes.find(
          (n) =>
            String(n.parent_id) === String(flashReports.id) &&
            norm(n) === "countries",
        )
      : null;

    // India uses the default (no country node) — always include it.
    const slugs = new Set<string>(["india", ...REGISTRY_SLUGS]);
    if (countriesNode) {
      for (const c of nodes) {
        if (String(c.parent_id) !== String(countriesNode.id)) continue;
        const v = normKey(c.name);
        if (v) slugs.add(v);
      }
    }
    return Array.from(slugs);
  } catch (e) {
    console.error("getLiveFlashCountrySlugs error:", e);
    return REGISTRY_SLUGS.includes("india") ? REGISTRY_SLUGS : ["india", ...REGISTRY_SLUGS];
  }
}

/** Live markets as datasets (explicit where available, else generic). */
export async function getLiveFlashCountryDatasets(): Promise<
  FlashReportCountryDataset[]
> {
  const slugs = await getLiveFlashCountrySlugs();
  return slugs
    .map((s) => getFlashReportCountryDatasetOrDefault(s))
    .filter((d): d is FlashReportCountryDataset => Boolean(d));
}

/** Live markets grouped by region — { key, label, countries[] } (empty regions dropped). */
export async function getLiveFlashCountryGroups() {
  const slugs = await getLiveFlashCountrySlugs();
  const items = slugs
    .map((slug) => {
      const meta = resolveCountryMeta(slug);
      if (!meta || !meta.region) return null;
      return { slug, name: meta.name, region: meta.region as FlashRegionKey };
    })
    .filter(
      (x): x is { slug: string; name: string; region: FlashRegionKey } =>
        Boolean(x),
    );
  return groupByRegion(items);
}
