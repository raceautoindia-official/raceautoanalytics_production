import { NextResponse } from "next/server";

function getKeyMode(key?: string | null): "test" | "live" | "unknown" {
  const value = String(key || "").trim();
  if (value.startsWith("rzp_test_")) return "test";
  if (value.startsWith("rzp_live_")) return "live";
  return "unknown";
}

function pickCheckoutKeyId(payload: Record<string, unknown> | null): string {
  const candidates = [
    payload?.key_id,
    payload?.key,
    payload?.razorpay_key_id,
    payload?.razorpayKeyId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return "";
}

function getConfiguredKeyId(): string {
  const publicKey =
    typeof process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID === "string"
      ? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID.trim()
      : "";
  const privateKey =
    typeof process.env.RAZORPAY_KEY_ID === "string"
      ? process.env.RAZORPAY_KEY_ID.trim()
      : "";

  return publicKey || privateKey || "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const base =
      String(process.env.RACE_AUTO_INDIA_INTERNAL_BASE || "").trim() ||
      "https://raceautoindia.com";

    const upstreamRes = await fetch(`${base}/api/subscription/create-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const upstreamData = (await upstreamRes.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!upstreamRes.ok) {
      return NextResponse.json(upstreamData, { status: upstreamRes.status });
    }

    const configuredKeyId = getConfiguredKeyId();
    const upstreamKeyId = pickCheckoutKeyId(upstreamData);
    const returnedKeyId = upstreamKeyId || configuredKeyId;

    if (!returnedKeyId) {
      console.error("Razorpay create-payment: missing key_id from upstream and local config");
      return NextResponse.json(
        { error: "Razorpay checkout key is not configured" },
        { status: 500 },
      );
    }

    const configuredMode = getKeyMode(configuredKeyId);
    const upstreamMode = getKeyMode(upstreamKeyId);
    if (
      configuredMode !== "unknown" &&
      upstreamMode !== "unknown" &&
      configuredMode !== upstreamMode
    ) {
      console.error("Razorpay mode mismatch in create-payment", {
        configuredMode,
        upstreamMode,
        orderId: upstreamData?.id || null,
      });
      return NextResponse.json(
        {
          error:
            "Razorpay key mode mismatch detected. Align create-payment backend and checkout key mode.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ...upstreamData,
      key_id: returnedKeyId,
    });
  } catch (error) {
    console.error("POST /api/subscription/create-payment proxy error:", error);
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 },
    );
  }
}
