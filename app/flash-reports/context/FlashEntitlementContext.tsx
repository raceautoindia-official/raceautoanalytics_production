"use client";

import { createContext, useContext } from "react";
import type { FlashEntitlement, AssignedCountry } from "@/app/hooks/useFlashEntitlement";

export interface FlashEntitlementContextValue {
  entitlement: FlashEntitlement | null;
  assignedCountries: AssignedCountry[];
  /** null = no restriction (loading / not in flash-reports) */
  lockedToCountries: string[] | null;
  loading: boolean;
  isLoggedIn: boolean;
}

export const FlashEntitlementContext =
  createContext<FlashEntitlementContextValue | null>(null);

export function useFlashEntitlementContext() {
  return useContext(FlashEntitlementContext);
}
