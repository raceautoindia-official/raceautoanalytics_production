"use client";

import { useAppContext } from "@/components/providers/Providers";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatYYYYMM(yyyymm: string): string {
  const parts = yyyymm.split("-");
  if (parts.length !== 2) return yyyymm;
  const monthIdx = parseInt(parts[1], 10) - 1;
  return `${MONTH_NAMES[monthIdx] ?? parts[1]} ${parts[0]}`;
}

export function LastPublishedHint() {
  const { maxMonth } = useAppContext();
  return (
    <p className="text-xs text-muted-foreground mt-0.5">
      Last published: {formatYYYYMM(maxMonth)}
    </p>
  );
}
