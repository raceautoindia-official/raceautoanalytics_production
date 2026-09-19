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
 * Built from the four inks in the Race logo — blue #428FD1, gold #FDC60B,
 * coral #F25858, green #58C6A5 — sampled from public/images/logo.webp.
 *
 * The four brand colours come first, then a darker and a lighter variant of
 * each. The order rotates through the hue families rather than walking one
 * family at a time, because stack segments are drawn touching and two shades
 * of the same ink side by side read as a single block.
 */
export const FORECAST_PALETTE = [
  "#428FD1", // brand blue
  "#FDC60B", // brand gold
  "#F25858", // brand coral
  "#58C6A5", // brand green
  "#2E6FA8", // blue, dark
  "#C79A00", // gold, dark
  "#C2403F", // coral, dark
  "#3E9C80", // green, dark
  "#7FB4E3", // blue, light
  "#FEDE6B", // gold, light
  "#F79191", // coral, light
  "#8FDCC4", // green, light
];

/** Everything outside the top N is grouped into this slice. */
export const OTHERS_LABEL = "Others";
export const OTHERS_COLOR = "#8A94A6";

/** How many OEMs get their own slice before the rest are grouped. */
export const TOP_OEM_COUNT = 10;
