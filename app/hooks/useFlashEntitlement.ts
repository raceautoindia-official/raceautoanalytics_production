"use client";

import { useState, useEffect } from "react";

export interface FlashEntitlement {
  effectivePlan: string | null;
  accessType: string;            // "direct" | "shared" | "none"
  isSubscribed: boolean;
  effectiveStatus: string;
  parentEmail: string | null;
  flashReportCountryLimit: number;
  hasDirectPlan: boolean;
  hasSharedPlan: boolean;
}

export interface AssignedCountry {
  id: number;
  country_id: string;
  slot_index: number;
  effective_plan_at_selection: string | null;
  access_type: string | null;
  source_owner_email: string | null;
  created_at: string;
}

export interface UseFlashEntitlementResult {
  entitlement: FlashEntitlement | null;
  assignedCountries: AssignedCountry[];
  loading: boolean;
  error: string | null;
  /** Call this after saving new country slots to refresh the assigned list. */
  refreshCountries: () => void;
  isLoggedIn: boolean;
}

function hasAuthToken(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith("authToken="));
}

export function useFlashEntitlement(): UseFlashEntitlementResult {
  const [entitlement, setEntitlement] = useState<FlashEntitlement | null>(null);
  const [assignedCountries, setAssignedCountries] = useState<AssignedCountry[]>([]);
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

        const [entitlementRes, countriesRes] = await Promise.all([
          fetch("/api/subscription/flash-entitlement", {
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/flash-reports/user-countries", {
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
          setError(err?.error || "Failed to fetch entitlement");
        }

        if (countriesRes.ok) {
          const data = await countriesRes.json();
          setAssignedCountries(Array.isArray(data?.countries) ? data.countries : []);
        }
        // 401 on countries just means not logged in — already handled above
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

  function refreshCountries() {
    setRefreshTick((t) => t + 1);
  }

  return { entitlement, assignedCountries, loading, error, refreshCountries, isLoggedIn };
}
