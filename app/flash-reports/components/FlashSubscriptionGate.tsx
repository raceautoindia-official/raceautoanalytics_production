"use client";

/**
 * FlashSubscriptionGate
 *
 * Shown only for logged-in users who have NO active subscription (free users).
 * - Does NOT interfere with the existing non-login RouteAuthGate.
 * - After TEASER_DELAY_MS milliseconds, hides numeric chart values and shows
 *   a "Subscribe to see the data" popup.
 * - The CSS class `flash-teaser-hide-numbers` is injected into <body> so that
 *   chart number labels can be hidden site-wide via a global CSS rule.
 */

import { useEffect, useRef, useState } from "react";
import type { FlashEntitlement } from "@/app/hooks/useFlashEntitlement";
import SubscribeButton from "@/components/subscription/SubscribeButton";

const TEASER_DELAY_MS = 7_000; // 7 seconds of teaser view

interface Props {
  entitlement: FlashEntitlement;
}

export default function FlashSubscriptionGate({ entitlement }: Props) {
  const [showPopup, setShowPopup] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFreeUser =
    !entitlement.isSubscribed || entitlement.effectiveStatus !== "active";

  useEffect(() => {
    if (!isFreeUser) return;
    if (dismissed) return;

    timerRef.current = setTimeout(() => {
      setShowPopup(true);
      // Add body class so CSS can hide chart number labels
      document.body.classList.add("flash-teaser-hide-numbers");
    }, TEASER_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isFreeUser, dismissed]);

  // Clean up body class when component unmounts or user dismisses
  useEffect(() => {
    if (dismissed || !isFreeUser) {
      document.body.classList.remove("flash-teaser-hide-numbers");
    }
  }, [dismissed, isFreeUser]);

  // Nothing to show for subscribed users or dismissed state
  if (!isFreeUser || dismissed) return null;

  if (!showPopup) return null;

  return (
    <>
      {/* Semi-transparent overlay — does NOT block the page fully, just dims it */}
      <div className="fixed inset-0 z-[9990] pointer-events-none bg-[#050B1A]/60 backdrop-blur-[1px]" />

      {/* Subscribe popup */}
      <div className="fixed inset-0 z-[9991] flex items-center justify-center p-4">
        <div className="relative w-full max-w-[480px] overflow-hidden rounded-[24px] border border-white/10 bg-[#0B1228] shadow-[0_30px_90px_rgba(0,0,0,0.85)]">
          <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-[600px] -translate-x-1/2 rounded-full bg-[#4F67FF]/15 blur-3xl" />

          <div className="relative px-7 py-6">
            {/* Close / dismiss */}
            <button
              onClick={() => {
                setDismissed(true);
                setShowPopup(false);
              }}
              className="absolute top-4 right-4 text-[#EAF0FF]/40 hover:text-[#EAF0FF]/70 transition text-xl leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>

            <div className="text-xl font-semibold text-[#EAF0FF]">
              Subscribe to See the Data
            </div>
            <div className="mt-2 text-sm text-[#EAF0FF]/60 leading-relaxed">
              You&apos;re currently on a free account. Subscribe to unlock full
              Flash Report data including country-level insights, numeric chart
              values, and segment breakdowns.
            </div>

            <div className="mt-5 text-sm text-[#EAF0FF]/50">
              Plans start with{" "}
              <span className="text-[#7B93FF] font-medium">1 country</span> on
              Bronze and go up to{" "}
              <span className="text-[#7B93FF] font-medium">11 countries</span>{" "}
              on Platinum.
            </div>

            <div className="mt-6 flex gap-3">
              <SubscribeButton
                onAfterClick={() => setDismissed(true)}
                className="flex-1 h-11 rounded-xl bg-[#4F67FF] text-white text-sm font-semibold hover:bg-[#3B55FF] transition shadow-[0_8px_24px_rgba(79,103,255,0.25)]"
              >
                View Subscription Plans
              </SubscribeButton>

              <button
                onClick={() => {
                  setDismissed(true);
                  setShowPopup(false);
                }}
                className="px-4 h-11 rounded-xl border border-white/10 bg-white/5 text-[#EAF0FF]/70 text-sm hover:bg-white/10 transition"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
