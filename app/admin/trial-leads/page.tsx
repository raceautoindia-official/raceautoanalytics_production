"use client";

import React, { useEffect, useMemo, useState } from "react";

type Lead = {
  id: number;
  name: string;
  email: string;
  phone: string;
  segment: string;
  company?: string | null;
  description?: string | null;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  temp_username?: string | null;
  trial_expires_at?: string | null;
};

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function statusPill(status: Lead["status"]) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold";
  if (status === "approved")
    return `${base} border-emerald-400/20 bg-emerald-400/10 text-emerald-200`;
  if (status === "rejected")
    return `${base} border-red-400/20 bg-red-400/10 text-red-200`;
  return `${base} border-white/10 bg-white/5 text-[#EAF0FF]/80`;
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

export default function AdminTrialLeadsPage() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | Lead["status"]>("all");
const [emailSent, setEmailSent] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // approval result (temp credentials shown to admin first)
  const [creds, setCreds] = useState<null | {
    temp_username: string;
    temp_password: string;
    expires_in_days: number;
  }>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionErr, setActionErr] = useState<string>("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/trial-leads", { cache: "no-store" });
      const data = await res.json();
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesStatus = filter === "all" ? true : r.status === filter;
      const hay =
        `${r.name} ${r.email} ${r.phone} ${r.segment} ${r.company || ""}`.toLowerCase();
      const matchesQuery = qq ? hay.includes(qq) : true;
      return matchesStatus && matchesQuery;
    });
  }, [rows, q, filter]);

  const openDrawer = (lead: Lead) => {
    setSelected(lead);
    setCreds(null);
    setActionErr("");
    setDrawerOpen(true);
    setEmailSent(false);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelected(null);
    setCreds(null);
    setActionErr("");
  };

  const updateStatus = async (status: "approved" | "rejected") => {
    if (!selected) return;

    setActionLoading(true);
    setActionErr("");
    setCreds(null);

    try {
      const res = await fetch(`/api/admin/trial-leads/${selected.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // reviewedBy can be added later once we wire admin identity
        body: JSON.stringify({ status }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to update status");

      // If approved, API returns temp credentials (plain pw only once)
      if (status === "approved" && data?.temp_username && data?.temp_password) {
        setCreds({
          temp_username: data.temp_username,
          temp_password: data.temp_password,
          expires_in_days: data.expires_in_days || 7,
        });
      }

      // reload list and refresh selected lead info
      await load();

      // keep drawer open but update selected with latest row
      const refreshed = rows.find((r) => r.id === selected.id);
      if (refreshed) setSelected(refreshed);
    } catch (e: any) {
      setActionErr(e?.message || "Something went wrong");
    } finally {
      setActionLoading(false);
      setEmailSent(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050B1A] text-[#EAF0FF]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-2xl font-semibold">Trial Leads</div>
            <div className="mt-1 text-sm text-[#EAF0FF]/70">
              Review free trial requests and generate temporary credentials.
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={load}
              className="h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold hover:bg-white/10 transition"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-[#EAF0FF]/70">
              Search
            </label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email, phone, segment..."
              className="h-10 w-full rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-[#EAF0FF] placeholder:text-[#EAF0FF]/45 outline-none focus:ring-2 focus:ring-[#4F67FF]/35 focus:border-white/20 transition"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#EAF0FF]/70">
              Status
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="h-10 w-full rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-[#EAF0FF] outline-none focus:ring-2 focus:ring-[#4F67FF]/35 focus:border-white/20 transition"
            >
              <option value="all" className="bg-[#0B1228]">All</option>
              <option value="pending" className="bg-[#0B1228]">Pending</option>
              <option value="approved" className="bg-[#0B1228]">Approved</option>
              <option value="rejected" className="bg-[#0B1228]">Rejected</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0B1228]">
          <div className="overflow-auto">
            <table className="min-w-[980px] w-full">
              <thead className="bg-white/5 text-left text-xs text-[#EAF0FF]/65">
                <tr>
                  <th className="px-4 py-3 font-semibold">Requested</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Segment</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Expires</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-white/10 hover:bg-white/5"
                  >
                    <td className="px-4 py-3 text-[#EAF0FF]/75">
                      {fmtDate(r.requested_at)}
                    </td>
                    <td className="px-4 py-3 font-semibold">{r.name}</td>
                    <td className="px-4 py-3 text-[#EAF0FF]/85">{r.email}</td>
                    <td className="px-4 py-3 text-[#EAF0FF]/85">{r.phone}</td>
                    <td className="px-4 py-3 text-[#EAF0FF]/85">{r.segment}</td>
                    <td className="px-4 py-3">
                      <span className={statusPill(r.status)}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-[#EAF0FF]/75">
                      {r.trial_expires_at ? fmtDate(r.trial_expires_at) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openDrawer(r)}
                        className="h-9 rounded-xl bg-[#4F67FF] px-3 text-xs font-semibold text-white hover:bg-[#3B55FF] transition"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}

                {!filtered.length && (
                  <tr>
                    <td className="px-4 py-10 text-center text-[#EAF0FF]/60" colSpan={8}>
                      {loading ? "Loading..." : "No leads found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Drawer */}
      {drawerOpen && selected && (
        <div className="fixed inset-0 z-[9999]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeDrawer}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-[520px] border-l border-white/10 bg-[#0B1228] shadow-[0_30px_90px_rgba(0,0,0,0.85)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-base font-semibold">Lead Details</div>
                <div className="mt-0.5 text-xs text-[#EAF0FF]/65">
                  ID #{selected.id} • {fmtDate(selected.requested_at)}
                </div>
              </div>
              <button
                onClick={closeDrawer}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#0E1833]/70 p-4">
                <div className="text-sm font-semibold">{selected.name}</div>
                <div className="mt-1 text-xs text-[#EAF0FF]/70">
                  <div><span className="text-[#EAF0FF]/55">Email:</span> {selected.email}</div>
                  <div><span className="text-[#EAF0FF]/55">Phone:</span> {selected.phone}</div>
                  <div><span className="text-[#EAF0FF]/55">Segment:</span> {selected.segment}</div>
                  <div>
                    <span className="text-[#EAF0FF]/55">Company:</span>{" "}
                    {selected.company || "-"}
                  </div>
                </div>

                {selected.description ? (
                  <div className="mt-3 text-xs text-[#EAF0FF]/70 leading-5">
                    <span className="text-[#EAF0FF]/55">Description:</span>{" "}
                    {selected.description}
                  </div>
                ) : null}

                <div className="mt-3">
                  <span className={statusPill(selected.status)}>{selected.status}</span>
                </div>

                <div className="mt-3 text-xs text-[#EAF0FF]/60">
                  <div><span className="text-[#EAF0FF]/45">Reviewed at:</span> {fmtDate(selected.reviewed_at || null)}</div>
                  <div><span className="text-[#EAF0FF]/45">Reviewed by:</span> {selected.reviewed_by || "-"}</div>
                  <div><span className="text-[#EAF0FF]/45">Trial expires:</span> {fmtDate(selected.trial_expires_at || null)}</div>
                </div>
              </div>

              {actionErr ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {actionErr}
                </div>
              ) : null}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={actionLoading || selected.status === "approved"}
                  onClick={() => updateStatus("approved")}
                  className="h-11 rounded-2xl bg-[#4F67FF] text-white font-semibold shadow-[0_12px_30px_rgba(79,103,255,0.25)] hover:bg-[#3B55FF] transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Processing..." : "Approve"}
                </button>

                <button
                  disabled={actionLoading || selected.status === "rejected"}
                  onClick={() => updateStatus("rejected")}
                  className="h-11 rounded-2xl border border-white/10 bg-white/5 text-[#EAF0FF] font-semibold hover:bg-white/10 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Processing..." : "Reject"}
                </button>
              </div>

              {/* Temp credentials shown to admin first */}
{creds && (
  <>
    <div className="rounded-2xl border border-white/10 bg-[#0E1833]/70 p-4">
      <div className="text-sm font-semibold text-[#EAF0FF]">
        Temporary Credentials (7 days)
      </div>

      <div className="mt-2 space-y-2 text-xs text-[#EAF0FF]/75">
        <div className="flex items-center justify-between gap-2">
          <span>
            <span className="text-[#EAF0FF]/55">Username:</span>{" "}
            {creds.temp_username}
          </span>
          <button
            onClick={() => copy(creds.temp_username)}
            className="h-8 rounded-xl border border-white/10 bg-white/5 px-3 text-[11px] font-semibold hover:bg-white/10 transition"
          >
            Copy
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span>
            <span className="text-[#EAF0FF]/55">Password:</span>{" "}
            <span className="font-mono">{creds.temp_password}</span>
          </span>
          <button
            onClick={() => copy(creds.temp_password)}
            className="h-8 rounded-xl border border-white/10 bg-white/5 px-3 text-[11px] font-semibold hover:bg-white/10 transition"
          >
            Copy
          </button>
        </div>

        <div className="text-[11px] text-[#EAF0FF]/55">
          Password is shown only once here. Save it before leaving this panel.
        </div>
      </div>

      {/* SEND EMAIL BUTTON */}
      <button
        onClick={async () => {
          if (!selected || !creds) return;
          setActionLoading(true);
          setActionErr("");
          setEmailSent(false);
          try {
            const res = await fetch(
              `/api/admin/trial-leads/${selected.id}/send-activation`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ temp_password: creds.temp_password }),
              }
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.message || "Email failed");
            setEmailSent(true);
          } catch (e: any) {
            setActionErr(e?.message || "Email failed");
          } finally {
            setActionLoading(false);
          }
        }}
        disabled={actionLoading || emailSent}
        className="mt-4 h-11 w-full rounded-2xl bg-[#4F67FF] text-white font-semibold shadow-[0_12px_30px_rgba(79,103,255,0.25)] hover:bg-[#3B55FF] transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {emailSent ? "Activation Email Sent ✅" : "Send Activation Email to User"}
      </button>
    </div>
  </>
)}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}