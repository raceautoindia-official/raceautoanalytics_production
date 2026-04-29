// Printable receipt page for a single Razorpay payment.
// Server-rendered: looks up the payment by id, scoped to the logged-in user's
// email so a user cannot read someone else's receipt by guessing payment IDs.
//
// Renders a clean print-optimized HTML view; user uses browser File > Print
// (or Ctrl+P) to save as PDF. No external PDF library required.

import { cookies } from "next/headers";
import Link from "next/link";
import db from "@/lib/db";
import { decodeJwtPayload } from "@/lib/internalSubscriptionFetch";
import { formatPlanLabelOrFallback } from "@/lib/planLabels";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

type PaymentRow = {
  id: number;
  email: string;
  amount: number | null;
  status: string | null;
  plan_name: string | null;
  duration: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
};

async function fetchPayment(
  email: string,
  paymentId: string,
): Promise<PaymentRow | null> {
  try {
    // Look up by either razorpay_payment_id OR razorpay_order_id (audit history
    // shows referenceId can be either). Always scope to the requesting user's
    // email — never trust a guessed ID.
    const [rows]: any = await db.execute(
      `
      SELECT id, email, amount, status, plan_name, duration,
             razorpay_order_id, razorpay_payment_id, created_at
      FROM payment_reference_log
      WHERE email = ?
        AND (razorpay_payment_id = ? OR razorpay_order_id = ?)
      ORDER BY id DESC
      LIMIT 1
      `,
      [email, paymentId, paymentId],
    );
    return rows?.[0] ?? null;
  } catch (err) {
    console.error("receipt fetchPayment error:", err);
    return null;
  }
}

function formatINR(amount: number | null): string {
  if (amount == null) return "—";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ReceiptPage({
  params,
}: {
  params: { paymentId: string };
}) {
  const token = cookies().get("authToken")?.value || "";
  const payload = decodeJwtPayload(token);
  const email = payload?.email ? String(payload.email).trim().toLowerCase() : null;

  if (!email) {
    return (
      <main className="min-h-screen bg-white p-10 text-gray-900">
        <h1 className="text-xl font-semibold">Sign in required</h1>
        <p className="mt-2 text-sm">
          You must be logged in to view this receipt.{" "}
          <Link href="/" className="text-blue-700 underline">
            Go home
          </Link>
        </p>
      </main>
    );
  }

  const row = await fetchPayment(email, params.paymentId);

  if (!row) {
    return (
      <main className="min-h-screen bg-white p-10 text-gray-900">
        <h1 className="text-xl font-semibold">Receipt not found</h1>
        <p className="mt-2 text-sm">
          We could not find a payment matching that reference under your account.
          If you believe this is an error, please email{" "}
          <a className="text-blue-700 underline" href="mailto:info@raceautoindia.com">
            info@raceautoindia.com
          </a>
          .
        </p>
        <p className="mt-4 text-sm">
          <Link href="/settings" className="text-blue-700 underline">
            Back to Settings
          </Link>
        </p>
      </main>
    );
  }

  const status = String(row.status || "").trim().toLowerCase();
  const isSuccess = status === "success";
  const planLabel = formatPlanLabelOrFallback(row.plan_name, row.plan_name || "—");

  return (
    <main className="min-h-screen bg-white text-gray-900 print:bg-white">
      <div className="mx-auto max-w-3xl p-8">
        {/* Print-only style: hide the action bar when printing */}
        <style>{`@media print {.no-print{display:none !important;}}`}</style>

        <div className="no-print mb-6 flex items-center justify-between gap-3">
          <Link
            href="/settings"
            className="text-sm text-blue-700 underline"
          >
            ← Back to Settings
          </Link>
          <div className="flex gap-2">
            <PrintButton />
          </div>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Race Auto Analytics
          </div>
          <h1 className="mt-1 text-2xl font-semibold">Payment Receipt</h1>
          <div className="mt-1 text-xs text-gray-500">
            Receipt # {row.id} · Generated {formatDate(new Date().toISOString())}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <Field label="Billed to" value={row.email} />
          <Field label="Status" value={isSuccess ? "Paid" : (row.status || "—")} />
          <Field label="Plan" value={planLabel} />
          <Field label="Billing cycle" value={row.duration || "—"} />
          <Field label="Payment date" value={formatDate(row.created_at)} />
          <Field label="Payment method" value={row.razorpay_payment_id ? "Razorpay" : "—"} />
          {row.razorpay_payment_id && (
            <Field label="Payment ID" value={row.razorpay_payment_id} />
          )}
          {row.razorpay_order_id && (
            <Field label="Order ID" value={row.razorpay_order_id} />
          )}
        </div>

        <div className="mt-8 rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium text-gray-700">Description</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="px-4 py-3">
                  {planLabel}
                  {row.duration ? ` (${row.duration})` : ""}
                </td>
                <td className="px-4 py-3 text-right">{formatINR(row.amount)}</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-4 py-3 text-gray-600">
                  GST treatment
                </td>
                <td className="px-4 py-3 text-right text-gray-600">Inclusive</td>
              </tr>
              <tr className="border-t border-gray-300 bg-gray-50">
                <td className="px-4 py-3 font-semibold">Total paid</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatINR(row.amount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-xs text-gray-500 leading-relaxed">
          Prices shown above are inclusive of applicable GST. For a tax invoice
          with your business GSTIN or any billing query, contact{" "}
          <a className="text-blue-700 underline" href="mailto:info@raceautoindia.com">
            info@raceautoindia.com
          </a>{" "}
          quoting the Payment ID above.
        </div>

        <div className="no-print mt-8 text-xs text-gray-400">
          This page can be printed or saved as PDF using your browser&apos;s
          print dialog (Ctrl/Cmd + P).
        </div>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-gray-900 break-all">
        {value || "—"}
      </div>
    </div>
  );
}
