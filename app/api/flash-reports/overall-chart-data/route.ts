import { NextResponse } from "next/server";
import { getOverallChartDataWithMeta } from "@/lib/flashReportsServer";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const month = searchParams.get("month") || undefined;

    const horizonRaw = searchParams.get("horizon");
    const horizon = horizonRaw ? Number(horizonRaw) : undefined;

    const forceHistorical =
      searchParams.get("forceHistorical") === "1" ||
      searchParams.get("forceHistorical") === "true";

    const country = searchParams.get("country") || undefined;

    const result = await getOverallChartDataWithMeta({
      baseMonth: month,
      horizon,
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