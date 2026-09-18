"use client";

import { useEffect, useState } from "react";
import { withCountry } from "@/lib/withCountry";

export type ForecastMonthPoint = {
  month: string;
  label: string;
  values: Record<string, number>;
};

export type ForecastShare = {
  months: ForecastMonthPoint[];
  oems: string[];
};

const EMPTY: ForecastShare = { months: [], oems: [] };

/**
 * In-flight/result cache keyed by request URL.
 *
 * Both the share chart and the rationale table below it need this data, and
 * the endpoint walks the full ~40k-node content hierarchy plus every
 * volume_data row on each call. Without the cache, mounting both doubles that
 * work on every page load.
 */
const cache = new Map<string, Promise<ForecastShare>>();

function fetchShare(url: string): Promise<ForecastShare> {
  const hit = cache.get(url);
  if (hit) return hit;

  const p = fetch(url, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load forecast share: ${res.status}`);
      return res.json();
    })
    .then((json) => ({
      months: Array.isArray(json?.months) ? json.months : [],
      oems: Array.isArray(json?.oems) ? json.oems : [],
    }))
    .catch((err) => {
      // Don't cache a failure — a later mount should be able to retry.
      cache.delete(url);
      console.error(err);
      return EMPTY;
    });

  cache.set(url, p);
  return p;
}

/** Forecast OEM share for a segment/country/base month, fetched at most once. */
export function useSegmentForecastShare(
  segmentName: string,
  region: string,
  month: string,
): ForecastShare {
  const [data, setData] = useState<ForecastShare>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    const url = withCountry(
      `/api/flash-reports/segment-forecast-share?segmentName=${encodeURIComponent(
        segmentName,
      )}&baseMonth=${encodeURIComponent(month)}&horizon=6`,
      region,
    );

    fetchShare(url).then((d) => {
      if (!cancelled) setData(d);
    });

    return () => {
      cancelled = true;
    };
  }, [segmentName, region, month]);

  return data;
}

// Corporate boilerplate that makes labels unreadable once there are ten of them
// ("MARUTI SUZUKI INDIA LTD", "JSW MG MOTOR INDIA PVT LTD").
const NOISE = new Set([
  "LTD", "LIMITED", "PVT", "PRIVATE", "INDIA", "MOTOR", "MOTORS", "GROUP",
  "CARS", "CO", "COMPANY", "CORP", "CORPORATION", "INC", "AUTOMOBILES",
  "AUTOMOBILE", "AUTO", "VEHICLES", "VEHICLE",
]);

/** "MARUTI SUZUKI INDIA LTD" -> "Maruti Suzuki"; "BMW INDIA PVT LTD" -> "BMW". */
export function shortOemName(raw: string): string {
  const tokens = String(raw || "")
    .replace(/\s*-\s*/g, "-")
    .replace(/[.,]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return String(raw || "");

  const kept = [...tokens];
  while (kept.length > 1 && NOISE.has(kept[kept.length - 1].toUpperCase())) {
    kept.pop();
  }

  return kept
    .map((t) =>
      // Keep short tokens as acronyms (BMW, JSW, MG); title-case real words.
      t.length <= 3
        ? t.toUpperCase()
        : t
            .split("-")
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
            .join("-"),
    )
    .join(" ");
}

/**
 * Muted plotting colours. Hues still jump between consecutive entries, because
 * stack segments are drawn touching, but each is desaturated so a full column
 * of ten reads as one chart rather than a set of warning lights.
 */
export const FORECAST_PALETTE = [
  "#5B8DEF", // soft blue
  "#D9A05B", // soft amber
  "#C97B7B", // soft rose
  "#5FA88E", // soft green
  "#9689C2", // soft violet
  "#6FA8BD", // soft cyan
  "#C98BAC", // soft pink
  "#9FAE72", // soft olive
  "#D68F6A", // soft orange
  "#7B86B8", // soft indigo
  "#69A09B", // soft teal
  "#AC8CBE", // soft purple
];
