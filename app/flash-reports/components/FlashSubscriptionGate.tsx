"use client";

/**
 * FlashSubscriptionGate
 *
 * Shown only for logged-in users with NO active subscription and NO active trial.
 * Escalation flow (session-scoped):
 *   1. After FIRST_POPUP_DELAY_MS -> show popup WITH dismiss controls
 *   2. If dismissed -> after SECOND_POPUP_DELAY_MS -> show popup WITHOUT dismiss controls (mandatory)
 */

import { useEffect, useRef, useState } from "react";
import type { FlashEntitlement } from "@/app/hooks/useFlashEntitlement";
import SubscribeButton from "@/components/subscription/SubscribeButton";

const FIRST_POPUP_DELAY_MS = 10_000; // existing first delay
const SECOND_POPUP_DELAY_MS = 5_000; // existing repeat gap

const FLASH_REPORTS_MODAL_STEP_KEY = "flashReportsSubscriptionModalStep";
const MANDATORY_DISMISSED_KEY = "flashReportsMandatoryDismissed";
const MANDATORY_APPEARANCE_STEP = 2;

interface Props {
  entitlement: FlashEntitlement;
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

// S-8: per-session dismissal of the mandatory (step 2) popup. Allows the user
// to escape the trap of having no close button on every page load — but ONLY
// hides the popup; the body-class data hiding (`flash-teaser-hide-numbers`)
// remains in effect so non-subscribers still cannot read protected values.
// Cleared on browser/tab close (sessionStorage).
function isMandatoryDismissedThisSession(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(MANDATORY_DISMISSED_KEY) === "1";
}

function markMandatoryDismissedThisSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(MANDATORY_DISMISSED_KEY, "1");
}

export default function FlashSubscriptionGate({ entitlement }: Props) {
  const [visibleStep, setVisibleStep] = useState<0 | 1 | 2>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMembershipPending = Boolean(entitlement.membershipPendingApproval);
  const shouldGate =
    isMembershipPending ||
    !entitlement.isSubscribed || entitlement.effectiveStatus !== "active";

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
      setStoredStep(MANDATORY_APPEARANCE_STEP);
      // S-8: if the user already dismissed the mandatory popup in this session,
      // suppress it on subsequent route changes / re-mounts. Body class still
      // applies (data still blurred) — only the modal is hidden.
      if (isMandatoryDismissedThisSession()) {
        setVisibleStep(0);
        document.body.classList.add("flash-teaser-hide-numbers");
        return;
      }
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

  // S-8: handle Escape key to close the popup (works for both step 1 and step 2).
  // The dismiss path uses the same logic as clicking the close button — body
  // class stays applied so data hiding is preserved.
  useEffect(() => {
    if (visibleStep === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      clearTimer();
      if (visibleStep === 2) {
        markMandatoryDismissedThisSession();
      } else {
        setStoredStep(visibleStep);
      }
      setVisibleStep(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visibleStep]);

  if (!shouldGate || visibleStep === 0) return null;

  // S-8: step 2 is now also dismissable per session. Previously this was
  // hard-locked (no close button + no Escape) which trapped the user. Now they
  // can close the popup, but the body class `flash-teaser-hide-numbers` remains
  // applied — values are still blurred until the user actually subscribes.
  const canDismiss = true;

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
                  // S-8: persist dismissal differently for step 2 — write to a
                  // session-only key so the mandatory popup stays gone for this
                  // session (without ever skipping the data-hiding gate).
                  if (visibleStep === 2) {
                    markMandatoryDismissedThisSession();
                  } else {
                    setStoredStep(visibleStep);
                  }
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
                    if (visibleStep === 2) {
                      markMandatoryDismissedThisSession();
                    } else {
                      setStoredStep(visibleStep);
                    }
                    setVisibleStep(0);
                  }}
                  className="px-4 h-11 rounded-xl border border-white/10 bg-white/5 text-[#EAF0FF]/70 text-sm hover:bg-white/10 transition"
                >
                  Maybe Later
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

