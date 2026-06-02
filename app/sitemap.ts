import type { MetadataRoute } from "next";
import { FLASH_REPORT_COUNTRY_DATASETS } from "@/lib/flashReportCountryDataset";
import { SEO_COUNTRY_SLUGS, SITE_URL } from "@/lib/seoRoutes";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const countryEntries = SEO_COUNTRY_SLUGS.filter(
    (slug) => FLASH_REPORT_COUNTRY_DATASETS[slug],
  ).map(
    (slug) => ({
      url: `${SITE_URL}/flash-reports/country-data/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    }),
  );

  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/flash-reports/overview`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE_URL}/forecast/overview`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    ...countryEntries,
  ];
}
