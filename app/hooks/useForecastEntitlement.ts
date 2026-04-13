"use client";

import { useState, useEffect } from "react";

export interface ForecastEntitlement {
  effectivePlan: string | null;
  accessType: string;            // "direct" | "shared" | "none"
  isSubscribed: boolean;
  effectiveStatus: string;
  parentEmail: string | null;
  forecastRegionLimit: number;
  hasDirectPlan: boolean;
  hasSharedPlan: boolean;
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
        setLoading(true);
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
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  function refreshRegions() {
    setRefreshTick((t) => t + 1);
  }

  return { entitlement, assignedRegions, loading, error, refreshRegions, isLoggedIn };
}
