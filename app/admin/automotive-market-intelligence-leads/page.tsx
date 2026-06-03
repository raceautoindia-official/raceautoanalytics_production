"use client";

import { useEffect, useMemo, useState } from "react";

type MarketLead = {
  id: number;
  full_name: string;
  business_email: string;
  company_name: string;
  phone_number: string;
  country: string;
  user_type: string;
  interest: string;
  message: string;
  consent: number;
  status: "new" | "contacted" | "qualified" | "closed";
  source_path?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
};

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function statusPill(status: MarketLead["status"]) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize";

  if (status === "qualified") {
    return `${base} border-emerald-400/20 bg-emerald-400/10 text-emerald-200`;
  }
  if (status === "contacted") {
    return `${base} border-blue-400/20 bg-blue-400/10 text-blue-200`;
  }
  if (status === "closed") {
    return `${base} border-white/10 bg-white/5 text-[#EAF0FF]/55`;
  }
  return `${base} border-amber-400/20 bg-amber-400/10 text-amber-200`;
}

export default function AutomotiveMarketIntelligenceLeadsAdminPage() {
  const [rows, setRows] = useState<MarketLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [interest, setInterest] = useState("all");
  const [selected, setSelected] = useState<MarketLead | null>(null);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/automotive-market-intelligence-leads", {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to load leads");
      }
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load leads",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const interests = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.interest).filter(Boolean))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesInterest = interest === "all" || row.interest === interest;
      const haystack = [
        row.full_name,
        row.business_email,
        row.company_name,
        row.phone_number,
        row.country,
        row.user_type,
        row.interest,
      ]
        .join(" ")
        .toLowerCase();
      return matchesInterest && (q ? haystack.includes(q) : true);
    });
  }, [interest, query, rows]);

  return (
    <div className="min-h-screen bg-[#050B1A] text-[#EAF0FF]">
      <div className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-2xl font-semibold">
              Market Intelligence Enquiries
            </div>
            <div className="mt-1 text-sm text-[#EAF0FF]/70">
              Monitor sample report and demo leads from the automotive market
              intelligence landing page.
            </div>
          </div>

          <button
            onClick={load}
            className="h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold transition hover:bg-white/10"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-[#EAF0FF]/70">
              Search
            </label>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, company, email, phone, country..."
              className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-[#EAF0FF] outline-none transition placeholder:text-[#EAF0FF]/45 focus:border-white/20 focus:ring-2 focus:ring-[#4F67FF]/35"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#EAF0FF]/70">
              Interest
            </label>
            <select
              value={interest}
              onChange={(event) => setInterest(event.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-[#EAF0FF] outline-none transition focus:border-white/20 focus:ring-2 focus:ring-[#4F67FF]/35"
            >
              <option value="all" className="bg-[#0B1228]">
                All interests
              </option>
              {interests.map((item) => (
                <option key={item} value={item} className="bg-[#0B1228]">
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0B1228]">
          <div className="overflow-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-white/5 text-left text-xs text-[#EAF0FF]/65">
                <tr>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                  <th className="px-4 py-3 font-semibold">Lead</th>
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Country</th>
                  <th className="px-4 py-3 font-semibold">User Type</th>
                  <th className="px-4 py-3 font-semibold">Interest</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-white/10 hover:bg-white/5"
                  >
                    <td className="px-4 py-3 text-[#EAF0FF]/70">
                      {fmtDate(row.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{row.full_name}</div>
                      <div className="text-xs text-[#EAF0FF]/65">
                        {row.business_email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#EAF0FF]/85">
                      {row.company_name}
                    </td>
                    <td className="px-4 py-3 text-[#EAF0FF]/85">
                      {row.phone_number}
                    </td>
                    <td className="px-4 py-3 text-[#EAF0FF]/85">
                      {row.country}
                    </td>
                    <td className="px-4 py-3 text-[#EAF0FF]/85">
                      {row.user_type}
                    </td>
                    <td className="px-4 py-3 text-[#EAF0FF]/85">
                      {row.interest}
                    </td>
                    <td className="px-4 py-3">
                      <span className={statusPill(row.status)}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelected(row)}
                        className="h-9 rounded-xl bg-[#4F67FF] px-3 text-xs font-semibold text-white transition hover:bg-[#3B55FF]"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}

                {!filtered.length ? (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-[#EAF0FF]/60"
                      colSpan={9}
                    >
                      {loading ? "Loading..." : "No enquiries found"}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-[9999]">
          <button
            aria-label="Close lead details"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelected(null)}
            type="button"
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-[520px] overflow-auto border-l border-white/10 bg-[#0B1228] shadow-[0_30px_90px_rgba(0,0,0,0.85)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-base font-semibold">Enquiry Details</div>
                <div className="mt-0.5 text-xs text-[#EAF0FF]/65">
                  ID #{selected.id} - {fmtDate(selected.created_at)}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-white/10 bg-[#0E1833]/70 p-4">
                <div className="text-sm font-semibold">
                  {selected.full_name}
                </div>
                <div className="mt-2 space-y-1 text-xs text-[#EAF0FF]/72">
                  <div>Email: {selected.business_email}</div>
                  <div>Phone: {selected.phone_number}</div>
                  <div>Company: {selected.company_name}</div>
                  <div>Country: {selected.country}</div>
                  <div>User type: {selected.user_type}</div>
                  <div>Interest: {selected.interest}</div>
                  <div>Source: {selected.source_path || "-"}</div>
                  <div>Consent: {selected.consent ? "Yes" : "No"}</div>
                </div>
                <div className="mt-3">
                  <span className={statusPill(selected.status)}>
                    {selected.status}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0E1833]/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#EAF0FF]/50">
                  Message
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#EAF0FF]/80">
                  {selected.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
