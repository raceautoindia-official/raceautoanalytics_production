"use client";

import { useEffect, useMemo, useState } from "react";
import { useAverageYearlyScores } from "@/app/hooks/useAverageYearlyScores";
import { useForecastGrowth } from "@/app/hooks/useForecastGrowth";

type OverallPoint = {
  month: string; // YYYY-MM
  data?: Record<string, number>;
  [k: string]: any;
};

type QuestionRow = {
  id: number;
  text: string;
  weight: number;
  type: "positive" | "negative" | string;
  graph_id: number;
};

type GraphRow = {
  id: number;
  name?: string | null;
  context?: string | null;
  score_settings_key?: string | null;
  forecast_types?: any; // stored as JSON in DB
  ai_forecast?: any;
  race_forecast?: any;
};

export type FlashForecastStackArgs = {
  enabled: boolean;
  graphId: number | null | undefined;
  baseMonth: string | null | undefined; // YYYY-MM
  horizon: number | null | undefined;
  overallData: OverallPoint[];
  category: string; // e.g. "2W","PV","Total"
  userEmail?: string | null; // BYOF
};

function safeJson(v: any) {
  if (v == null) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

function normalizeForecastTypes(v: any): Set<string> {
  const raw = safeJson(v);
  const arr = Array.isArray(raw) ? raw : [];
  return new Set(
    arr
      .map((x) =>
        String(x || "")
          .toLowerCase()
          .trim(),
      )
      .filter(Boolean),
  );
}

function isYYYYMM(s?: string | null) {
  return !!s && /^\d{4}-\d{2}$/.test(s);
}

function linearRegression(x: number[], y: number[]) {
  const n = x.length;
  if (!n) return (_i: number) => 0;
  const sx = x.reduce((a, b) => a + b, 0);
  const sy = y.reduce((a, b) => a + b, 0);
  const sxy = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sx2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const den = n * sx2 - sx * sx || 1;
  const m = (n * sxy - sx * sy) / den;
  const b = sy / n - (m * sx) / n;
  return (i: number) => b + m * i;
}

function linearForecastVolumes(histValues: number[], futureMonths: string[]) {
  const xs = histValues.map((_, i) => i);
  const fn = linearRegression(xs, histValues);
  const out: Record<string, number> = {};
  futureMonths.forEach((m, idx) => {
    const v = fn(histValues.length + idx);
    if (Number.isFinite(v)) out[m] = Number(v);
  });
  return out;
}

/**
 * Convert raw /api/saveScores submissions into the structure expected by
 * useAverageYearlyScores (same as Forecast page):
 *   - posAttributes / negAttributes
 *   - posScores / negScores arrays indexed by yearIndex (here: month offset)
 *   - weights map keyed by questionId
 */
function enrichSubmissions(
  submissions: any[],
  questions: QuestionRow[],
  yearNames: string[],
) {
  if (!Array.isArray(submissions) || !submissions.length) return [];
  if (!Array.isArray(questions) || !questions.length) return [];
  if (!Array.isArray(yearNames) || !yearNames.length) return [];

  // Build attributes + weights from questions
  const posAttrs: any[] = [];
  const negAttrs: any[] = [];
  const weights: Record<string, number> = {};

  for (const q of questions) {
    const key = String(q.id);
    weights[key] = Number(q.weight) || 0;
    (String(q.type) === "positive" ? posAttrs : negAttrs).push({
      key,
      label: q.text,
    });
  }

  // Helper: init score maps with arrays
  const initScoreMaps = () => {
    const posScores: Record<string, number[]> = {};
    const negScores: Record<string, number[]> = {};
    posAttrs.forEach(
      (a) => (posScores[a.key] = Array(yearNames.length).fill(0)),
    );
    negAttrs.forEach(
      (a) => (negScores[a.key] = Array(yearNames.length).fill(0)),
    );
    return { posScores, negScores };
  };

  return submissions.map((sub) => {
    const { posScores, negScores } = initScoreMaps();
    const rows = Array.isArray(sub?.scores) ? sub.scores : [];

    // Fill arrays by yearIndex
    for (const r of rows) {
      if (!r) continue;
      const skipped = !!r.skipped;
      const yearIndex = Number(r.yearIndex);
      if (
        !Number.isFinite(yearIndex) ||
        yearIndex < 0 ||
        yearIndex >= yearNames.length
      )
        continue;
      if (skipped) continue;

      const k = String(r.questionId);
      const scoreNum = Number(r.score);
      if (!Number.isFinite(scoreNum)) continue;

      if (posScores[k] !== undefined) posScores[k][yearIndex] = scoreNum;
      if (negScores[k] !== undefined) negScores[k][yearIndex] = scoreNum;
    }

    return {
      ...sub,
      posAttributes: posAttrs,
      negAttributes: negAttrs,
      posScores,
      negScores,
      weights,
      yearNames,
    };
  });
}

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} (${url}) ${txt}`);
  }
  return res.json();
}

export function useFlashForecastStack(args: FlashForecastStackArgs) {
  const {
    enabled,
    graphId,
    baseMonth,
    horizon,
    overallData,
    category,
    userEmail,
  } = args;

  const [graph, setGraph] = useState<GraphRow | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [yearNames, setYearNames] = useState<string[]>([]);
  const [allSubs, setAllSubs] = useState<any[]>([]);
  const [userSubs, setUserSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

const enabledTypes = useMemo(() => {
  const set = normalizeForecastTypes(graph?.forecast_types);

  // ✅ Hard-disable Stats Forecast (Linear Regression) for Flash Reports everywhere
  set.delete("linear");

  return set;
}, [graph?.forecast_types]);

  // Historical values and future months extracted from overallData
  const { histValues, futureMonths } = useMemo(() => {
    const base = isYYYYMM(baseMonth) ? String(baseMonth) : null;
    const points = Array.isArray(overallData) ? overallData : [];

    const hist: number[] = [];
    const fut: string[] = [];

    points.forEach((p) => {
      const m = String(p?.month || "");
      if (!isYYYYMM(m)) return;

      const valRaw =
        p?.data?.[category] != null ? p.data[category] : (p as any)?.[category];

      const val =
        valRaw == null || Number.isNaN(Number(valRaw)) ? null : Number(valRaw);

      if (!base) {
        if (val != null) hist.push(val);
        return;
      }

      if (m <= base) {
        if (val != null) hist.push(val);
      } else {
        fut.push(m);
      }
    });

    // clamp future months to horizon if given
    const h = Number.isFinite(horizon as any) ? Number(horizon) : 6;
    return { histValues: hist, futureMonths: fut.slice(0, Math.max(0, h)) };
  }, [overallData, baseMonth, horizon, category]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!enabled || !graphId || !isYYYYMM(baseMonth)) {
        setGraph(null);
        setQuestions([]);
        setYearNames([]);
        setAllSubs([]);
        setUserSubs([]);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const gdata = await fetchJson(`/api/graphs?id=${graphId}`);
        const g: GraphRow | null = (gdata?.graph ?? null) as any;

        const qdata = await fetchJson(`/api/questions?graphId=${graphId}`);
        const q: QuestionRow[] = Array.isArray(qdata)
          ? qdata
          : Array.isArray(qdata?.questions)
            ? qdata.questions
            : [];

        const key = g?.score_settings_key || "scoreSettings";
        const ssdata = await fetchJson(
          `/api/scoreSettings?key=${encodeURIComponent(
            key,
          )}&baseMonth=${encodeURIComponent(String(baseMonth))}&horizon=${
            Number.isFinite(horizon as any) ? Number(horizon) : 6
          }`,
        );
        const yn: string[] = Array.isArray(ssdata?.yearNames)
          ? ssdata.yearNames
          : [];

        const subsAllData = await fetchJson(
          `/api/saveScores?graphId=${graphId}&basePeriod=${encodeURIComponent(
            String(baseMonth),
          )}`,
        );
        const all: any[] = Array.isArray(subsAllData)
          ? subsAllData
          : Array.isArray(subsAllData?.submissions)
            ? subsAllData.submissions
            : [];

        const subsUserData =
          userEmail && String(userEmail).trim()
            ? await fetchJson(
                `/api/saveScores?graphId=${graphId}&basePeriod=${encodeURIComponent(
                  String(baseMonth),
                )}&email=${encodeURIComponent(String(userEmail).trim())}`,
              )
            : null;

        const us: any[] =
          subsUserData == null
            ? []
            : Array.isArray(subsUserData)
              ? subsUserData
              : Array.isArray(subsUserData?.submissions)
                ? subsUserData.submissions
                : [];

        if (cancelled) return;

        setGraph(g);
        setQuestions(q);
        setYearNames(yn);
        setAllSubs(all);
        setUserSubs(us);
      } catch (e: any) {
        console.error("useFlashForecastStack error:", e);
        if (!cancelled) setError(e?.message || "Failed to load forecast stack");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [enabled, graphId, baseMonth, horizon, userEmail]);

  const enrichedAll = useMemo(
    () => enrichSubmissions(allSubs, questions, yearNames),
    [allSubs, questions, yearNames],
  );
  const enrichedUser = useMemo(
    () => enrichSubmissions(userSubs, questions, yearNames),
    [userSubs, questions, yearNames],
  );

  const { averages: surveyAverages } = useAverageYearlyScores(
    enrichedAll as any,
  );
  const { averages: byofAverages } = useAverageYearlyScores(
    enrichedUser as any,
  );

  const surveyAvgScores = useMemo(
    () =>
      Array.isArray(surveyAverages)
        ? surveyAverages.map((x: any) => x.avg)
        : [],
    [surveyAverages],
  );
  const byofAvgScores = useMemo(
    () =>
      Array.isArray(byofAverages) ? byofAverages.map((x: any) => x.avg) : [],
    [byofAverages],
  );

  const scoreForecastData = useForecastGrowth(
    histValues,
    surveyAvgScores as any,
  );
  const byofForecastData = useForecastGrowth(histValues, byofAvgScores as any);

  const forecastByMonth = useMemo(() => {
    const ai = safeJson(graph?.ai_forecast) || {};
    const race = safeJson(graph?.race_forecast) || {};

    const linear = enabledTypes.has("linear")
      ? linearForecastVolumes(histValues, futureMonths)
      : {};

    const score: Record<string, number> = {};
    const byof: Record<string, number> = {};

    if (
      enabledTypes.has("score") &&
      yearNames.length &&
      scoreForecastData?.length
    ) {
      yearNames.forEach((m, i) => {
        const fv = scoreForecastData?.[i]?.forecastVolume;
        if (Number.isFinite(fv)) score[m] = Number(fv);
      });
    }

    if (
      enabledTypes.has("byof") &&
      yearNames.length &&
      byofForecastData?.length
    ) {
      yearNames.forEach((m, i) => {
        const fv = byofForecastData?.[i]?.forecastVolume;
        if (Number.isFinite(fv)) byof[m] = Number(fv);
      });
    }

    return { linear, score, byof, ai, race, enabledTypes };
  }, [
    graph?.ai_forecast,
    graph?.race_forecast,
    enabledTypes,
    histValues,
    futureMonths,
    yearNames,
    scoreForecastData,
    byofForecastData,
  ]);

  return { forecastByMonth, loading, error };
}
