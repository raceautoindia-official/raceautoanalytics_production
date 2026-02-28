import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://raceautoanalytics.com";
  return [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/flash-reports`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/forecast`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  ];
}