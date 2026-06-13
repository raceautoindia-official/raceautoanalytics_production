// Short-TTL in-memory cache for the heavy, app-wide Flash Report datasets
// (content hierarchy + volume data).
//
// These two datasets are global (not per-user, not per-country — callers filter
// by country downstream) and only change on the monthly publish. But a single
// Flash Reports dashboard load triggers several concurrent server calls that
// each re-fetch and re-parse the FULL datasets (current-window chart, last-year
// chart, alternate-penetration, …). That redundant work is the main cause of
// the line chart's multi-second first paint.
//
// This cache collapses those redundant loads into one, without changing the
// data that is returned:
//   - A short TTL (DATASET_TTL_MS) bounds staleness to seconds — invisible for
//     data that updates monthly.
//   - In-flight de-duplication means that even when several calls arrive
//     simultaneously on a cold cache, they all await a single fetch instead of
//     each hitting the backend/DB.
//
// Runs in the long-lived `next start` Node server, so module state persists
// across requests. On a transient loader failure nothing is cached and the
// error propagates to callers exactly as before (next call retries).

export type FlashDatasets = { hierarchyData: any[]; volumeData: any[] };

const DATASET_TTL_MS = 45_000;

let cached: { value: FlashDatasets; expiresAt: number } | null = null;
let inflight: Promise<FlashDatasets> | null = null;

/**
 * Returns the cached datasets if still fresh; otherwise runs `loader` once
 * (sharing the in-flight promise with any concurrent callers) and caches the
 * result for DATASET_TTL_MS. The loader must resolve the backend-or-local
 * datasets — its source/semantics are unchanged by this wrapper.
 */
export function getCachedFlashDatasets(
  loader: () => Promise<FlashDatasets>,
): Promise<FlashDatasets> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return Promise.resolve(cached.value);
  }
  if (inflight) {
    return inflight;
  }

  inflight = (async () => {
    try {
      const value = await loader();
      cached = { value, expiresAt: Date.now() + DATASET_TTL_MS };
      return value;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
