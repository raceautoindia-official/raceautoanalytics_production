"use client";

/**
 * FlashSubscriptionManager
 *
 * Mounted once inside the Flash Reports layout.
 * - Fetches flash entitlement + assigned countries for the logged-in user
 * - Provides FlashEntitlementContext to all flash-report child pages
 * - Shows FlashCountrySelectModal when: subscribed + zero assigned countries
 * - Shows FlashSubscriptionGate when: logged in but no active subscription
 */

import { useMemo, useState } from "react";
import { useFlashEntitlement } from "@/app/hooks/useFlashEntitlement";
import {
  FlashEntitlementContext,
  type FlashEntitlementContextValue,
} from "@/app/flash-reports/context/FlashEntitlementContext";
import FlashCountrySelectModal from "./FlashCountrySelectModal";
import FlashSubscriptionGate from "./FlashSubscriptionGate";

interface Props {
  children: React.ReactNode;
}

export default function FlashSubscriptionManager({ children }: Props) {
  const {
    entitlement,
    assignedCountries,
    loading,
    isLoggedIn,
    refreshCountries,
  } = useFlashEntitlement();

  // Track whether the initial country-select modal was shown and completed
  const [modalDismissed, setModalDismissed] = useState(false);

  const isSubscribed =
    !!entitlement?.isSubscribed && entitlement.effectiveStatus === "active";

  const needsCountrySelection =
    isLoggedIn &&
    isSubscribed &&
    !loading &&
    assignedCountries.length === 0 &&
    !modalDismissed;

  // Build locked country set: null = no lock, string[] = subscribed user slots
  const lockedToCountries: string[] | null = useMemo(() => {
    if (!isLoggedIn) return null;       // not logged in: existing RouteAuthGate handles it
    if (loading) return null;           // still loading: don't restrict yet
    if (!entitlement) return null;      // entitlement unknown
    if (!isSubscribed) return null;     // free user: FlashSubscriptionGate handles it
    if (assignedCountries.length === 0) return null; // no slots yet: modal shows
    return assignedCountries.map((c) => c.country_id);
  }, [isLoggedIn, loading, entitlement, isSubscribed, assignedCountries]);

  const ctxValue: FlashEntitlementContextValue = {
    entitlement,
    assignedCountries,
    lockedToCountries,
    loading,
    isLoggedIn,
  };

  return (
    <FlashEntitlementContext.Provider value={ctxValue}>
      {children}

      {/* Initial country-selection modal for subscribed users with no slots yet */}
      {needsCountrySelection && entitlement && (
        <FlashCountrySelectModal
          entitlement={entitlement}
          assignedCountries={assignedCountries}
          onSaved={() => {
            refreshCountries();
            setModalDismissed(true);
          }}
        />
      )}

      {/* Teaser + paywall popup for logged-in free/inactive users */}
      {isLoggedIn && !loading && entitlement && !isSubscribed && (
        <FlashSubscriptionGate entitlement={entitlement} />
      )}
    </FlashEntitlementContext.Provider>
  );
}
