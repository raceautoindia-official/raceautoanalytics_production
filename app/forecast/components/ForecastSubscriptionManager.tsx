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

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import ForecastEntitlementContext from "../context/ForecastEntitlementContext";
import { useForecastEntitlement } from "@/app/hooks/useForecastEntitlement";
import ForecastRegionSelectModal from "./ForecastRegionSelectModal";
import ForecastSharedNoRegionsModal from "./ForecastSharedNoRegionsModal";
import ForecastSubscriptionGate from "./ForecastSubscriptionGate";
import TrialCountdownReminder from "@/components/auth/TrialCountdownReminder";

// Admin passkey override — mirrors FlashSubscriptionManager. Uses the SAME
// sessionStorage key as Flash so unlocking on either section unlocks both
// (single passkey entry per session, both sections respected). Same passkey
// and same UX: 3-second long-press on a hidden bottom-right logo watermark.
const ADMIN_SESSION_KEY = "flash_admin_override";
const ADMIN_PASSKEY = "imThe8055";
const LOGO_HOLD_MS = 3000;

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

  // ── Admin passkey override state (mirror of FlashSubscriptionManager) ──
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore admin state from sessionStorage on mount (shared with Flash —
  // unlock once on either section, both sections honor it).
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

  // Derive context values
  const isSubscribed =
    !!entitlement?.isSubscribed && entitlement.effectiveStatus === "active";
  const isDirectUser = entitlement?.accessType === "direct";
  const isSharedUser = entitlement?.accessType === "shared";

  // Admin/moderator role bypass — mirrors FlashSubscriptionManager behaviour
  const role = String(entitlement?.role || "").toLowerCase();
  const hasRoleOverride =
    Boolean(entitlement?.hasFullAccess) ||
    role === "admin" ||
    role === "moderator";
  // Combined admin override: backend role flag OR in-session passkey unlock.
  // Used for region locking, modal suppression, and the gate suppression
  // below — admins should never see the mandatory subscription gate.
  const hasAccessOverride = isAdmin || hasRoleOverride;

  // lockedToRegions: null for free users, admins, or no restriction; string[] for paid users
  const lockedToRegions: string[] | null = useMemo(() => {
    if (!isSubscribed) return null; // free users: unrestricted
    if (hasAccessOverride) return null; // admin/moderator (role OR passkey): unrestricted
    return assignedRegions.map((r) => r.region_name);
  }, [isSubscribed, hasAccessOverride, assignedRegions]);

  // Default region = first assigned slot
  const defaultRegion: string | null =
    assignedRegions.length > 0
      ? assignedRegions.find((r) => r.slot_index === 0)?.region_name ??
        assignedRegions[0].region_name
      : null;

  // Show region-select modal for direct paid users with no regions yet (skip for admin)
  const needsRegionSelect =
    isLoggedIn &&
    !loading &&
    isSubscribed &&
    isDirectUser &&
    assignedRegions.length === 0 &&
    !hasAccessOverride;

  // Show informational modal for shared paid users whose parent has no regions (skip for admin)
  const sharedNeedsParentAssignment =
    isLoggedIn &&
    !loading &&
    isSubscribed &&
    isSharedUser &&
    assignedRegions.length === 0 &&
    !hasAccessOverride;

  const contextValue = {
    entitlement,
    assignedRegions,
    lockedToRegions,
    defaultRegion,
    loading,
    isLoggedIn,
    // Expose the COMBINED override so consumer components can detect either
    // backend role admins or in-session passkey admins.
    isAdmin: hasAccessOverride,
    refreshRegions,
  };

  // Mandatory subscription gate is suppressed for admins (role OR passkey).
  // Per user request: "admin if free user that subscription mandatory modal
  // should not disturb him" — covered here because hasAccessOverride flips
  // true the moment the passkey is entered, even if the user is on a free
  // plan.
  const shouldShowSubscriptionGate =
    isLoggedIn &&
    !loading &&
    entitlement &&
    !hasAccessOverride &&
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

      {/* Admin passkey trigger — hidden bottom-right logo watermark, 3-second
          long-press opens the passkey modal. Mirrors FlashSubscriptionManager
          exactly so admins use the same gesture in both sections. */}
      <div
        className="fixed bottom-4 right-4 z-40 select-none cursor-pointer opacity-0 hover:opacity-20 transition-opacity duration-300"
        style={{ userSelect: "none", WebkitUserSelect: "none" }}
        onMouseDown={startPressTimer}
        onMouseUp={cancelPressTimer}
        onMouseLeave={cancelPressTimer}
        onTouchStart={(e) => {
          e.preventDefault();
          startPressTimer();
        }}
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
              placeholder="Enter passkey..."
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
                onClick={() => {
                  setAdminModalOpen(false);
                  setAdminKeyInput("");
                }}
                className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-[#EAF0FF]/60 hover:bg-white/5 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </ForecastEntitlementContext.Provider>
  );
}
