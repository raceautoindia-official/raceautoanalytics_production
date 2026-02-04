"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/components/providers/Providers";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];


const isYYYYMM = (s: string) => /^\d{4}-\d{2}$/.test(s);

// lexicographic compare works for YYYY-MM
const cmpYYYYMM = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const clampYYYYMM = (v: string, min: string, max: string) => {
  if (!isYYYYMM(v)) return min;
  if (cmpYYYYMM(v, min) < 0) return min;
  if (cmpYYYYMM(v, max) > 0) return max;
  return v;
};

const addMonths = (yyyymm: string, delta: number) => {
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

interface MonthSelectorProps {
  className?: string;
  value?: string;
  onChange?: (month: string) => void;
  label?: string;
}

export function MonthSelector({
  className,
  value,
  onChange,
  label = "Month",
}: MonthSelectorProps) {
  const {
    month: globalMonth,
    setMonth: setGlobalMonth,
    maxMonth,
    minMonth,
  } = useAppContext();

  const MIN = minMonth ?? "2024-01";
  const MAX = maxMonth ?? globalMonth; // maxMonth is always present in your Providers

  const [isOpen, setIsOpen] = useState(false);

  // --- Source month coming from props or global context
  const incomingMonth = isYYYYMM(value || "") ? (value as string) : globalMonth;

  // Clamp current month to [MIN_MONTH, MAX_MONTH]
  const currentMonth = clampYYYYMM(
    isYYYYMM(incomingMonth) ? incomingMonth : MIN,
    MIN,
    MAX,
  );

  const setCurrentMonthRaw = onChange || setGlobalMonth;
  const setCurrentMonth = (yyyymm: string) => {
    const next = clampYYYYMM(yyyymm, MIN, MAX);
    setCurrentMonthRaw(next);
  };

  // If parent tries to push month beyond MAX/MIN, pull it back (controlled safety)
  useEffect(() => {
    const desired = isYYYYMM(incomingMonth) ? incomingMonth : MIN;
    const clamped = clampYYYYMM(desired, MIN, MAX);
    if (clamped !== desired) {
      setCurrentMonthRaw(clamped);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingMonth, MAX]);

  const [year, monthNum] = currentMonth.split("-");
  const monthIndex = parseInt(monthNum, 10) - 1;
  const monthName = MONTHS[monthIndex] ?? "";

  const prevDisabled = cmpYYYYMM(addMonths(currentMonth, -1), MIN) < 0;
  const nextDisabled = cmpYYYYMM(addMonths(currentMonth, 1), MAX) > 0;

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev" && prevDisabled) return;
    if (direction === "next" && nextDisabled) return;
    const delta = direction === "prev" ? -1 : 1;
    setCurrentMonth(addMonths(currentMonth, delta));
  };

  // ✅ Year switcher range limited by MIN_MONTH..MAX_MONTH
  const minYear = parseInt(MIN.split("-")[0], 10);
  const maxYear = parseInt(MAX.split("-")[0], 10);

  const yearOptions = useMemo(() => {
    const out: number[] = [];
    for (let y = minYear; y <= maxYear; y++) out.push(y);
    return out;
  }, [minYear, maxYear]);

  const setYear = (newYear: number) => {
    // keep same month, but clamp to allowed range
    setCurrentMonth(`${newYear}-${pad2(monthIndex + 1)}`);
  };

  return (
    <div className={cn("inline-flex flex-col items-start", className)}>
      <div className="relative inline-flex">
        {/* Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex min-w-[9rem] items-center space-x-2 rounded-lg border border-border bg-card px-2 py-1.5 text-left text-xs font-medium hover:bg-accent transition-colors duration-200 focus-ring sm:min-w-40 sm:px-3 sm:py-2 sm:text-sm"
          aria-label={`Select ${label.toLowerCase()}`}
          aria-expanded={isOpen}
        >
          <Calendar className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">
            {monthName} {year}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 z-50 mt-2 w-56 rounded-lg border border-border bg-popover shadow-lg animate-fade-in sm:w-64">
            {/* Month/Year Navigation */}
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <button
                onClick={() => navigateMonth("prev")}
                disabled={prevDisabled}
                className={cn(
                  "rounded p-1 focus-ring",
                  prevDisabled
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-accent",
                )}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{monthName}</span>
                <select
                  value={parseInt(year, 10)}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  className="h-8 rounded-md border border-border bg-background px-2 text-sm focus-ring"
                  aria-label="Select year"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => navigateMonth("next")}
                disabled={nextDisabled}
                className={cn(
                  "rounded p-1 focus-ring",
                  nextDisabled
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-accent",
                )}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Month Selection */}
            <div className="grid grid-cols-3 gap-1 p-2">
              {MONTHS.map((m, index) => {
                const candidate = `${year}-${pad2(index + 1)}`;
                const disabled =
                  cmpYYYYMM(candidate, MIN) < 0 ||
                  cmpYYYYMM(candidate, MAX) > 0;

                const selected = index === monthIndex;

                return (
                  <button
                    key={m}
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;
                      setCurrentMonth(candidate);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "px-2 py-1 text-[11px] rounded transition-colors duration-200 focus-ring sm:text-xs",
                      disabled
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-accent",
                      selected &&
                        !disabled &&
                        "bg-primary text-primary-foreground",
                    )}
                  >
                    {m.slice(0, 3)}
                  </button>
                );
              })}
            </div>

            <p className="mt-1 text-[12px] leading-snug text-muted-foreground text-center">
              * Data updated monthly by 5th (IST).
            </p>
          </div>
        )}

        {/* Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
