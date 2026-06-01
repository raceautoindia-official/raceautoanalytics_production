// app/page.tsx
import type { Metadata } from "next";
import Footer from "@/app/components/Footer";
import QuickGuidesSection from "./components/QuickGuidesSection";
import NavBar from "./components/Navbar";
import PricingTeaser from "@/app/components/PricingTeaser";

export const metadata: Metadata = {
  title: "Race Auto Analytics | Automotive Sales Forecast & Flash Reports",
  description:
    "Race Auto Analytics provides automotive sales forecasting, country-wise flash reports, OEM market share tracking, EV sales insights, and segment-wise market intelligence for mobility teams.",
  alternates: {
    canonical: "/",
  },
  keywords: [
    "automotive sales forecast",
    "automotive market analytics",
    "flash reports",
    "OEM market share",
    "EV sales insights",
    "vehicle segment analysis",
    "country wise flash reports",
    "automotive market intelligence platform",
  ],
  openGraph: {
    title: "Race Auto Analytics | Automotive Sales Forecast & Flash Reports",
    description:
      "Forecast vehicle sales, track OEM market share, and monitor EV adoption with country-wise automotive flash reports.",
    url: "https://raceautoanalytics.com/",
    type: "website",
    siteName: "Race Auto Analytics",
    images: [
      {
        url: "/images/logo.webp",
        width: 1200,
        height: 630,
        alt: "Race Auto Analytics automotive market analytics platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Race Auto Analytics | Automotive Sales Forecast & Flash Reports",
    description:
      "Forecast vehicle sales, track OEM market share, and monitor EV adoption with country-wise automotive flash reports.",
    images: ["/images/logo.webp"],
  },
};

export default function Page() {
  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Race Auto Analytics",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Automotive market analytics and forecasting platform with segment-wise volumes, AI forecasts, and country-wise flash reports.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Request demo / trial available",
    },
    url: "https://raceautoanalytics.com/",
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Race Auto Analytics",
    alternateName: ["RACE Analytics", "Race Auto India Analytics"],
    url: "https://raceautoanalytics.com/",
    logo: "https://raceautoanalytics.com/images/logo.webp",
    description:
      "Race Auto Analytics is an automotive market intelligence platform for vehicle sales forecasting, flash reports, OEM market share, EV adoption, and segment-level analytics.",
    sameAs: [
      "https://www.facebook.com/raceautoindia/",
      "https://x.com/raceautoindia",
      "https://www.instagram.com/race.auto.india/",
      "https://www.linkedin.com/company/race-auto-india/",
      "https://www.youtube.com/@RaceAutoIndia",
    ],
    knowsAbout: [
      "Automotive sales forecasting",
      "Vehicle market analytics",
      "OEM market share",
      "Electric vehicle sales trends",
      "Country-wise automotive flash reports",
      "Commercial vehicle analytics",
      "Passenger vehicle analytics",
      "Two-wheeler and three-wheeler market data",
    ],
  };

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Race Auto Analytics | Automotive Sales Forecast & Flash Reports",
    url: "https://raceautoanalytics.com/",
    description:
      "Automotive sales forecasting and country-wise flash reports for OEM market share, EV trends, and vehicle segment analysis.",
    about: [
      { "@type": "Thing", name: "Automotive sales forecast" },
      { "@type": "Thing", name: "Automotive market analytics" },
      { "@type": "Thing", name: "OEM market share" },
      { "@type": "Thing", name: "EV sales insights" },
      { "@type": "Thing", name: "Country-wise flash reports" },
    ],
    isPartOf: {
      "@type": "WebSite",
      name: "Race Auto Analytics",
      url: "https://raceautoanalytics.com/",
    },
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Race Auto Analytics",
    url: "https://raceautoanalytics.com/",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://raceautoanalytics.com/flash-reports?country={country}",
      "query-input": "required name=country",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <NavBar />
      <main>
      {/* <BannerHome /> */}
        <QuickGuidesSection
          intro={
          <>
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              Race Auto Analytics for Automotive Sales Forecasting
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/75 md:text-base">
              Country-wise flash reports, OEM market share insights, EV trends,
              and segment-level forecasting for automotive and mobility teams.
            </p>
          </>
          }
        />
        {/* Audit I-2: pricing teaser so first-time visitors see a price range
            on the homepage without having to click into /subscription. */}
        <PricingTeaser />

        {/* <MarketKPIGridDark />
        <VehicleCategorySalesCard /> */}
        {/* <IndustryCategories /> * */}
        {/* <OEMLeaderboardAndSegmentsEqualized />  */}
        {/* <ForecastPreview /> */}
        {/* <KeyMarketInsights /> */}
      </main>

      <Footer />
    </>
  );
}
