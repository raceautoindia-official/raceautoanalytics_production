"use client";

/**
 * FlashSubscriptionManager
 *
 * Mounted once inside the Flash Reports layout.
 * - Fetches flash entitlement + assigned countries for the logged-in user
 * - Provides FlashEntitlementContext to all flash-report child pages
 * - Derives and enforces `defaultCountry` (first assigned slot, or "india" for free users)
 * - Corrects the active region to defaultCountry when it is outside the user's locked set
 * - Shows FlashCountrySelectModal when: DIRECT subscribed + zero assigned countries
 * - Shows SharedNoCountriesModal when: SHARED subscribed + zero assigned countries
 * - Shows FlashSubscriptionGate when: logged in but no active subscription
 */

import { useEffect, useMemo, useState } from "react";
import { useFlashEntitlement } from "@/app/hooks/useFlashEntitlement";
import { useAppContext } from "@/components/providers/Providers";
import {
  FlashEntitlementContext,
  type FlashEntitlementContextValue,
} from "@/app/flash-reports/context/FlashEntitlementContext";
import FlashCountrySelectModal from "./FlashCountrySelectModal";
import SharedNoCountriesModal from "./SharedNoCountriesModal";
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

  const { region, setRegion } = useAppContext();

  // Track whether the initial country-select modal was shown and completed
  const [modalDismissed, setModalDismissed] = useState(false);

  const isSubscribed =
    !!entitlement?.isSubscribed && entitlement.effectiveStatus === "active";
  const isDirectUser = entitlement?.accessType === "direct";
  const isSharedUser = entitlement?.accessType === "shared";

  // Derive the stable default country for this user:
  // - free / not-logged-in => "india"
  // - subscribed (direct or shared) with assigned slots => first slot (slot_index=0)
  // - subscribed but no slots yet => "india" as temporary placeholder
  const defaultCountry: string = useMemo(() => {
    if (!isLoggedIn || !isSubscribed || !assignedCountries.length) return "india";
    const sorted = [...assignedCountries].sort((a, b) => a.slot_index - b.slot_index);
    return sorted[0]?.country_id || "india";
  }, [isLoggedIn, isSubscribed, assignedCountries]);

  // Build locked country set: null = no lock, string[] = subscribed user slots
  const lockedToCountries: string[] | null = useMemo(() => {
    if (!isLoggedIn) return null;
    if (loading) return null;
    if (!entitlement) return null;
    if (!isSubscribed) return null;
    if (assignedCountries.length === 0) return null; // no slots yet: modal shows
    return assignedCountries.map((c) => c.country_id);
  }, [isLoggedIn, loading, entitlement, isSubscribed, assignedCountries]);

  // Guard: after loading, if region is outside the locked set, correct to defaultCountry
  useEffect(() => {
    if (loading) return;
    if (!lockedToCountries) return; // no restriction active
    if (lockedToCountries.includes(region)) return; // already valid
    // Current region is not in the user's allowed slots — redirect to default
    setRegion(defaultCountry);
  }, [loading, lockedToCountries, region, defaultCountry, setRegion]);

  // On initial load: if user is subscribed and has assigned slots, set region to default
  // (handles entry from navbar/home buttons that default to India)
  useEffect(() => {
    if (loading) return;
    if (!isSubscribed || !assignedCountries.length) return;
    if (lockedToCountries && !lockedToCountries.includes(region)) {
      setRegion(defaultCountry);
    } else if (region === "india" && defaultCountry !== "india") {
      // First entry for a subscribed user who hasn't chosen India — push to their slot 0
      setRegion(defaultCountry);
    }
    // Only run once when loading completes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const needsCountrySelection =
    isLoggedIn &&
    isSubscribed &&
    !loading &&
    assignedCountries.length === 0 &&
    !modalDismissed;

  const ctxValue: FlashEntitlementContextValue = {
    entitlement,
    assignedCountries,
    lockedToCountries,
    defaultCountry,
    loading,
    isLoggedIn,
  };

  return (
    <FlashEntitlementContext.Provider value={ctxValue}>
      {children}

      {/* DIRECT subscribed user with no slots yet: show country-select modal */}
      {needsCountrySelection && isDirectUser && entitlement && (
        <FlashCountrySelectModal
          entitlement={entitlement}
          assignedCountries={assignedCountries}
          onSaved={() => {
            refreshCountries();
            setModalDismissed(true);
          }}
        />
      )}

      {/* SHARED subscribed user with no slots yet: show plan-owner-must-assign modal */}
      {needsCountrySelection && isSharedUser && (
        <SharedNoCountriesModal
          parentEmail={entitlement?.parentEmail ?? null}
          onDismiss={() => setModalDismissed(true)}
        />
      )}

      {/* Teaser + paywall popup for logged-in free/inactive users */}
      {isLoggedIn && !loading && entitlement && !isSubscribed && (
        <FlashSubscriptionGate entitlement={entitlement} />
      )}
    </FlashEntitlementContext.Provider>
  );
}
