// Generated robots.txt via Next.js App Router metadata API.
// Crawled at https://raceautoanalytics.com/robots.txt
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api",
          "/api/",
          "/score-card",
          "/score-card/",
          "/settings",
          "/forecast-new",
        ],
      },
    ],
    sitemap: "https://raceautoanalytics.com/sitemap.xml",
    host: "https://raceautoanalytics.com",
  };
}
