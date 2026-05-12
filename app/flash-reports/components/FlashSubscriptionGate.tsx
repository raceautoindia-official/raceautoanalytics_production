"use client";

/**
 * FlashSubscriptionGate
 *
 * Shown only for logged-in users with NO active subscription and NO active trial.
 * Escalation flow (session-scoped):
 *   1. After FIRST_POPUP_DELAY_MS -> show popup WITH dismiss controls
 *   2. If dismissed -> after SECOND_POPUP_DELAY_MS -> show popup WITHOUT dismiss controls (mandatory)
 *
 * Path exclusions: the gate is intentionally suppressed on the Flash Reports
 * overview page (`/flash-reports/overview`) so free users can browse the
 * product preview without being interrupted by the mandatory paywall. The
 * gate still fires everywhere else (segment pages, country pages, etc.)
 * where users try to access actual gated data.
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { FlashEntitlement } from "@/app/hooks/useFlashEntitlement";
import SubscribeButton from "@/components/subscription/SubscribeButton";
import {
  BYF_SEGMENTS,
  checkByfAvailability,
  type ByfAvailability,
  type ByfSegmentKey,
} from "@/lib/byfSegments";

const GATE_EXEMPT_PATHS = new Set<string>([
  "/flash-reports/overview",
]);

const FIRST_POPUP_DELAY_MS = 10_000; // existing first delay
const SECOND_POPUP_DELAY_MS = 5_000; // existing repeat gap

const FLASH_REPORTS_MODAL_STEP_KEY = "flashReportsSubscriptionModalStep";
const MANDATORY_APPEARANCE_STEP = 2;

interface Props {
  entitlement: FlashEntitlement;
  /**
   * When set, render an additional "Submit BYF Score" button in the gate
   * that takes the user straight to /score-card with the target country's
   * default segment graph. Optional — when null/undefined, the gate renders
   * exactly as before for all existing call sites.
   */
  byfTargetCountry?: string | null;
}

function getStoredStep(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.sessionStorage.getItem(FLASH_REPORTS_MODAL_STEP_KEY);
  const parsed = Number.parseInt(raw || "0", 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, MANDATORY_APPEARANCE_STEP);
}

function setStoredStep(step: number) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    FLASH_REPORTS_MODAL_STEP_KEY,
    String(Math.min(Math.max(step, 0), MANDATORY_APPEARANCE_STEP)),
  );
}

