import type { MetadataRoute } from "next";
import { listFlashReportCountryDatasets } from "@/lib/flashReportCountryDataset";
import { SITE_URL } from "@/lib/seoRoutes";
import { publishedInsightSlugs } from "@/lib/insights";

// Regenerate hourly so newly published insight posts appear without a rebuild.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  // Every live registry market gets a country-data page (explicit dataset or a
  // generic fallback), so adding a market to the registry sitemaps it too.
  const countryEntries = listFlashReportCountryDatasets().map((d) => ({
    url: `${SITE_URL}/flash-reports/country-data/${d.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  // Published insight posts (DB-sourced; empty on any DB error, never fails).
  const insightPosts = await publishedInsightSlugs();
  const insightEntries = insightPosts.map((p) => ({
    url: `${SITE_URL}/insights/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/flash-reports/overview`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE_URL}/forecast/overview`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE_URL}/insights`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/methodology`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${SITE_URL}/automotive-market-intelligence`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/flash-reports/country-data`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...countryEntries,
    ...insightEntries,
    { url: `${SITE_URL}/terms-conditions`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/disclaimer`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
