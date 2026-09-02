import { NextResponse } from "next/server";
import { getOverallChartDataWithMeta } from "@/lib/flashReportsServer";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const month = searchParams.get("month") || undefined;

    const horizonRaw = searchParams.get("horizon");
    const horizon = horizonRaw ? Number(horizonRaw) : undefined;

    // Optional deeper history. Used by the CMS AI forecast generator, which
    // needs more than a year to observe seasonality. Capped so a stray value
    // cannot make the upstream scan unbounded.
    const lookbackRaw = searchParams.get("lookback");
    const lookback = lookbackRaw
      ? Math.min(Math.max(Number(lookbackRaw) || 0, 0), 48)
      : undefined;

    const forceHistorical =
      searchParams.get("forceHistorical") === "1" ||
      searchParams.get("forceHistorical") === "true";

    const country = searchParams.get("country") || undefined;

    const result = await getOverallChartDataWithMeta({
      baseMonth: month,
      horizon,
      lookback,
      forceHistorical,
      country,
      // ✅ no debug in production
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in overall-chart-data API:", error);
    return NextResponse.json(
      { error: "Failed to load overall chart data" },
      { status: 500 },
    );
  }
}