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
 * - Admin override: 3-second logo long-press + passkey bypasses country locking (sessionStorage)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
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

const ADMIN_SESSION_KEY = "flash_admin_override";
const ADMIN_PASSKEY = "imThe8055";
const LOGO_HOLD_MS = 3000;

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

  // ── Admin override state ──────────────────────────────────────────────────
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore admin state from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsAdmin(sessionStorage.getItem(ADMIN_SESSION_KEY) === "1");
    }
  }, []);

  function startPressTimer() {
    pressTimerRef.current = setTimeout(() => {
      setAdminModalOpen(true);
    }, LOGO_HOLD_MS);
  }

  function cancelPressTimer() {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }

  function handleAdminSubmit() {
    if (adminKeyInput === ADMIN_PASSKEY) {
      setIsAdmin(true);
      sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      setAdminModalOpen(false);
      setAdminKeyInput("");
    } else {
      setAdminKeyInput("");
    }
  }

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
  // Admin override skips this redirect entirely.
  useEffect(() => {
    if (loading) return;
    if (isAdmin) return; // admin can browse any country
    if (!lockedToCountries) return; // no restriction active
    if (lockedToCountries.includes(region)) return; // already valid
    // Current region is not in the user's allowed slots — redirect to default
    setRegion(defaultCountry);
  }, [loading, isAdmin, lockedToCountries, region, defaultCountry, setRegion]);

  // On initial load: if user is subscribed and has assigned slots, set region to default
  // (handles entry from navbar/home buttons that default to India)
  useEffect(() => {
    if (loading) return;
    if (isAdmin) return; // admin can stay wherever they are
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
    isAdmin,
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

      {/* Admin logo trigger — fixed bottom-right watermark, 3-second long-press */}
      <div
        className="fixed bottom-4 right-4 z-40 select-none cursor-pointer opacity-0 hover:opacity-20 transition-opacity duration-300"
        style={{ userSelect: "none", WebkitUserSelect: "none" }}
        onMouseDown={startPressTimer}
        onMouseUp={cancelPressTimer}
        onMouseLeave={cancelPressTimer}
        onTouchStart={(e) => { e.preventDefault(); startPressTimer(); }}
        onTouchEnd={cancelPressTimer}
        title=""
        aria-hidden
      >
        <Image
          src="/images/logo.webp"
          alt=""
          width={80}
          height={20}
          draggable={false}
        />
      </div>

      {/* Admin passkey modal */}
      {adminModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-[#0B1228] p-6 shadow-2xl">
            <h2 className="mb-4 text-sm font-semibold text-[#EAF0FF]">
              Admin Override
            </h2>
            <input
              type="password"
              placeholder="Enter passkey…"
              value={adminKeyInput}
              onChange={(e) => setAdminKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminSubmit()}
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[#EAF0FF] placeholder-[#EAF0FF]/30 outline-none focus:border-[#4F67FF]/60 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdminSubmit}
                className="flex-1 rounded-xl bg-[#4F67FF] py-2 text-sm font-semibold text-white hover:bg-[#3B55FF] transition"
              >
                Unlock
              </button>
              <button
                onClick={() => { setAdminModalOpen(false); setAdminKeyInput(""); }}
                className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-[#EAF0FF]/60 hover:bg-white/5 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </FlashEntitlementContext.Provider>
  );
}
