import { NextResponse } from "next/server";
import { listAutomotiveMarketIntelligenceLeads } from "@/lib/automotiveMarketIntelligenceLeads";

export async function GET() {
  try {
    const rows = await listAutomotiveMarketIntelligenceLeads();
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("admin market intelligence leads GET error:", error);
    return NextResponse.json(
      { message: "Failed to load market intelligence leads" },
      { status: 500 },
    );
  }
}
