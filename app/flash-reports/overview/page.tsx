// app/flash-reports/overview/page.tsx
import type { Metadata } from "next";
import VehicleCategorySalesCard from "@/app/components/VehicleCategorySalesCard";
import IndustryCategories from "@/app/components/IndustryCategories";
import KeyMarketInsights from "@/app/components/KeyMarketInsights";
import ExploreToolsInsights from "@/app/components/ExploreToolsInsights";
import Footer from "@/app/components/Footer";
import MarketHeroSection from "@/app/components/MarketHeroSection";
import ExploreVehicleCategories from "@/app/components/ExploreVehicleCategories";
import BYFSubmitCards from "./components/BYFSubmitCards";

export const metadata: Metadata = {
  title:
    "Flash Reports | Automotive Sales, OEM Share & EV Penetration by Country",
  description:
    "Monthly automotive flash reports across 8 segments and 15 countries — sales volumes, OEM market share, EV penetration, segment splits, and Build-Your-Forecast scoring.",
  alternates: { canonical: "/flash-reports/overview" },
  openGraph: {
    title:
      "Flash Reports | Automotive Sales, OEM Share & EV Penetration by Country",
    description:
      "Monthly automotive flash reports across 8 segments and 15 countries — sales volumes, OEM market share, EV penetration, segment splits, and Build-Your-Forecast scoring.",
    url: "https://raceautoanalytics.com/flash-reports/overview",
    type: "website",
  },
};

export default function Page() {

  return (
    <>
<MarketHeroSection/>
      <BYFSubmitCards />
      {/* <MarketKPIGrid /> */}
      <VehicleCategorySalesCard />
      <IndustryCategories />
      {/* <OEMLeaderboardAndSegments /> */}
      {/* <ForecastPreview /> */}
      <KeyMarketInsights />
      <ExploreVehicleCategories />
      <Footer />
    </>
  );
}
