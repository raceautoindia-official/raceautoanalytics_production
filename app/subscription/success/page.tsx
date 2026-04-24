import Link from "next/link";
import { cookies } from "next/headers";
import db from "@/lib/db";
import { decodeJwtPayload } from "@/lib/internalSubscriptionFetch";
import { formatPlanLabelOrFallback } from "@/lib/planLabels";

type SearchParams = Record<string, string | string[] | undefined>;
type PaymentLogRow = {
  id: number;
  status: string | null;
  amount: number | null;
  created_at: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
};

function readStringParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  return null;
}

async function verifySuccessPayment(
  email: string,
  orderId: string | null,
  paymentId: string | null,
) {
  if (!orderId && !paymentId) return null;

  const clauses: string[] = [];
  const params: string[] = [email];

  if (paymentId) {
    clauses.push("razorpay_payment_id = ?");
    params.push(paymentId);
  }
  if (orderId) {
    clauses.push("razorpay_order_id = ?");
    params.push(orderId);
  }

  const [rows] = await db.execute(
    `
    SELECT id, status, amount, created_at, razorpay_order_id, razorpay_payment_id
    FROM payment_reference_log
    WHERE email = ?
      AND (${clauses.join(" OR ")})
    ORDER BY id DESC
    LIMIT 1
    `,
    params,
  );

  const row = (rows as PaymentLogRow[])[0];
  if (!row) return null;
  return row;
}

export default async function SubscriptionPaymentSuccessPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const plan = formatPlanLabelOrFallback(
    readStringParam(searchParams?.plan),
    "Selected plan",
  );
  const cycleRaw = readStringParam(searchParams?.cycle);
  const cycle = cycleRaw === "annual" ? "Annual" : cycleRaw === "monthly" ? "Monthly" : "N/A";
  const amountParam = readStringParam(searchParams?.amount);
  const currency =
    (readStringParam(searchParams?.currency) || "INR").toUpperCase();
  const orderId = readStringParam(searchParams?.orderId);
  const paymentId = readStringParam(searchParams?.paymentId);

  const token = cookies().get("authToken")?.value || "";
  const payload = decodeJwtPayload(token);
  const email = payload?.email ? String(payload.email).trim().toLowerCase() : null;

  let paymentRow: PaymentLogRow | null = null;
  if (email) {
    try {
      paymentRow = await verifySuccessPayment(email, orderId, paymentId);
    } catch (error) {
      console.error("subscription success verification error:", error);
    }
  }

  const verifiedSuccess =
    String(paymentRow?.status || "").trim().toLowerCase() === "success";
  const paidAtValue = paymentRow?.created_at || new Date().toISOString();
  const paidAt = new Date(paidAtValue).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const displayAmount =
    paymentRow?.amount != null
      ? String(paymentRow.amount)
      : amountParam;

  return (
    <main className="min-h-screen bg-[#050B1A] px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-400/25 bg-[#0B1228] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <div className="mb-4 inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-200">
          Payment Status: {verifiedSuccess ? "Verified Success" : "Pending Verification"}
        </div>
        <h1 className="text-2xl font-semibold text-emerald-200">
          {verifiedSuccess ? "Payment Successful" : "Payment Received"}
        </h1>
        <p className="mt-2 text-sm text-white/70">
          {verifiedSuccess
            ? "Your subscription has been activated successfully."
            : "We are validating your payment confirmation. If activation is delayed, please contact support."}
        </p>

        <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] p-4 text-sm text-white/85">
          <div className="flex justify-between gap-3">
            <span>Plan</span>
            <span className="font-medium text-white">{plan}</span>
          </div>
          <div className="mt-2 flex justify-between gap-3">
            <span>Billing Interval</span>
            <span className="font-medium text-white">{cycle}</span>
          </div>
          <div className="mt-2 flex justify-between gap-3">
            <span>Amount</span>
            <span className="font-medium text-white">
              {displayAmount ? `${currency} ${displayAmount}` : "N/A"}
            </span>
          </div>
          <div className="mt-2 flex justify-between gap-3">
            <span>Date</span>
            <span className="font-medium text-white">{paidAt}</span>
          </div>
          <div className="mt-2 flex justify-between gap-3">
            <span>Status</span>
            <span className="font-medium text-emerald-200">
              {verifiedSuccess ? "Activated" : "Verification Pending"}
            </span>
          </div>
          {paymentId && (
            <div className="mt-2 flex justify-between gap-3">
              <span>Payment ID</span>
              <span className="font-medium text-white">{paymentId}</span>
            </div>
          )}
          {orderId && (
            <div className="mt-2 flex justify-between gap-3">
              <span>Order ID</span>
              <span className="font-medium text-white">{orderId}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/settings"
            className="inline-flex h-11 items-center rounded-xl bg-[#4F67FF] px-4 text-sm font-semibold text-white transition hover:bg-[#3B55FF]"
          >
            Go to Profile
          </Link>
          <Link
            href="/subscription"
            className="inline-flex h-11 items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-white/85 transition hover:bg-white/[0.08]"
          >
            View Subscription
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-white/85 transition hover:bg-white/[0.08]"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
