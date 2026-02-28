import { getOverallChartData, getOverallText, getMarketBarRawData } from "@/lib/flashReportsServer";
import { OverallAutomotiveIndustryClient } from "./OverallAutomotiveIndustryClient";
import { withCountry } from "@/lib/withCountry";
export const dynamic = "force-dynamic";

export default async function OverallAutomotiveIndustryPage({
  searchParams,
}: {
  searchParams?: { month?: string; region?: string };
}) {
  const baseMonth = typeof searchParams?.month === "string" ? searchParams.month : undefined;

  const [overallData, overAllText, altFuelRaw] = await Promise.all([
    getOverallChartData({ baseMonth, horizon: 6 }),
    getOverallText(),
    getMarketBarRawData("alternative fuel", baseMonth),
  ]);

  return (
    <OverallAutomotiveIndustryClient
      initialOverallData={overallData}
      overAllText={overAllText}
      altFuelRaw={altFuelRaw}
    />
  );
}
