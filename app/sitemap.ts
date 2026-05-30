import type { MetadataRoute } from "next";
import { FLASH_REPORT_COUNTRY_DATASETS } from "@/lib/flashReportCountryDataset";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://raceautoanalytics.com";
  const now = new Date();
  const countryEntries = Object.keys(FLASH_REPORT_COUNTRY_DATASETS).map(
    (slug) => ({
      url: `${base}/flash-reports/country-data/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }),
  );

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/flash-reports`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/flash-reports/overview`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: `${base}/flash-reports/country-data`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${base}/forecast`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/forecast/overview`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    ...countryEntries,
  ];
}
