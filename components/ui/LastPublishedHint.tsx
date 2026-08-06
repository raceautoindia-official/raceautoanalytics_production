"use client";

import { useAppContext } from "@/components/providers/Providers";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const YYYYMM = /^\d{4}-(0[1-9]|1[0-2])$/;

/** "2025-06" + 1 → "2025-07" (handles the December → January rollover). */
function addMonths(yyyymm: string, delta: number): string {
  const [y, m] = yyyymm.split("-").map(Number);
  // Month index is 0-based here, so (m - 1 + delta) stays in the same space.
  const total = y * 12 + (m - 1) + delta;
  const year = Math.floor(total / 12);
  const month = total % 12;
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

/** "2025-07" → "July 2025". */
function formatYYYYMM(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  return `${MONTH_NAMES[m - 1] ?? m} ${y}`;
}

// The publish month is derived from the SELECTED COUNTRY's newest available
// data month, not from today's calendar date. A month of data is published the
// following month — if the latest data is June, it went out in July, so the
// label reads "July 2025".
//
// This previously ignored per-country availability and showed the same
// calendar-driven month (e.g. "August 2026") for every country, which was wrong
// for any market whose data lags.
export function LastPublishedHint() {
  const { maxMonth } = useAppContext();

  if (!maxMonth || !YYYYMM.test(maxMonth)) return null;

  const label = formatYYYYMM(addMonths(maxMonth, 1));

  return (
    <p className="text-xs text-muted-foreground mt-0.5">
      Last published: {label}
    </p>
  );
}
