"use client";

import React, { createContext, useContext } from "react";
import type { ForecastEntitlement, AssignedRegion } from "@/app/hooks/useForecastEntitlement";

export interface ForecastEntitlementContextValue {
  entitlement: ForecastEntitlement | null;
  assignedRegions: AssignedRegion[];
  /**
   * null  = no restriction (free / not logged in)
   * string[] = only these region names are accessible (paid users)
   */
  lockedToRegions: string[] | null;
  /** First assigned region name, or null for free users */
  defaultRegion: string | null;
  loading: boolean;
  isLoggedIn: boolean;
  refreshRegions: () => void;
}

const ForecastEntitlementContext =
  createContext<ForecastEntitlementContextValue>({
    entitlement: null,
    assignedRegions: [],
    lockedToRegions: null,
    defaultRegion: null,
    loading: true,
    isLoggedIn: false,
    refreshRegions: () => {},
  });

export function useForecastEntitlementContext(): ForecastEntitlementContextValue {
  return useContext(ForecastEntitlementContext);
}

export default ForecastEntitlementContext;
