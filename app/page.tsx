// app/page.tsx
import type { Metadata } from "next";
import Footer from "@/app/components/Footer";
import QuickGuidesSection from "./components/QuickGuidesSection";
import NavBar from "./components/Navbar";
import PricingTeaser from "@/app/components/PricingTeaser";

export const metadata: Metadata = {
  title: "Automotive Sales Forecast & Market Analytics Platform",
  description:
    "Race Auto Analytics provides automotive sales forecasting, flash reports, OEM market share tracking, EV trend insights, and segment-wise market intelligence.",
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
  ],
  openGraph: {
    title: "Automotive Sales Forecast & Market Analytics Platform",
    description:
      "Forecast vehicle sales, track OEM market share, and monitor EV adoption with country-wise flash reports.",
    url: "https://raceautoanalytics.com/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Automotive Sales Forecast & Market Analytics Platform",
    description:
      "Forecast vehicle sales, track OEM market share, and monitor EV adoption with country-wise flash reports.",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <NavBar />
      <main>
        <h1 className="sr-only">
          Automotive Sales Forecast and Market Analytics Platform
        </h1>
        <p className="sr-only">
          Country-wise flash reports, OEM market share insights, EV trends, and
          segment-level forecasting for automotive and mobility teams.
        </p>
      {/* <BannerHome /> */}
        <QuickGuidesSection />
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
