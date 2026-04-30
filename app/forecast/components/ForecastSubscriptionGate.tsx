"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { ForecastEntitlement } from "@/app/hooks/useForecastEntitlement";
import SubscribeButton from "@/components/subscription/SubscribeButton";

interface Props {
  entitlement: ForecastEntitlement;
}

const OPEN_DELAY_MS = 5_000;

// Path exemption: free users can browse the Forecast overview page (`/forecast`)
// without the mandatory subscription popup interrupting them — they're
// previewing the product. The gate still fires on every other forecast path
// (`/forecast/<segment>`, deep-link routes, etc.) where users try to access
// actual gated forecast data.
const GATE_EXEMPT_PATHS = new Set<string>([
  "/forecast",
]);

export default function ForecastSubscriptionGate({ entitlement }: Props) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  const isMembershipPending = Boolean(entitlement.membershipPendingApproval);
  const isExemptPath = !!pathname && GATE_EXEMPT_PATHS.has(pathname);
  // Gate fires on every NON-exempt forecast path (and re-appears on every
  // page mount / refresh, since `open` state doesn't persist across reloads).
  // The exempt overview path lets free users see the product preview.
  const needsGate =
    !isExemptPath &&
    (isMembershipPending ||
      !entitlement.isSubscribed ||
      entitlement.effectiveStatus !== "active");

  useEffect(() => {
    if (!needsGate) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      setOpen(false);
      return;
    }

    if (isMembershipPending) {
      setOpen(true);
      return;
    }

    if (open) return;
    timerRef.current = setTimeout(() => setOpen(true), OPEN_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [needsGate, open, isMembershipPending]);

  if (!open || !needsGate) return null;

  return (
    <>
      <div className="fixed inset-0 z-[9990] pointer-events-auto bg-[#050B1A]/65 backdrop-blur-[2px]" />

      <div className="fixed inset-0 z-[9991] flex items-center justify-center p-4">
        <div className="relative w-full max-w-[480px] overflow-hidden rounded-[24px] border border-white/10 bg-[#0B1228] shadow-[0_30px_90px_rgba(0,0,0,0.85)]">
          <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-[600px] -translate-x-1/2 rounded-full bg-[#4F67FF]/15 blur-3xl" />

          <div className="relative px-7 py-6">
            <div className="text-xl font-semibold text-[#EAF0FF]">
              {isMembershipPending
                ? "Membership Approval Pending"
                : "Subscribe to Access Forecast Data"}
            </div>

            <div className="mt-2 text-sm text-[#EAF0FF]/60 leading-relaxed">
              {isMembershipPending
                ? entitlement.membershipPendingMessage ||
                  "Your membership invitation is still pending approval. Check your email inbox to accept the invitation. If you did not receive it, ask the parent user to resend the approval link."
                : "Forecast charts and downloadable data are available to paid subscribers only."}
            </div>

            {!isMembershipPending && (
              <div className="mt-5 text-sm text-[#EAF0FF]/50">
                Subscribe to unlock full Forecast access beyond the basic overview shell.
              </div>
            )}

            <div className="mt-6 flex gap-3">
              {isMembershipPending ? (
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 h-11 rounded-xl border border-white/10 bg-white/5 text-[#EAF0FF]/85 text-sm font-semibold hover:bg-white/10 transition"
                >
                  Okay
                </button>
              ) : (
                <SubscribeButton
                  onAfterClick={() => setOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-[#4F67FF] text-white text-sm font-semibold hover:bg-[#3B55FF] transition shadow-[0_8px_24px_rgba(79,103,255,0.25)]"
                >
                  View Subscription Plans
                </SubscribeButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
