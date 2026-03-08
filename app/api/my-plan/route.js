import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email query param is required" },
        { status: 400 }
      );
    }

    const apiRes = await fetch(
      `https://raceautoindia.com/api/subscription/analytics/${encodeURIComponent(email)}`,
      { cache: "no-store" }
    );

    const data = await apiRes.json();

    return NextResponse.json(data, { status: apiRes.status });
  } catch (error) {
    console.error("my-plan proxy error:", error);
    return NextResponse.json(
      { error: "Unable to fetch current plan" },
      { status: 500 }
    );
  }
}