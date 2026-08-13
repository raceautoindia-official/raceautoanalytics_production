"use client";

/**
 * Flash-report charts fall back to the newest month they have when the month
 * the user picked has no data. That fallback is useful — an empty chart is
 * worse — but it used to be SILENT: the month selector kept showing the
 * requested month while the chart drew an older one, so stale numbers looked
 * like current ones (e.g. Brazil two-wheeler application showed April data
 * under a "July" selector, because the upload stopped at April).
 *
 * This renders whenever the month on screen is not the month that was asked
 * for, so the chart is never mislabelled.
 *
 * Month keys here are the chart's own column labels, e.g. "jul 2026".
 */

const MONTH_TITLE: Record<string, string> = {
  jan: "Jan", feb: "Feb", mar: "Mar", apr: "Apr", may: "May", jun: "Jun",
  jul: "Jul", aug: "Aug", sep: "Sep", oct: "Oct", nov: "Nov", dec: "Dec",
};

/** "jul 2026" -> "Jul 2026" (leaves anything unexpected untouched). */
export function prettyMonthKey(key: string | null | undefined): string {
  const raw = String(key || "").trim();
  if (!raw) return "";
  const [m, y] = raw.split(/\s+/);
  if (!m || !y) return raw;
  return `${MONTH_TITLE[m.toLowerCase()] ?? m} ${y}`;
}

/** Build the chart-column key for a "YYYY-MM" value, e.g. "2026-07" -> "jul 2026". */
export function monthKeyFromYyyyMm(yyyymm: string | null | undefined): string {
  const parts = String(yyyymm || "").split("-");
  if (parts.length !== 2) return "";
  const idx = Number(parts[1]) - 1;
  const short = Object.keys(MONTH_TITLE)[idx];
  return short ? `${short} ${parts[0]}` : "";
}

export default function StaleMonthNotice({
  requestedKey,
  shownKey,
}: {
  /** Column key for the month the user selected, e.g. "jul 2026". */
  requestedKey: string | null | undefined;
  /** Column key actually rendered, e.g. "apr 2026". */
  shownKey: string | null | undefined;
}) {
  const req = String(requestedKey || "").trim().toLowerCase();
  const shown = String(shownKey || "").trim().toLowerCase();

  // Nothing to say when we don't know both, or when they agree.
  if (!req || !shown || req === shown) return null;

  return (
    <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-200">
      <span aria-hidden className="mt-[1px]">
        ⚠
      </span>
      <span>
        No data published for <b>{prettyMonthKey(requestedKey)}</b> yet — showing
        the latest available month, <b>{prettyMonthKey(shownKey)}</b>.
      </span>
    </div>
  );
}
