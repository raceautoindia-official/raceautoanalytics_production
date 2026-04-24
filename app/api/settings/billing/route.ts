import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";
import { decodeJwtPayload } from "@/lib/internalSubscriptionFetch";

export const dynamic = "force-dynamic";

type CurrentSubscriptionRow = {
  plan_name: string | null;
  status: string | null;
  payment_id: string | null;
  end_date: string | null;
};

type PaymentHistoryRow = {
  id: number;
  amount: number | null;
  status: string | null;
  plan_name: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
};

async function safeQueryCurrentSubscription(email: string): Promise<CurrentSubscriptionRow | null> {
  try {
    const [rows]: any = await db.execute(
      `
      SELECT
        plan_name,
        status,
        payment_id,
        end_date
      FROM subscription_reference
      WHERE email = ?
      ORDER BY synced_at DESC
      LIMIT 1
      `,
      [email],
    );
    return rows?.[0] ?? null;
  } catch (error) {
    console.error("settings billing current subscription query error:", error);
    return null;
  }
}

async function safeQueryPaymentHistory(email: string): Promise<PaymentHistoryRow[]> {
  try {
    const [rows]: any = await db.execute(
      `
      SELECT
        id,
        amount,
        status,
        plan_name,
        razorpay_order_id,
        razorpay_payment_id,
        created_at
      FROM payment_reference_log
      WHERE email = ?
      ORDER BY id DESC
      LIMIT 25
      `,
      [email],
    );
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error("settings billing payment history query error:", error);
    return [];
  }
}

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("authToken")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = decodeJwtPayload(token);
    const email = payload?.email ? String(payload.email) : null;
    if (!email) {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
    }

    const [current, history] = await Promise.all([
      safeQueryCurrentSubscription(email),
      safeQueryPaymentHistory(email),
    ]);

    const lastPayment = history[0] ?? null;
    const displayHistory = history.filter((row) => {
      const status = String(row.status || "").toLowerCase().trim();
      return status === "success" || status === "failed";
    });

    return NextResponse.json({
      success: true,
      billing: {
        currentPlan: current?.plan_name ?? null,
        subscriptionStatus: current?.status ?? null,
        lastPaymentAmount: lastPayment?.amount ?? null,
        lastPaymentDate: lastPayment?.created_at ?? null,
        paymentMethod: lastPayment?.razorpay_payment_id ? "Razorpay" : null,
        billingOrderId:
          lastPayment?.razorpay_order_id ?? current?.payment_id ?? null,
        planExpiryDate: current?.end_date ?? null,
        renewalDate:
          current?.status?.toLowerCase() === "active"
            ? current?.end_date ?? null
            : null,
      },
      history: displayHistory.map((row) => ({
        id: row.id,
        date: row.created_at,
        amount: row.amount,
        status: row.status,
        plan: row.plan_name,
        referenceId: row.razorpay_payment_id || row.razorpay_order_id || null,
      })),
    });
  } catch (error) {
    console.error("GET /api/settings/billing error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch billing details" },
      { status: 500 },
    );
  }
}
