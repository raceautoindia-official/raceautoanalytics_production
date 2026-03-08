// app/page.tsx

// import MarketKPIGrid from "@/app/components/MarketKPIGrid";
import VehicleCategorySalesCard from "@/app/components/VehicleCategorySalesCard";
import IndustryCategories from "@/app/components/IndustryCategories";
// import OEMLeaderboardAndSegments from "@/app/components/OEMLeaderboardAndSegments";
// import ForecastPreview from "@/app/components/ForecastPreview";
import KeyMarketInsights from "@/app/components/KeyMarketInsights";
import ExploreToolsInsights from "@/app/components/ExploreToolsInsights";
import Footer from "@/app/components/Footer";
import MarketHeroSection from "@/app/components/MarketHeroSection";
import ExploreVehicleCategories from "@/app/components/ExploreVehicleCategories";


export default function Page() {

  return (
    <>
<MarketHeroSection/>
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