export default function FlashSubscriptionGate({
  entitlement,
  byfTargetCountry = null,
}: Props) {
  const [visibleStep, setVisibleStep] = useState<0 | 1 | 2>(0);
  const [byfSegmentKey, setByfSegmentKey] = useState<ByfSegmentKey>("cv");
  const [availabilityByKey, setAvailabilityByKey] = useState<
    Record<string, ByfAvailability>
  >({});
  const [checkingKey, setCheckingKey] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  const slug = String(byfTargetCountry || "").trim().toLowerCase();
  const byfCacheKey = slug ? `${slug}|${byfSegmentKey}` : "";

  // Validate (country, segment) availability whenever either changes. The
  // gate may render multiple times (step 1 dismiss → step 2 reappear) — the
  // cache prevents re-fetching.
  useEffect(() => {
    if (!slug || !byfCacheKey) return;
    if (availabilityByKey[byfCacheKey] !== undefined) {
      if (checkingKey === byfCacheKey) setCheckingKey(null);
      return;
    }
    let cancelled = false;
    setCheckingKey(byfCacheKey);
    (async () => {
      const result = await checkByfAvailability(slug, byfSegmentKey);
      if (cancelled) return;
      setAvailabilityByKey((prev) => ({ ...prev, [byfCacheKey]: result }));
      setCheckingKey((prev) => (prev === byfCacheKey ? null : prev));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byfCacheKey]);

  function handleLaunchByf() {
    if (!slug) return;
    const a = availabilityByKey[byfCacheKey];
    if (a?.status !== "available") return;
    const params = new URLSearchParams();
    params.set("graphId", String(a.graphId));
    params.set("country", slug);
    params.set(
      "returnTo",
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/flash-reports/overview",
    );
    window.location.href = `/score-card?${params.toString()}`;
  }

  const isMembershipPending = Boolean(entitlement.membershipPendingApproval);
  // Path exemption: free users can browse `/flash-reports/overview` without
  // the mandatory paywall popping up. Body-class blur (data hiding) still
  // applies — only the popup is suppressed on these preview/marketing pages.
  const isExemptPath = !!pathname && GATE_EXEMPT_PATHS.has(pathname);
  const shouldGate =
    !isExemptPath &&
    (isMembershipPending ||
      !entitlement.isSubscribed ||
      entitlement.effectiveStatus !== "active");

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    if (!shouldGate) {
      clearTimer();
      setVisibleStep(0);
      document.body.classList.remove("flash-teaser-hide-numbers");
      return;
    }

    if (visibleStep !== 0) return;

    if (isMembershipPending) {
      setVisibleStep(1);
      document.body.classList.add("flash-teaser-hide-numbers");
      return;
    }

    const step = getStoredStep();

    if (step >= MANDATORY_APPEARANCE_STEP) {
      // Mandatory step 2: re-fires on every page mount / refresh once the
      // user has progressed past the dismissable step 1. There is intentionally
      // NO per-session dismiss persistence here — once a free user reaches the
      // mandatory state, the modal must reappear every time they navigate or
      // refresh until they subscribe. (The earlier S-8 per-session suppression
      // was reverted because product requirement is "modal should be mandate
      // and even if he refresh the page it should show".)
      setStoredStep(MANDATORY_APPEARANCE_STEP);
      setVisibleStep(2);
      document.body.classList.add("flash-teaser-hide-numbers");
      return;
    }

    const nextStep = step + 1;
    const delay = nextStep === 1 ? FIRST_POPUP_DELAY_MS : SECOND_POPUP_DELAY_MS;

    timerRef.current = setTimeout(() => {
      if (nextStep >= MANDATORY_APPEARANCE_STEP) {
        setStoredStep(MANDATORY_APPEARANCE_STEP);
      }
      setVisibleStep(nextStep as 1 | 2);
      document.body.classList.add("flash-teaser-hide-numbers");
    }, delay);

    return clearTimer;
  }, [shouldGate, visibleStep, isMembershipPending]);

  // Apply the hide-numbers class IMMEDIATELY when gating is required, instead
  // of only adding it once the popup actually appears (after 10s/15s delays).
  // Previously real numeric values were visible during that delay window — a
  // direct data leak. Now non-subscribers never see the values, regardless of
  // whether the popup has fired yet. Class is removed only when the user is
  // properly entitled (shouldGate flips to false).
  useEffect(() => {
    if (shouldGate) {
      document.body.classList.add("flash-teaser-hide-numbers");
    } else {
      document.body.classList.remove("flash-teaser-hide-numbers");
    }
  }, [shouldGate]);

  // Escape key dismisses the dismissable step 1 only. Step 2 is mandatory —
  // Escape does nothing. Membership-pending notice is also dismissable (it's
  // informational, not a paywall, so the user shouldn't be trapped on it).
  useEffect(() => {
    if (visibleStep === 0) return;
    const isDismissableState = isMembershipPending || visibleStep === 1;
    if (!isDismissableState) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      clearTimer();
      setStoredStep(visibleStep);
      setVisibleStep(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visibleStep, isMembershipPending]);

  if (!shouldGate || visibleStep === 0) return null;

  // Step 1 (initial popup) and the membership-pending notice are dismissable.
  // Step 2 (mandatory) is hard-locked: no close button, no Escape, no Maybe
  // Later — restored to original pre-S-8 behavior so free users see the gate
  // on every refresh / route change until they subscribe.
  const canDismiss = isMembershipPending || visibleStep === 1;

  return (
    <>
      <div className="fixed inset-0 z-[9990] pointer-events-none bg-[#050B1A]/60 backdrop-blur-[1px]" />

      <div className="fixed inset-0 z-[9991] flex items-center justify-center p-4">
        <div className="relative w-full max-w-[480px] overflow-hidden rounded-[24px] border border-white/10 bg-[#0B1228] shadow-[0_30px_90px_rgba(0,0,0,0.85)]">
          <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-[600px] -translate-x-1/2 rounded-full bg-[#4F67FF]/15 blur-3xl" />

          <div className="relative px-7 py-6">
            {canDismiss && (
              <button
                onClick={() => {
                  clearTimer();
                  setStoredStep(visibleStep);
                  setVisibleStep(0);
                }}
                className="absolute top-4 right-4 text-[#EAF0FF]/40 hover:text-[#EAF0FF]/70 transition text-xl leading-none"
                aria-label="Dismiss"
              >
                x
              </button>
            )}

            <div className="text-xl font-semibold text-[#EAF0FF]">
              {isMembershipPending
                ? "Membership Approval Pending"
                : "Subscribe to See the Data"}
            </div>
            <div className="mt-2 text-sm text-[#EAF0FF]/60 leading-relaxed">
              {isMembershipPending
                ? entitlement.membershipPendingMessage ||
                  "Your membership invitation is still pending approval. Check your email inbox to accept the invitation. If you did not receive it, ask the parent user to resend the approval link."
                : visibleStep === 1
                ? "You're currently on a free account. Subscribe to unlock full Flash Report data including country-level insights, numeric chart values, and segment breakdowns."
                : "Full data is available to subscribers only. Choose a plan to continue accessing Flash Reports."}
            </div>

            {!isMembershipPending && (
              <div className="mt-5 text-sm text-[#EAF0FF]/50">
                Plans start with{" "}
                <span className="text-[#7B93FF] font-medium">1 country</span> on
                Individual Basic and go up to{" "}
                <span className="text-[#7B93FF] font-medium">11 countries</span>{" "}
                on Business Pro.
              </div>
            )}

            <div className="mt-6 flex gap-3">
              {isMembershipPending ? (
                <button
                  onClick={() => {
                    clearTimer();
                    setVisibleStep(0);
                  }}
                  className="flex-1 h-11 rounded-xl border border-white/10 bg-white/5 text-[#EAF0FF]/85 text-sm font-semibold hover:bg-white/10 transition"
                >
                  Okay
                </button>
              ) : (
                <SubscribeButton
                  onAfterClick={() => {
                    clearTimer();
                    setVisibleStep(0);
                    document.body.classList.remove("flash-teaser-hide-numbers");
                  }}
                  className="flex-1 h-11 rounded-xl bg-[#4F67FF] text-white text-sm font-semibold hover:bg-[#3B55FF] transition shadow-[0_8px_24px_rgba(79,103,255,0.25)]"
                >
                  View Subscription Plans
                </SubscribeButton>
              )}

              {!isMembershipPending && canDismiss && (
                <button
                  onClick={() => {
                    clearTimer();
                    setStoredStep(visibleStep);
                    setVisibleStep(0);
                  }}
                  className="px-4 h-11 rounded-xl border border-white/10 bg-white/5 text-[#EAF0FF]/70 text-sm hover:bg-white/10 transition"
                >
                  Maybe Later
                </button>
              )}
            </div>

            {!isMembershipPending && byfTargetCountry ? (() => {
              const byfAvailability = availabilityByKey[byfCacheKey];
              const byfChecking =
                checkingKey === byfCacheKey || byfAvailability === undefined;
              const byfAvailable = byfAvailability?.status === "available";
              const byfSegmentLabel =
                BYF_SEGMENTS.find((s) => s.configKey === byfSegmentKey)
                  ?.label || "";
              return (
                <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="flash-gate-byf-segment"
                      className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/80"
                    >
                      Segment
                    </label>
                    <div className="relative flex-1">
                      <select
                        id="flash-gate-byf-segment"
                        value={byfSegmentKey}
                        onChange={(e) =>
                          setByfSegmentKey(e.target.value as ByfSegmentKey)
                        }
                        className="w-full appearance-none rounded-md border border-white/10 bg-[#0E1833] py-1.5 pl-2.5 pr-7 text-xs font-semibold text-[#EAF0FF] shadow-sm focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                      >
                        {BYF_SEGMENTS.map((s) => (
                          <option key={s.configKey} value={s.configKey}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#EAF0FF]/50">
                        ▾
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLaunchByf}
                    disabled={!byfAvailable}
                    className={
                      byfAvailable
                        ? "mt-2 w-full h-11 rounded-xl border border-amber-400/40 bg-amber-500/10 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
                        : "mt-2 w-full h-11 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-[#EAF0FF]/50 cursor-not-allowed"
                    }
                    title={
                      byfChecking
                        ? "Checking availability…"
                        : byfAvailable
                          ? "Submit your BYF Score first"
                          : `BYF for ${byfSegmentLabel} is not yet available for this country.`
                    }
                  >
                    {byfChecking
                      ? "Checking availability…"
                      : byfAvailable
                        ? "Or submit your BYF Score first"
                        : `Coming soon for ${byfSegmentLabel}`}
                  </button>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[#EAF0FF]/40 text-center">
                    Build Your Forecast lets you score this market’s drivers
                    before subscribing — your forecast appears on the chart
                    once you do.
                  </p>
                </div>
              );
            })() : null}
          </div>
        </div>
      </div>
    </>
  );
}

