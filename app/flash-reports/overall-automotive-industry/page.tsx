import {
  getOverallChartDataWithMeta,
  getOverallText,
  getMarketBarRawData,
  getOverallAlternatePenetration,
  type OverallChartResponse,
  type OverallAlternatePenetrationResult,
  type MarketBarRawData,
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

  const defaultOverallResult: OverallChartResponse = {
    data: [],
    meta: {
      baseMonth: baseMonth || "",
      allowForecast: false,
      horizon: 6,
      windowMonths: [],
    },
  };

  const defaultAltPenetration: OverallAlternatePenetrationResult = {
    value: null,
    baseMonth: baseMonth || "",
  };

  const [overallResultSettled, overAllTextSettled, altFuelRawSettled, overallAltSettled] =
    await Promise.allSettled([
      getOverallChartDataWithMeta({
        baseMonth,
        horizon: 6,
        country: regionOrCountry,
      }),
      getOverallText(regionOrCountry),
      getMarketBarRawData("alternative fuel", baseMonth, regionOrCountry),
      getOverallAlternatePenetration(baseMonth, regionOrCountry),
    ]);

  const overallResult =
    overallResultSettled.status === "fulfilled"
      ? overallResultSettled.value
      : defaultOverallResult;
  const overAllText =
    overAllTextSettled.status === "fulfilled" ? overAllTextSettled.value : {};
  const altFuelRaw: MarketBarRawData | null =
    altFuelRawSettled.status === "fulfilled" ? altFuelRawSettled.value : null;
  const overallAlternatePenetration =
    overallAltSettled.status === "fulfilled"
      ? overallAltSettled.value
      : defaultAltPenetration;

  return (
    <>

    <OverallAutomotiveIndustryClient
      initialOverallData={overallResult.data}
      overAllText={overAllText}
      altFuelRaw={altFuelRaw}
      initialOverallAlternatePenetration={overallAlternatePenetration}
    />
    </>
  );
}
