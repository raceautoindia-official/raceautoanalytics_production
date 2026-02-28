"use client";

export function DataAvailabilityHint({ points }: { points: Array<{ month: string; data: any }> }) {
  const total = points?.length || 0;
  const filled = (points || []).filter((p) => p?.data && Object.keys(p.data).length > 0).length;

  if (!total) return null;
  if (filled === total) return null;
  if (filled === 0) return (
    <div className="mt-2 text-xs text-muted-foreground">
      No data available for this country in the selected window.
    </div>
  );

  return (
    <div className="mt-2 text-xs text-muted-foreground">
      Limited data available for this country ({filled}/{total} months).
    </div>
  );
}