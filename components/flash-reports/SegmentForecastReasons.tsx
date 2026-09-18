"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "@/components/providers/Providers";
import { withCountry } from "@/lib/withCountry";
import { useSegmentForecastShare } from "./useSegmentForecastShare";

type Reason = { rank: number; oem: string; description: string };

interface SegmentForecastReasonsProps {
  /** Same segment string the chart above uses (e.g. "passenger vehicle"). */
  segmentName: string;
  title?: string;
}

/**
 * "How the forecast was arrived at" — sits under the segment forecast share
 * chart and explains, per OEM, the reasoning behind its projected share.
 *
 * The month dropdown re-ranks the table by that month's forecast share, so the
 * badge shows who actually tops the segment in the chosen month. The written
 * reason stays one per OEM (it explains the OEM's position across the window,
 * not a single month), and is maintained in the CMS under
 * Flash Reports → Forecast Rationale.
 *
 * Renders NOTHING when nothing is published for the country/segment pair.
 */

const ALL = "__avg__";

// Medal-ish tints for the top three, neutral after that.
const RANK_STYLES: Record<number, string> = {
  1: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
  2: "bg-slate-300/15 text-slate-200 ring-slate-300/30",
  3: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
};
const RANK_FALLBACK = "bg-muted text-muted-foreground ring-border";

export function SegmentForecastReasons({
  segmentName,
  // Noun phrase, to sit alongside "… OEM Segment Share" and "… Brand Models"
  // rather than breaking into a sentence.
  title = "OEM Forecast Rationale",
}: SegmentForecastReasonsProps) {
  const { region, month } = useAppContext();
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [selected, setSelected] = useState<string>(ALL);

  // Same cached request the chart above uses.
  const { months } = useSegmentForecastShare(segmentName, region, month);

  // Refetches on month change: an editor can publish different wording per
  // month, and the API falls back to the default set for months without any.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const monthParam = selected === ALL ? "" : `&month=${encodeURIComponent(selected)}`;
        const url = withCountry(
          `/api/flash-reports/segment-forecast-reasons?segment=${encodeURIComponent(
            segmentName,
          )}${monthParam}`,
          region,
        );
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load rationale: ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setReasons(Array.isArray(json?.reasons) ? json.reasons : []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setReasons([]);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [segmentName, region, selected]);

  // Drop a stale selection if the forecast window moves.
  useEffect(() => {
    setSelected((prev) =>
      prev !== ALL && !months.some((m) => m.month === prev) ? ALL : prev,
    );
  }, [months]);

  /**
   * Share per OEM for the chosen month, or averaged across the window. Used to
   * order the table so the rank badge reflects the selected month rather than
   * a fixed editorial order.
   */
  const shares = useMemo(() => {
    if (!months.length) return null;
    const scope =
      selected === ALL ? months : months.filter((m) => m.month === selected);
    if (!scope.length) return null;

    const totals: Record<string, number> = {};
    for (const m of scope) {
      for (const [oem, v] of Object.entries(m.values)) {
        totals[oem] = (totals[oem] || 0) + (Number(v) || 0);
      }
    }
    for (const k of Object.keys(totals)) totals[k] /= scope.length;
    return totals;
  }, [months, selected]);

  // Rank by the selected month's share where we have it; otherwise keep the
  // editorial rank set in the CMS.
  const ordered = useMemo(() => {
    const rows = [...reasons];
    if (shares) {
      rows.sort((a, b) => (shares[b.oem] ?? -1) - (shares[a.oem] ?? -1));
      const anyShare = rows.some((r) => shares[r.oem] != null);
      if (anyShare) {
        return rows.map((r, i) => ({
          ...r,
          rank: i + 1,
          share: shares[r.oem],
        }));
      }
    }
    return rows
      .sort((a, b) => a.rank - b.rank)
      .map((r) => ({ ...r, share: undefined as number | undefined }));
  }, [reasons, shares]);

  if (!ordered.length) return null;

  const scopeLabel =
    selected === ALL
      ? "averaged across the forecast window"
      : `for ${months.find((m) => m.month === selected)?.label ?? selected}`;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground sm:text-lg">
            {title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            What drives each manufacturer&apos;s projected share in the chart
            above, ranked {scopeLabel}.
          </p>
        </div>

        {months.length > 0 && (
          <label className="inline-flex flex-col items-start">
            <span className="sr-only">Select month</span>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              aria-label="Rank by month"
              className="h-9 min-w-[10rem] rounded-lg border border-border bg-card px-2 text-xs font-medium focus-ring hover:bg-accent transition-colors sm:px-3 sm:text-sm"
            >
              <option value={ALL}>All months (average)</option>
              {months.map((m) => (
                <option key={m.month} value={m.month}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="w-16 py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Rank
              </th>
              <th
                scope="col"
                className="w-52 py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                OEM
              </th>
              <th
                scope="col"
                className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Why
              </th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((r) => (
              <tr
                key={r.oem}
                className="border-b border-border/60 align-top last:border-0"
              >
                <td className="py-3 pr-3">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-1 ${
                      RANK_STYLES[r.rank] || RANK_FALLBACK
                    }`}
                  >
                    {r.rank}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <div className="text-sm font-semibold text-foreground">
                    {r.oem}
                  </div>
                  {typeof r.share === "number" && (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {r.share.toFixed(1)}% share
                    </div>
                  )}
                </td>
                <td className="py-3 text-sm leading-6 text-muted-foreground">
                  {r.description || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
