"use client";

import React, { useEffect, useMemo, useState } from "react";

type PlanRow = {
  id: number;
  remote_plan_id: number;
  plan: string;
  platinum: number | null;
  gold: number | null;
  silver: number | null;
  bronze: number | null;
  description?: string | null;
  synced_at?: string | null;
  created_at?: string | null;
};

type CurrentRow = {
  id: number;
  email: string;
  remote_user_id?: number | null;
  remote_subscription_id?: number | null;
  payment_id?: string | null;
  plan_name: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  synced_at?: string | null;
  created_at?: string | null;
};

type PaymentRow = {
  id: number;
  email: string;
  remote_user_id?: number | null;
  plan_name?: string | null;
  duration?: string | null;
  amount?: number | null;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  status: string;
  message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function fmtMoney(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-IN").format(Number(value));
}

function pillClass(value: string) {
  const v = String(value || "").toLowerCase();

  if (v === "success" || v === "active") {
    return "inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-200";
  }

  if (v === "failed" || v === "expired" || v === "rejected") {
    return "inline-flex items-center rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-xs font-semibold text-red-200";
  }

  if (v === "created" || v === "pending") {
    return "inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-200";
  }

  return "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-[#EAF0FF]/80";
}

export default function SubscriptionReferenceAdminPage() {
  const [authenticated, setAuthenticated] = useState(false);

  const [tab, setTab] = useState<"plans" | "current" | "payments">("plans");

  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [currentRows, setCurrentRows] = useState<CurrentRow[]>([]);
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([]);

  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [page, setPage] = useState(1);

  const [paymentTotal, setPaymentTotal] = useState(0);
  const paymentLimit = 25;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = localStorage.getItem("isAdmin");
      setAuthenticated(auth === "true");
    }
  }, []);

  const loadPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await fetch("/api/admin/subscription-reference/plans", {
        cache: "no-store",
      });
      const data = await res.json();
      setPlans(Array.isArray(data?.rows) ? data.rows : []);
    } finally {
      setLoadingPlans(false);
    }
  };

  const loadCurrent = async () => {
    setLoadingCurrent(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (plan) params.set("plan", plan);

      const res = await fetch(
        `/api/admin/subscription-reference/current?${params.toString()}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setCurrentRows(Array.isArray(data?.rows) ? data.rows : []);
    } finally {
      setLoadingCurrent(false);
    }
  };

  const loadPayments = async () => {
    setLoadingPayments(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (plan) params.set("plan", plan);
      params.set("page", String(page));
      params.set("limit", String(paymentLimit));

      const res = await fetch(
        `/api/admin/subscription-reference/payments?${params.toString()}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setPaymentRows(Array.isArray(data?.rows) ? data.rows : []);
      setPaymentTotal(Number(data?.pagination?.total || 0));
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    if (!authenticated) return;
    loadPlans();
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    if (tab === "current") loadCurrent();
    if (tab === "payments") loadPayments();
  }, [authenticated, tab, page]);

  const totalPaymentPages = useMemo(() => {
    return Math.max(Math.ceil(paymentTotal / paymentLimit), 1);
  }, [paymentTotal]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#050B1A] px-4 py-12 text-[#EAF0FF]">
        <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#0B1228] p-8">
          <div className="text-2xl font-semibold">Subscription Reference</div>
          <div className="mt-2 text-sm text-[#EAF0FF]/70">
            Please login from the main admin page first.
          </div>
          <a
            href="/admin"
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-[#4F67FF] px-5 text-sm font-semibold text-white hover:bg-[#3B55FF]"
          >
            Go to Admin Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050B1A] text-[#EAF0FF]">
      <div className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-2xl font-semibold">Subscription Reference</div>
            <div className="mt-1 text-sm text-[#EAF0FF]/70">
              Read-only subscription pricing, current-plan snapshot, and payment logs from Analytics DB.
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (tab === "plans") loadPlans();
                if (tab === "current") loadCurrent();
                if (tab === "payments") loadPayments();
              }}
              className="h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold hover:bg-white/10 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { key: "plans", label: "Pricing Reference" },
            { key: "current", label: "Current Subscription Snapshot" },
            { key: "payments", label: "Payment Logs" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setTab(item.key as any);
                setPage(1);
              }}
              className={[
                "h-10 rounded-xl px-4 text-sm font-semibold transition",
                tab === item.key
                  ? "bg-[#4F67FF] text-white"
                  : "border border-white/10 bg-white/5 text-[#EAF0FF]/80 hover:bg-white/10",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>

        {(tab === "current" || tab === "payments") && (
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#EAF0FF]/70">
                Search
              </label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={
                  tab === "payments"
                    ? "Search by email, order id, payment id..."
                    : "Search by email or payment id..."
                }
                className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-[#EAF0FF] placeholder:text-[#EAF0FF]/45 outline-none focus:border-white/20 focus:ring-2 focus:ring-[#4F67FF]/35"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#EAF0FF]/70">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-[#EAF0FF] outline-none focus:border-white/20 focus:ring-2 focus:ring-[#4F67FF]/35"
              >
                <option value="" className="bg-[#0B1228]">
                  All
                </option>
                <option value="Active" className="bg-[#0B1228]">
                  Active
                </option>
                <option value="expired" className="bg-[#0B1228]">
                  Expired
                </option>
                <option value="created" className="bg-[#0B1228]">
                  Created
                </option>
                <option value="success" className="bg-[#0B1228]">
                  Success
                </option>
                <option value="failed" className="bg-[#0B1228]">
                  Failed
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#EAF0FF]/70">
                Plan
              </label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-[#EAF0FF] outline-none focus:border-white/20 focus:ring-2 focus:ring-[#4F67FF]/35"
              >
                <option value="" className="bg-[#0B1228]">
                  All
                </option>
                <option value="silver" className="bg-[#0B1228]">
                  Silver
                </option>
                <option value="gold" className="bg-[#0B1228]">
                  Gold
                </option>
                <option value="platinum" className="bg-[#0B1228]">
                  Platinum
                </option>
              </select>
            </div>

            <div className="sm:col-span-4 flex gap-2">
              <button
                onClick={() => {
                  setPage(1);
                  if (tab === "current") loadCurrent();
                  if (tab === "payments") loadPayments();
                }}
                className="h-10 rounded-xl bg-[#4F67FF] px-4 text-sm font-semibold text-white hover:bg-[#3B55FF]"
              >
                Apply Filters
              </button>

              <button
                onClick={() => {
                  setQ("");
                  setStatus("");
                  setPlan("");
                  setPage(1);
                  setTimeout(() => {
                    if (tab === "current") loadCurrent();
                    if (tab === "payments") loadPayments();
                  }, 0);
                }}
                className="h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-[#EAF0FF]/85 hover:bg-white/10"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {tab === "plans" && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0B1228]">
            <div className="overflow-auto">
              <table className="min-w-[980px] w-full">
                <thead className="bg-white/5 text-left text-xs text-[#EAF0FF]/65">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Remote ID</th>
                    <th className="px-4 py-3 font-semibold">Plan Row</th>
                    <th className="px-4 py-3 font-semibold">Silver</th>
                    <th className="px-4 py-3 font-semibold">Gold</th>
                    <th className="px-4 py-3 font-semibold">Platinum</th>
                    <th className="px-4 py-3 font-semibold">Bronze</th>
                    <th className="px-4 py-3 font-semibold">Synced At</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {plans.map((row) => (
                    <tr key={row.id} className="border-t border-white/10 hover:bg-white/5">
                      <td className="px-4 py-3 text-[#EAF0FF]/75">{row.remote_plan_id}</td>
                      <td className="px-4 py-3 font-semibold">{row.plan}</td>
                      <td className="px-4 py-3">{row.silver ?? "-"}</td>
                      <td className="px-4 py-3">{row.gold ?? "-"}</td>
                      <td className="px-4 py-3">{row.platinum ?? "-"}</td>
                      <td className="px-4 py-3">{row.bronze ?? "-"}</td>
                      <td className="px-4 py-3 text-[#EAF0FF]/75">{fmtDate(row.synced_at)}</td>
                    </tr>
                  ))}

                  {!plans.length && (
                    <tr>
                      <td className="px-4 py-10 text-center text-[#EAF0FF]/60" colSpan={7}>
                        {loadingPlans ? "Loading..." : "No pricing reference found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "current" && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0B1228]">
            <div className="overflow-auto">
              <table className="min-w-[1100px] w-full">
                <thead className="bg-white/5 text-left text-xs text-[#EAF0FF]/65">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Remote User</th>
                    <th className="px-4 py-3 font-semibold">Remote Subscription</th>
                    <th className="px-4 py-3 font-semibold">Payment ID</th>
                    <th className="px-4 py-3 font-semibold">Plan</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Start</th>
                    <th className="px-4 py-3 font-semibold">End</th>
                    <th className="px-4 py-3 font-semibold">Synced</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {currentRows.map((row) => (
                    <tr key={row.id} className="border-t border-white/10 hover:bg-white/5">
                      <td className="px-4 py-3 font-medium">{row.email}</td>
                      <td className="px-4 py-3 text-[#EAF0FF]/75">{row.remote_user_id ?? "-"}</td>
                      <td className="px-4 py-3 text-[#EAF0FF]/75">{row.remote_subscription_id ?? "-"}</td>
                      <td className="px-4 py-3 text-[#EAF0FF]/85">{row.payment_id || "-"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold uppercase text-[#EAF0FF]/85">
                          {row.plan_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={pillClass(row.status)}>{row.status}</span>
                      </td>
                      <td className="px-4 py-3 text-[#EAF0FF]/75">{fmtDate(row.start_date)}</td>
                      <td className="px-4 py-3 text-[#EAF0FF]/75">{fmtDate(row.end_date)}</td>
                      <td className="px-4 py-3 text-[#EAF0FF]/75">{fmtDate(row.synced_at)}</td>
                    </tr>
                  ))}

                  {!currentRows.length && (
                    <tr>
                      <td className="px-4 py-10 text-center text-[#EAF0FF]/60" colSpan={9}>
                        {loadingCurrent ? "Loading..." : "No subscription snapshot found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "payments" && (
          <>
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0B1228]">
              <div className="overflow-auto">
                <table className="min-w-[1250px] w-full">
                  <thead className="bg-white/5 text-left text-xs text-[#EAF0FF]/65">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Created</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Plan</th>
                      <th className="px-4 py-3 font-semibold">Duration</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Order ID</th>
                      <th className="px-4 py-3 font-semibold">Payment ID</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Message</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {paymentRows.map((row) => (
                      <tr key={row.id} className="border-t border-white/10 hover:bg-white/5">
                        <td className="px-4 py-3 text-[#EAF0FF]/75">{fmtDate(row.created_at)}</td>
                        <td className="px-4 py-3 font-medium">{row.email}</td>
                        <td className="px-4 py-3">
                          {row.plan_name ? (
                            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold uppercase text-[#EAF0FF]/85">
                              {row.plan_name}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#EAF0FF]/85">{row.duration || "-"}</td>
                        <td className="px-4 py-3 text-[#EAF0FF]/85">
                          {row.amount !== null && row.amount !== undefined ? `₹${fmtMoney(row.amount)}` : "-"}
                        </td>
                        <td className="px-4 py-3 text-[#EAF0FF]/75">{row.razorpay_order_id || "-"}</td>
                        <td className="px-4 py-3 text-[#EAF0FF]/75">{row.razorpay_payment_id || "-"}</td>
                        <td className="px-4 py-3">
                          <span className={pillClass(row.status)}>{row.status}</span>
                        </td>
                        <td className="px-4 py-3 text-[#EAF0FF]/75">{row.message || "-"}</td>
                      </tr>
                    ))}

                    {!paymentRows.length && (
                      <tr>
                        <td className="px-4 py-10 text-center text-[#EAF0FF]/60" colSpan={9}>
                          {loadingPayments ? "Loading..." : "No payment logs found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-[#EAF0FF]/70">
                Total logs: {paymentTotal}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  className="h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-[#EAF0FF]/85 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>

                <div className="text-sm text-[#EAF0FF]/75">
                  Page {page} / {totalPaymentPages}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPaymentPages))}
                  disabled={page >= totalPaymentPages}
                  className="h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-[#EAF0FF]/85 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}