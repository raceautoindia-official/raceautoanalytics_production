import { useMemo } from "react";

/**
 * Exported as BOTH named + default to match existing imports.
 */
export function useAverageYearlyScores(submissions) {
  return useMemo(() => {
    if (!Array.isArray(submissions) || submissions.length === 0) {
      return { yearNames: [], averages: [] };
    }

    const yearNames = Array.isArray(submissions[0]?.yearNames)
      ? submissions[0].yearNames
      : [];

    if (yearNames.length === 0) return { yearNames: [], averages: [] };

    const averages = yearNames.map((year, i) => {
      const total = submissions.reduce((sum, sub) => {
        let pos = 0;
        let neg = 0;

        (sub.posAttributes || []).forEach((a) => {
          const key = a?.key;
          if (!key) return;
          const score = sub.posScores?.[key]?.[i] ?? 0;
          const w = sub.weights?.[key] ?? 0;
          pos += score * w;
        });

        (sub.negAttributes || []).forEach((a) => {
          const key = a?.key;
          if (!key) return;
          const score = sub.negScores?.[key]?.[i] ?? 0;
          const w = sub.weights?.[key] ?? 0;
          neg += score * w;
        });

        return sum + (pos - neg);
      }, 0);

      const raw = total / submissions.length;
      const rounded = Number.isFinite(raw) ? parseFloat(raw.toFixed(2)) : 0;
      return { year, avg: rounded };
    });

    return { yearNames, averages };
  }, [submissions]);
}

export default useAverageYearlyScores;
