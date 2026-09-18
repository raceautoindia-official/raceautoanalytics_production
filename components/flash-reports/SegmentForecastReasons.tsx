"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/components/providers/Providers";
import { withCountry } from "@/lib/withCountry";

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
 * Content is maintained in the CMS (Flash Reports → Forecast Rationale) and
 * read from /api/flash-reports/segment-forecast-reasons, scoped by country and
 * segment. Renders NOTHING when nothing is published for that pair, so pages
 * without rationale are not left with an empty heading.
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
  title = "How this forecast was arrived at",
}: SegmentForecastReasonsProps) {
  const { region } = useAppContext();
  const [reasons, setReasons] = useState<Reason[]>([]);

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

  if (!reasons.length) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h3 className="text-base font-semibold text-foreground sm:text-lg">
        {title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        The reasoning behind each manufacturer&apos;s projected share in the
        chart above.
      </p>

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
                className="w-48 py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
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
            {reasons.map((r) => (
              <tr
                key={`${r.rank}-${r.oem}`}
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
                <td className="py-3 pr-4 text-sm font-semibold text-foreground">
                  {r.oem}
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
