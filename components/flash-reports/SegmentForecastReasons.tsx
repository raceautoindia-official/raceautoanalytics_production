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
 * The month cells carry the OEM's RANK that month (1 = segment leader), not its
 * share: the share is already readable off the chart above, whereas rank makes
 * position changes across the window obvious at a glance.
 *
 * Shares come from the same cached request as the chart above. Rows are ordered
 * by average rank across the window. Renders NOTHING when no rationale is
 * published for the country/segment.
 */

/**
 * Rank badges carry the navbar Subscribe button's yellow by default, and
 * switch colour only where the OEM's rank MOVED against the previous month:
 * green for a climb, red for a slip. The tinted-by-position styling they had
 * before was too faint to read on the dark card.
 */
const RANK_BADGE = {
  same: "bg-gradient-to-b from-yellow-400 to-amber-500 text-slate-900",
  up: "bg-gradient-to-b from-emerald-400 to-green-500 text-slate-900",
  down: "bg-gradient-to-b from-red-400 to-rose-500 text-slate-900",
} as const;

type Move = keyof typeof RANK_BADGE;

const MOVE_NOTE: Record<Move, string> = {
  same: "unchanged",
  up: "up",
  down: "down",
};

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

  /** Rank within each month: month key -> OEM -> 1-based position by share. */
  const ranksByMonth = useMemo(() => {
    const out: Record<string, Record<string, number>> = {};
    for (const m of months) {
      const ordered = Object.entries(m.values)
        .filter(([, v]) => Number(v) > 0)
        .sort((a, b) => Number(b[1]) - Number(a[1]));
      const r: Record<string, number> = {};
      ordered.forEach(([oem], i) => {
        r[oem] = i + 1;
      });
      out[m.month] = r;
    }
    return out;
  }, [months]);

  /** Mean rank across the months an OEM appears in — used to order the rows. */
  const avgRank = useMemo(() => {
    const sums: Record<string, { total: number; n: number }> = {};
    for (const m of months) {
      for (const [oem, rank] of Object.entries(ranksByMonth[m.month] || {})) {
        const acc = sums[oem] || { total: 0, n: 0 };
        acc.total += rank;
        acc.n += 1;
        sums[oem] = acc;
      }
    }
    const out: Record<string, number> = {};
    for (const [oem, { total, n }] of Object.entries(sums)) out[oem] = total / n;
    return out;
  }, [months, ranksByMonth]);

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

    // Best average rank first; OEMs with no monthly data fall to the bottom in
    // the editorial order.
    const BOTTOM = Number.MAX_SAFE_INTEGER;
    list.sort(
      (a, b) =>
        (avgRank[a.oem] ?? BOTTOM) - (avgRank[b.oem] ?? BOTTOM) ||
        a.cmsRank - b.cmsRank,
    );

    return list;
  }, [reasons, oems, avgRank]);

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
        Each manufacturer&apos;s forecast rank in every month
        {span ? ` of ${span}` : ""} — 1 is the segment leader that month — with
        what drives the leaders&apos; positions. Rows are ordered by average
        rank across the window.
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th
                scope="col"
                className="sticky left-0 z-10 border-r border-border bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                OEM
              </th>
              {months.map((m) => (
                <th
                  key={m.month}
                  scope="col"
                  className="whitespace-nowrap border-r border-border px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {m.label}
                </th>
              ))}
              <th
                scope="col"
                className="min-w-[20rem] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Why
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.oem}
                className="border-b border-border/60 align-middle transition-colors last:border-0 odd:bg-muted/10 hover:bg-accent/30"
              >
                <td className="sticky left-0 z-10 border-r border-border bg-card px-4 py-3 font-semibold text-foreground">
                  {r.oem}
                </td>

                {months.map((m, i) => {
                  const rank = ranksByMonth[m.month]?.[r.oem];
                  const prev =
                    i > 0 ? ranksByMonth[months[i - 1].month]?.[r.oem] : undefined;

                  // A smaller number is a better position, so rank < prev is a
                  // climb. The first month has nothing to compare against.
                  const move: Move =
                    rank && prev
                      ? rank < prev
                        ? "up"
                        : rank > prev
                          ? "down"
                          : "same"
                      : "same";

                  const note =
                    rank && prev && move !== "same"
                      ? `Rank ${rank} in ${m.label}, ${MOVE_NOTE[move]} from ${prev}`
                      : `Rank ${rank} in ${m.label}`;

                  return (
                    <td
                      key={m.month}
                      className="border-r border-border/60 px-3 py-3 text-center"
                    >
                      {rank ? (
                        <span
                          title={note}
                          className={`inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums shadow-sm ${RANK_BADGE[move]}`}
                        >
                          {rank}
                          {/* Colour alone should not carry the meaning. */}
                          <span className="sr-only"> ({note})</span>
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}

                <td className="px-4 py-3 align-top text-sm leading-6 text-muted-foreground">
                  {r.description || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 list-none p-0 text-xs text-muted-foreground">
        {(
          [
            ["same", "Position held"],
            ["up", "Moved up from the previous month"],
            ["down", "Moved down from the previous month"],
          ] as Array<[Move, string]>
        ).map(([key, label]) => (
          <li key={key} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className={`inline-block h-3.5 w-3.5 shrink-0 rounded-full ${RANK_BADGE[key]}`}
            />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
