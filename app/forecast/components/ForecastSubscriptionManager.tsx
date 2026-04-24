"use client";

/**
 * ForecastSubscriptionManager
 *
 * Mounted via app/forecast/layout.tsx — wraps all Forecast pages.
 *
 * Behaviour by user type:
 *   Free / expired / membership-pending users:
 *     → Keep overview shell visible, but show ForecastSubscriptionGate.
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
import ForecastSubscriptionGate from "./ForecastSubscriptionGate";
import TrialCountdownReminder from "@/components/auth/TrialCountdownReminder";

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

  const shouldShowSubscriptionGate =
    isLoggedIn &&
    !loading &&
    entitlement &&
    (Boolean(entitlement.membershipPendingApproval) || !isSubscribed);

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

      {shouldShowSubscriptionGate && entitlement && (
        <ForecastSubscriptionGate entitlement={entitlement} />
      )}

      <TrialCountdownReminder
        trialActive={Boolean(entitlement?.trialActive)}
        trialExpiresAt={entitlement?.trialExpiresAt ?? null}
      />
    </ForecastEntitlementContext.Provider>
  );
}
