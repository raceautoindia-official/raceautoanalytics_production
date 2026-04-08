import {
  getOverallChartDataWithMeta,
  getOverallText,
  getMarketBarRawData,
} from "@/lib/flashReportsServer";
import { OverallAutomotiveIndustryClient } from "./OverallAutomotiveIndustryClient";

export const dynamic = "force-dynamic";

export default async function OverallAutomotiveIndustryPage({
  searchParams,
}: {
  searchParams?: { month?: string; region?: string; country?: string };
}) {
  const baseMonth =
    typeof searchParams?.month === "string" ? searchParams.month : undefined;

  const regionOrCountry =
    typeof searchParams?.country === "string"
      ? searchParams.country
      : typeof searchParams?.region === "string"
      ? searchParams.region
      : undefined;

  const [overallResult, overAllText, altFuelRaw] = await Promise.all([
    getOverallChartDataWithMeta({
      baseMonth,
      horizon: 6,
      country: regionOrCountry,
    }),
    getOverallText(regionOrCountry),
    getMarketBarRawData("alternative fuel", baseMonth, regionOrCountry),
  ]);

  return (
    <OverallAutomotiveIndustryClient
      initialOverallData={overallResult.data}
      overAllText={overAllText}
      altFuelRaw={altFuelRaw}
    />
  );
}