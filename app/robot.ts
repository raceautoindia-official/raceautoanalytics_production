// app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = "https://raceautoanalytics.com"; // change

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/flash-reports/overview",
          "/forecast/overview",
          "/flash-reports/country-data",
          "/flash-reports/country-data/",
        ],
        disallow: [
          "/admin",
          "/admin/",
          "/api",
          "/api/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
