"use client";

import { createContext, useContext } from "react";
import type { FlashEntitlement, AssignedCountry } from "@/app/hooks/useFlashEntitlement";

export interface FlashEntitlementContextValue {
  entitlement: FlashEntitlement | null;
  assignedCountries: AssignedCountry[];
  /** null = no restriction (loading / not in flash-reports) */
  lockedToCountries: string[] | null;
  /**
   * The effective default country for this user in Flash Reports.
   * - "india" for free / not-logged-in users
   * - First assigned slot (slot_index=0) for direct/shared subscribed users
   */
  defaultCountry: string;
  loading: boolean;
  isLoggedIn: boolean;
  /** Admin override — bypasses country locking for support/testing. Session-scoped. */
  isAdmin: boolean;
}

export const FlashEntitlementContext =
  createContext<FlashEntitlementContextValue | null>(null);

export function useFlashEntitlementContext() {
  return useContext(FlashEntitlementContext);
}
