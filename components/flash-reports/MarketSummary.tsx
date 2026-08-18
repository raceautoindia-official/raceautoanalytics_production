"use client";

import type { ReactNode } from "react";

/**
 * The "Market Summary" strip above the charts.
 *
 * Previously each segment hardcoded three cells and always rendered them, so a
 * metric with nothing behind it still occupied a column showing a bare "—"
 * (Alternate Fuel Adoption was the usual offender). Cells are now declared and
 * any cell without a real value is dropped; if nothing survives, the whole
 * block disappears rather than leaving an empty bordered card.
 *
 * The grid tracks the number of VISIBLE cells so the row stays evenly spaced
 * whether two or four survive.
 */

export type SummaryTone = "default" | "growth" | "primary";

export type SummaryCell = {
  label: string;
  /** Rendered value. Treated as absent when null/undefined/""/"—"/"N/A". */
  value: ReactNode;
  tone?: SummaryTone;
  /** For tone="growth": drives success/destructive colouring. */
  growth?: number | null;
  title?: string;
};

/** A metric counts as present only if it carries an actual figure. */
export function hasSummaryValue(value: unknown): boolean {
  if (value == null) return false;
  const s = String(value).trim();
  if (!s) return false;
  // Placeholders the formatters emit when there is no data.
  return !["—", "-", "–", "n/a", "na", "null", "undefined"].includes(
    s.toLowerCase(),
  );
}

const COLS: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

export default function MarketSummary({
  monthLabel,
  cells,
}: {
  monthLabel: ReactNode;
  cells: Array<SummaryCell | null | false | undefined>;
}) {
  const visible = (cells.filter(Boolean) as SummaryCell[]).filter((c) =>
    hasSummaryValue(
      // ReactNode values that are not plain strings are assumed meaningful.
      typeof c.value === "string" || typeof c.value === "number"
        ? c.value
        : c.value == null
          ? null
          : "present",
    ),
  );

  if (!visible.length) return null;

  return (
    <div className="flash-summary-block mb-8 p-6 bg-card/30 rounded-lg border border-border/50">
      <h2 className="text-lg font-semibold mb-3">
        Market Summary - {monthLabel}
      </h2>
      <div
        className={`grid ${COLS[Math.min(visible.length, 4)]} gap-4 text-sm`}
      >
        {visible.map((c) => {
          const toneClass =
            c.tone === "growth"
              ? c.growth != null && c.growth >= 0
                ? "text-success"
                : "text-destructive"
              : c.tone === "primary"
                ? "text-primary"
                : "";
          return (
            <div key={c.label}>
              <span className="text-muted-foreground">{c.label}:</span>
              <span
                className={`ml-2 font-medium ${toneClass}`}
                title={c.title}
              >
                {c.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
