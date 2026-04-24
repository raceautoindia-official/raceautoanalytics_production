import Link from "next/link";
import { cookies } from "next/headers";
import db from "@/lib/db";
import { decodeJwtPayload } from "@/lib/internalSubscriptionFetch";

type SearchParams = Record<string, string | string[] | undefined>;
type PaymentLogRow = {
  id: number;
  status: string | null;
  created_at: string;
  message: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
};

function readStringParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  return null;
}

async function verifyFailurePayment(
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
    SELECT id, status, created_at, message, razorpay_order_id, razorpay_payment_id
    FROM payment_reference_log
    WHERE email = ?
      AND (${clauses.join(" OR ")})
    ORDER BY id DESC
    LIMIT 1
    `,
    params,
  );

  return ((rows as PaymentLogRow[])[0] || null) as PaymentLogRow | null;
}

export default async function SubscriptionPaymentFailurePage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const reason =
    readStringParam(searchParams?.reason) ||
    "We couldn't complete your payment. Please try again.";
  const orderId = readStringParam(searchParams?.orderId);
  const paymentId = readStringParam(searchParams?.paymentId);

  const token = cookies().get("authToken")?.value || "";
  const payload = decodeJwtPayload(token);
  const email = payload?.email ? String(payload.email).trim().toLowerCase() : null;

  let paymentRow: PaymentLogRow | null = null;
  if (email) {
    try {
      paymentRow = await verifyFailurePayment(email, orderId, paymentId);
    } catch (error) {
      console.error("subscription failure verification error:", error);
    }
  }

  const verifiedFailure =
    String(paymentRow?.status || "").trim().toLowerCase() === "failed";
  const message = paymentRow?.message || reason;
  const failedAtValue = paymentRow?.created_at || new Date().toISOString();
  const failedAt = new Date(failedAtValue).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="min-h-screen bg-[#050B1A] px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-red-400/25 bg-[#0B1228] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <div className="mb-4 inline-flex rounded-full border border-red-400/30 bg-red-500/12 px-3 py-1 text-xs font-semibold text-red-200">
          Payment Status: {verifiedFailure ? "Verified Failed" : "Unverified Failure"}
        </div>
        <h1 className="text-2xl font-semibold text-red-200">Payment Failed</h1>
        <p className="mt-2 text-sm text-white/70">
          We couldn&apos;t complete your payment. Please try again.
        </p>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/60">
          Attempted on: {failedAt}
        </div>
        <p className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {message}
        </p>
        {!verifiedFailure && (
          <p className="mt-3 text-xs text-white/60">
            We could not verify this failure record from backend logs. If money was
            debited, contact support with your order or payment ID.
          </p>
        )}
        {(orderId || paymentId) && (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/70">
            {orderId && <div>Order ID: {orderId}</div>}
            {paymentId && <div className="mt-1">Payment ID: {paymentId}</div>}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/subscription"
            className="inline-flex h-11 items-center rounded-xl bg-red-500 px-4 text-sm font-semibold text-white transition hover:bg-red-400"
          >
            Try Again
          </Link>
          <Link
            href="/subscription"
            className="inline-flex h-11 items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-white/85 transition hover:bg-white/[0.08]"
          >
            Back to Subscription
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
