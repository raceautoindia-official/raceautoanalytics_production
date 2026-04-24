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

  useEffect(() => {
    if (!shouldGate || visibleStep === 0) {
      document.body.classList.remove("flash-teaser-hide-numbers");
    }
  }, [shouldGate, visibleStep]);

  if (!shouldGate || visibleStep === 0) return null;

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
          </div>
        </div>
      </div>
    </>
  );
}

