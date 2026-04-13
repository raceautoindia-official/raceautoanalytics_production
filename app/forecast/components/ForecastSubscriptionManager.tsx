"use client";

/**
 * ForecastSubscriptionManager
 *
 * Mounted via app/forecast/layout.tsx — wraps all Forecast pages.
 *
 * Behaviour by user type:
 *   Free (not subscribed / no plan):
 *     → Pass through unchanged. page.js handles the legacy country-select modal.
 *
 *   Direct paid user, no regions assigned yet:
 *     → Show ForecastRegionSelectModal to let them pick their permanent slots.
 *
 *   Direct paid user, regions already assigned:
 *     → Provide lockedToRegions via context; children render normally.
 *
 *   Shared paid user, parent has assigned regions:
 *     → Provide lockedToRegions (inherited from parent) via context.
 *
 *   Shared paid user, parent has NO assigned regions yet:
 *     → Show ForecastSharedNoRegionsModal (informational — cannot self-assign).
 */

import React, { useMemo } from "react";
import ForecastEntitlementContext from "../context/ForecastEntitlementContext";
import { useForecastEntitlement } from "@/app/hooks/useForecastEntitlement";
import ForecastRegionSelectModal from "./ForecastRegionSelectModal";
import ForecastSharedNoRegionsModal from "./ForecastSharedNoRegionsModal";

export default function ForecastSubscriptionManager({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    entitlement,
    assignedRegions,
    loading,
    isLoggedIn,
    refreshRegions,
  } = useForecastEntitlement();

  // Derive context values
  const isSubscribed =
    !!entitlement?.isSubscribed && entitlement.effectiveStatus === "active";
  const isDirectUser = entitlement?.accessType === "direct";
  const isSharedUser = entitlement?.accessType === "shared";

  // lockedToRegions: null for free users (no restriction), string[] for paid users
  const lockedToRegions: string[] | null = useMemo(() => {
    if (!isSubscribed) return null; // free users: unrestricted
    return assignedRegions.map((r) => r.region_name);
  }, [isSubscribed, assignedRegions]);

  // Default region = first assigned slot
  const defaultRegion: string | null =
    assignedRegions.length > 0
      ? assignedRegions.find((r) => r.slot_index === 0)?.region_name ??
        assignedRegions[0].region_name
      : null;

  // Show region-select modal for direct paid users with no regions yet
  const needsRegionSelect =
    isLoggedIn &&
    !loading &&
    isSubscribed &&
    isDirectUser &&
    assignedRegions.length === 0;

  // Show informational modal for shared paid users whose parent has no regions
  const sharedNeedsParentAssignment =
    isLoggedIn &&
    !loading &&
    isSubscribed &&
    isSharedUser &&
    assignedRegions.length === 0;

  const contextValue = {
    entitlement,
    assignedRegions,
    lockedToRegions,
    defaultRegion,
    loading,
    isLoggedIn,
    refreshRegions,
  };

  return (
    <ForecastEntitlementContext.Provider value={contextValue}>
      {children}

      {/* Direct paid users with no regions yet */}
      {needsRegionSelect && entitlement && (
        <ForecastRegionSelectModal
          entitlement={entitlement}
          assignedRegions={assignedRegions}
          onSaved={() => refreshRegions()}
        />
      )}

      {/* Shared paid users whose parent hasn't assigned regions yet */}
      {sharedNeedsParentAssignment && entitlement && (
        <ForecastSharedNoRegionsModal
          parentEmail={entitlement.parentEmail}
        />
      )}
    </ForecastEntitlementContext.Provider>
  );
}
