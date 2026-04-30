"use client";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Compute the "publish month" label using IST + a 5th-of-month cutoff:
//   * On or after the 5th of the current month → show the CURRENT month
//   * Before the 5th of the current month       → show the PREVIOUS month
//
// Example: today is April 29 (IST) → "April 2026". On May 4 → still
// "April 2026". On May 5 → flips to "May 2026".
//
// This intentionally ignores `maxMonth` from AppContext (which is per-country
// data availability) — the user wants a calendar-driven label that's the same
// across all countries and rolls forward automatically every 5th.
function getPublishMonthLabel(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((p) => p.type === "year")?.value ?? "1970");
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "1");
  const day = Number(parts.find((p) => p.type === "day")?.value ?? "1");

  const cutoffDay = 5;
  let labelMonth: number;
  let labelYear: number;
  if (day >= cutoffDay) {
    labelMonth = month;
    labelYear = year;
  } else {
    // Roll back one month, handling January → December of previous year
    if (month === 1) {
      labelMonth = 12;
      labelYear = year - 1;
    } else {
      labelMonth = month - 1;
      labelYear = year;
    }
  }

  const monthName = MONTH_NAMES[labelMonth - 1] ?? String(labelMonth);
  return `${monthName} ${labelYear}`;
}

export function LastPublishedHint() {
  // Computed at render time so the label naturally reflects today's date
  // every time the page is loaded (no need for a timer — the change only
  // matters at the 5th-of-month boundary, which any reasonable user will
  // pick up via a normal page reload).
  const label = getPublishMonthLabel();
  return (
    <p className="text-xs text-muted-foreground mt-0.5">
      Last published: {label}
    </p>
  );
}
