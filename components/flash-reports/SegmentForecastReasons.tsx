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
 * Per-OEM view of the forecast: one row per manufacturer, the forecast share
 * for each month of the window, and a single written explanation.
 *
 * Rows come from EVERY OEM in the chart above, not only the ones with CMS copy.
 * Driving them off the CMS list made the ranking look frozen — whoever had a
 * write-up stayed in the table no matter what the shares said, and the rest of
 * the field was invisible. An OEM with no write-up still gets its row and
 * shares, with the explanation left blank.
 *
 * The explanation is deliberately NOT per month — it describes the OEM's
 * position across the whole window, and is maintained once in the CMS under
 * Flash Reports → Forecast Rationale.
 *
 * Shares come from the same cached request as the chart above. Rows are ranked
 * by average share across the window, so the order matches the chart. Renders
 * NOTHING when no rationale is published for the country/segment.
 */

// Medal-ish tints for the top three, neutral after that.
const RANK_STYLES: Record<number, string> = {
  1: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
  2: "bg-slate-300/15 text-slate-200 ring-slate-300/30",
  3: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
};
const RANK_FALLBACK = "bg-muted text-muted-foreground ring-border";

export function SegmentForecastReasons({
  segmentName,
  title = "OEM Forecast Rationale",
}: SegmentForecastReasonsProps) {
  const { region, month } = useAppContext();
  const [reasons, setReasons] = useState<Reason[]>([]);

  // Same cached request the chart above uses.
  const { months, oems } = useSegmentForecastShare(segmentName, region, month);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const url = withCountry(
          `/api/flash-reports/segment-forecast-reasons?segment=${encodeURIComponent(
            segmentName,
          )}`,
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
  }, [segmentName, region]);

  /** Average share per OEM across the window — used to order the rows. */
  const avgShare = useMemo(() => {
    if (!months.length) return null;
    const totals: Record<string, number> = {};
    for (const m of months) {
      for (const [oem, v] of Object.entries(m.values)) {
        totals[oem] = (totals[oem] || 0) + (Number(v) || 0);
      }
    }
    for (const k of Object.keys(totals)) totals[k] /= months.length;
    return totals;
  }, [months]);

  const rows = useMemo(() => {
    const byOem = new Map(reasons.map((r) => [r.oem, r]));

    // Every OEM in the chart, plus any with CMS copy but no share data.
    const names = [...oems];
    for (const r of reasons) if (!names.includes(r.oem)) names.push(r.oem);

    const list = names.map((oem) => ({
      oem,
      description: byOem.get(oem)?.description ?? "",
      // Editorial rank only matters as a tie-break when no shares exist.
      cmsRank: byOem.get(oem)?.rank ?? Number.MAX_SAFE_INTEGER,
    }));

    if (avgShare && list.some((r) => avgShare[r.oem] != null)) {
      list.sort((a, b) => (avgShare[b.oem] ?? -1) - (avgShare[a.oem] ?? -1));
    } else {
      list.sort((a, b) => a.cmsRank - b.cmsRank);
    }

    return list.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [reasons, oems, avgShare]);

  // The section is about the rationale, so it stays hidden until at least one
  // write-up is published — even though the shares alone would fill a table.
  if (!rows.length || !reasons.length) return null;

  const span =
    months.length > 1
      ? `${months[0].label} – ${months[months.length - 1].label}`
      : months[0]?.label;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h3 className="text-base font-semibold text-foreground sm:text-lg">
        {title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        All {rows.length} manufacturers in the forecast, ranked by average share
        {span ? ` across ${span}` : ""}, with what drives the leaders&apos;
        positions.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[52rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="sticky left-0 z-10 bg-card py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                OEM
              </th>
              <th
                scope="col"
                className="w-16 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Rank
              </th>
              {months.map((m) => (
                <th
                  key={m.month}
                  scope="col"
                  className="whitespace-nowrap px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {m.label}
                </th>
              ))}
              <th
                scope="col"
                className="min-w-[20rem] py-2 pl-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Why
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.oem}
                className="border-b border-border/60 align-top last:border-0"
              >
                <td className="sticky left-0 z-10 bg-card py-3 pr-4 text-sm font-semibold text-foreground">
                  {r.oem}
                </td>

                <td className="px-2 py-3 text-center">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ring-1 ${
                      RANK_STYLES[r.rank] || RANK_FALLBACK
                    }`}
                  >
                    {r.rank}
                  </span>
                </td>

                {months.map((m) => {
                  const v = m.values[r.oem];
                  return (
                    <td
                      key={m.month}
                      className="whitespace-nowrap px-2 py-3 text-right text-sm tabular-nums text-foreground"
                    >
                      {typeof v === "number" ? `${v.toFixed(1)}%` : "—"}
                    </td>
                  );
                })}

                <td className="py-3 pl-4 text-sm leading-6 text-muted-foreground">
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
