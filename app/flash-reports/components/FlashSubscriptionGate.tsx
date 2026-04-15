"use client";

/**
 * FlashSubscriptionGate
 *
 * Shown only for logged-in users with NO active subscription and NO active trial.
 * Escalation flow:
 *   1. After FIRST_POPUP_DELAY_MS → show popup WITH a dismiss ("Maybe Later") button
 *   2. If dismissed → after SECOND_POPUP_DELAY_MS → show popup WITHOUT a dismiss button
 *      (user must open subscription plans to continue)
 */

import { useEffect, useRef, useState } from "react";
import type { FlashEntitlement } from "@/app/hooks/useFlashEntitlement";
import SubscribeButton from "@/components/subscription/SubscribeButton";

const FIRST_POPUP_DELAY_MS  = 10_000; // 10 s — first closeable popup
const SECOND_POPUP_DELAY_MS =  5_000; //  5 s — second non-closeable popup

interface Props {
  entitlement: FlashEntitlement;
}

type Stage = "idle" | "first" | "dismissed" | "second";

export default function FlashSubscriptionGate({ entitlement }: Props) {
  const [stage, setStage] = useState<Stage>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trial-active users are treated as subscribed by the entitlement overlay,
  // so isSubscribed will already be true for them — no extra check needed.
  const isFreeUser =
    !entitlement.isSubscribed || entitlement.effectiveStatus !== "active";

  // Clear any pending timer
  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  // Stage machine
  useEffect(() => {
    if (!isFreeUser) {
      clearTimer();
      setStage("idle");
      document.body.classList.remove("flash-teaser-hide-numbers");
      return;
    }

    if (stage === "idle") {
      // Arm first popup
      timerRef.current = setTimeout(() => {
        setStage("first");
        document.body.classList.add("flash-teaser-hide-numbers");
      }, FIRST_POPUP_DELAY_MS);
    }

    if (stage === "dismissed") {
      // Arm second (non-closeable) popup
      timerRef.current = setTimeout(() => {
        setStage("second");
        document.body.classList.add("flash-teaser-hide-numbers");
      }, SECOND_POPUP_DELAY_MS);
    }

    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFreeUser, stage]);

  // Remove body class when gate is inactive
  useEffect(() => {
    if (!isFreeUser || stage === "idle" || stage === "dismissed") {
      document.body.classList.remove("flash-teaser-hide-numbers");
    }
  }, [isFreeUser, stage]);

  if (!isFreeUser) return null;
  if (stage === "idle" || stage === "dismissed") return null;

  const isFirstPopup = stage === "first";
  const canDismiss = isFirstPopup;

  return (
    <>
      {/* Dim overlay */}
      <div className="fixed inset-0 z-[9990] pointer-events-none bg-[#050B1A]/60 backdrop-blur-[1px]" />

      {/* Subscribe popup */}
      <div className="fixed inset-0 z-[9991] flex items-center justify-center p-4">
        <div className="relative w-full max-w-[480px] overflow-hidden rounded-[24px] border border-white/10 bg-[#0B1228] shadow-[0_30px_90px_rgba(0,0,0,0.85)]">
          <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-[600px] -translate-x-1/2 rounded-full bg-[#4F67FF]/15 blur-3xl" />

          <div className="relative px-7 py-6">
            {/* Close button — only on first popup */}
            {canDismiss && (
              <button
                onClick={() => {
                  clearTimer();
                  setStage("dismissed");
                }}
                className="absolute top-4 right-4 text-[#EAF0FF]/40 hover:text-[#EAF0FF]/70 transition text-xl leading-none"
                aria-label="Dismiss"
              >
                ×
              </button>
            )}

            <div className="text-xl font-semibold text-[#EAF0FF]">
              Subscribe to See the Data
            </div>
            <div className="mt-2 text-sm text-[#EAF0FF]/60 leading-relaxed">
              {isFirstPopup
                ? "You're currently on a free account. Subscribe to unlock full Flash Report data including country-level insights, numeric chart values, and segment breakdowns."
                : "Full data is available to subscribers only. Choose a plan to continue accessing Flash Reports."}
            </div>

            <div className="mt-5 text-sm text-[#EAF0FF]/50">
              Plans start with{" "}
              <span className="text-[#7B93FF] font-medium">1 country</span> on
              Individual Basic and go up to{" "}
              <span className="text-[#7B93FF] font-medium">11 countries</span>{" "}
              on Business Pro.
            </div>

            <div className="mt-6 flex gap-3">
              <SubscribeButton
                onAfterClick={() => {
                  clearTimer();
                  setStage("idle");
                  document.body.classList.remove("flash-teaser-hide-numbers");
                }}
                className="flex-1 h-11 rounded-xl bg-[#4F67FF] text-white text-sm font-semibold hover:bg-[#3B55FF] transition shadow-[0_8px_24px_rgba(79,103,255,0.25)]"
              >
                View Subscription Plans
              </SubscribeButton>

              {canDismiss && (
                <button
                  onClick={() => {
                    clearTimer();
                    setStage("dismissed");
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
