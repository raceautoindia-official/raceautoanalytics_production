// app/page.tsx
import BannerHome from "@/app/components/BannerHome";
// import MarketKPIGrid from "@/app/components/MarketKPIGrid";
import VehicleCategorySalesCard from "@/app/components/VehicleCategorySalesCard";
import IndustryCategories from "@/app/components/IndustryCategories";
// import OEMLeaderboardAndSegments from "@/app/components/OEMLeaderboardAndSegments";
// import ForecastPreview from "@/app/components/ForecastPreview";
import KeyMarketInsights from "@/app/components/KeyMarketInsights";
import ExploreToolsInsights from "@/app/components/ExploreToolsInsights";
import Footer from "@/app/components/Footer";

export default function Page() {
  const jsonLd = {
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BannerHome />
      {/* <MarketKPIGrid /> */}
      <VehicleCategorySalesCard />
      <IndustryCategories />
      {/* <OEMLeaderboardAndSegments /> */}
      {/* <ForecastPreview /> */}
      <KeyMarketInsights />
      <ExploreToolsInsights />
      <Footer />
    </>
  );
}
