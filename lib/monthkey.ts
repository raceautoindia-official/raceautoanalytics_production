// lib/monthKey.ts
export type MonthKey = `${number}-${"01"|"02"|"03"|"04"|"05"|"06"|"07"|"08"|"09"|"10"|"11"|"12"}`;

/**
 * Previous calendar month based on IST (+05:30), regardless of server timezone.
 * Requirement: "always previous calendar month even if data missing".
 */
export function previousCalendarMonthRefIST(date = new Date()): MonthKey {
  const IST_OFFSET_MIN = 330; // +05:30
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60_000;
  const ist = new Date(utcMs + IST_OFFSET_MIN * 60_000);

  const y = ist.getFullYear();
  const m = ist.getMonth() + 1; // 1..12

  const prevM = m === 1 ? 12 : m - 1;
  const prevY = m === 1 ? y - 1 : y;

  return `${prevY}-${String(prevM).padStart(2, "0")}` as MonthKey;
}

export function parseMonthKey(key: string): { y: number; m: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  return { y, m };
}

export function addMonths(base: MonthKey, delta: number): MonthKey {
  const parsed = parseMonthKey(base);
  if (!parsed) throw new Error(`Invalid MonthKey: ${base}`);

  let y = parsed.y;
  let m = parsed.m + delta;

  while (m > 12) { m -= 12; y += 1; }
  while (m < 1)  { m += 12; y -= 1; }

  return `${y}-${String(m).padStart(2, "0")}` as MonthKey;
}

export function monthRangeInclusive(start: MonthKey, end: MonthKey): MonthKey[] {
  const out: MonthKey[] = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = addMonths(cur, 1);
    // safety
    if (out.length > 400) break;
  }
  return out;
}
