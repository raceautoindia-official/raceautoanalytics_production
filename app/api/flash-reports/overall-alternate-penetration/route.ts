import { NextResponse } from "next/server";
import { getOverallAlternatePenetration } from "@/lib/flashReportsServer";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const month = searchParams.get("month") || undefined;
    const country =
      searchParams.get("country") || searchParams.get("region") || undefined;

    const result = await getOverallAlternatePenetration(month, country);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in overall-alternate-penetration API:", error);
    return NextResponse.json(
      { error: "Failed to load overall alternate penetration" },
      { status: 500 },
    );
  }
}
