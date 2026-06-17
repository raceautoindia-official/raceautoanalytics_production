"use client";

import { useState, useEffect, useRef } from "react";

export interface ForecastEntitlement {
  effectivePlan: string | null;
  accessType: string;            // "direct" | "shared" | "none"
  isSubscribed: boolean;
  effectiveStatus: string;
  parentEmail: string | null;
  forecastRegionLimit: number;
  hasDirectPlan: boolean;
  hasSharedPlan: boolean;
  role?: string | null;
  hasFullAccess?: boolean;
  membershipApprovalStatus?: string;
  membershipPendingApproval?: boolean;
  membershipPendingMessage?: string | null;
  /** True while the user's 5-minute free trial window is active */
  trialActive?: boolean;
  /** ISO timestamp when the free trial expires */
  trialExpiresAt?: string;
}

export interface AssignedRegion {
  id: number;
  region_name: string;
  slot_index: number;
  effective_plan_at_selection: string | null;
  access_type: string | null;
  source_owner_email: string | null;
  created_at: string;
}

export interface UseForecastEntitlementResult {
  entitlement: ForecastEntitlement | null;
  assignedRegions: AssignedRegion[];
  loading: boolean;
  error: string | null;
  /** Call this after saving new region slots to refresh the assigned list. */
  refreshRegions: () => void;
  isLoggedIn: boolean;
}

function hasAuthToken(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith("authToken="));
}

export function useForecastEntitlement(): UseForecastEntitlementResult {
  const [entitlement, setEntitlement] = useState<ForecastEntitlement | null>(null);
  const [assignedRegions, setAssignedRegions] = useState<AssignedRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // True once the initial load has completed — keeps focus/poll refetches
  // silent so they don't flip `loading` and flicker the gate/region lock.
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const loggedIn = hasAuthToken();
    setIsLoggedIn(loggedIn);

    if (!loggedIn) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        // Only the first load shows the blocking loading state; focus/poll
        // refetches update entitlement silently in the background.
        if (!hasLoadedRef.current) setLoading(true);
        setError(null);

        const [entitlementRes, regionsRes] = await Promise.all([
          fetch("/api/subscription/forecast-entitlement", {
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/forecast/user-regions", {
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        if (cancelled) return;

        if (entitlementRes.ok) {
          const data = await entitlementRes.json();
          setEntitlement(data);
        } else if (entitlementRes.status === 401) {
          setIsLoggedIn(false);
          setEntitlement(null);
        } else {
          const err = await entitlementRes.json().catch(() => ({}));
          setError(err?.error || "Failed to fetch forecast entitlement");
        }

        if (regionsRes.ok) {
          const data = await regionsRes.json();
          setAssignedRegions(Array.isArray(data?.regions) ? data.regions : []);
        }
        // 401 on regions just means not logged in — already handled above
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Network error";
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) {
          hasLoadedRef.current = true;
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  // Keep entitlement fresh site-wide without a manual reload: silently refetch
  // when the user returns to the browser tab (focus / visibility) and every 90s
  // while the tab is visible. Mirrors useFlashEntitlement so Forecast pages
  // pick up admin plan/window changes from Race Auto India just as quickly.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const bump = () => setRefreshTick((t) => t + 1);
    const onVisible = () => {
      if (document.visibilityState === "visible") bump();
    };

    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") bump();
    }, 90_000);

    return () => {
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, []);

  function refreshRegions() {
    setRefreshTick((t) => t + 1);
  }

  return { entitlement, assignedRegions, loading, error, refreshRegions, isLoggedIn };
}
