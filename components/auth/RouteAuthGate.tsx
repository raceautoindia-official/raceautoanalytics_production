"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import AuthModal from "@/app/flash-reports/components/Login/LoginModal";
import TrialRequestForm from "./TrialRequestForm";
import SubscribeButton from "@/components/subscription/SubscribeButton";

const EXCLUDED = new Set([
  "/",
  "/flash-reports/overview",
  "/forecast/overview",
]);

function isProtectedPath(pathname: string) {
  if (EXCLUDED.has(pathname)) return false;
  if (pathname.startsWith("/flash-reports")) return true;
  if (pathname.startsWith("/forecast")) return true;
  return false;
}

function hasAuthTokenCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith("authToken="));
}

async function hasValidSessionToken() {
  if (!hasAuthTokenCookie()) return false;

  try {
    const res = await fetch("/api/subscription/access-summary", {
      credentials: "include",
      cache: "no-store",
    });

    if (res.ok) return true;
    if (res.status === 401) return false;

    // Avoid false gate on transient backend failures.
    return true;
  } catch {
    return true;
  }
}

export default function RouteAuthGate() {
  const pathname = usePathname();
  const [openGate, setOpenGate] = useState(false);
  const [openAuth, setOpenAuth] = useState(false);
  const [view, setView] = useState<"gate" | "trial">("gate");

  const shouldProtect = useMemo(
    () => isProtectedPath(pathname || "/"),
    [pathname],
  );

  useEffect(() => {
    setOpenGate(false);
    setOpenAuth(false);
    setView("gate");

    if (!shouldProtect) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const forceImmediate =
      typeof window !== "undefined" &&
      window.sessionStorage.getItem("forceRouteAuthGate") === "1";

    async function run() {
      const hasValidSession = await hasValidSessionToken();
      if (cancelled || hasValidSession) return;

      if (forceImmediate) {
        window.sessionStorage.removeItem("forceRouteAuthGate");
        setOpenGate(true);
        return;
      }

      timer = window.setTimeout(async () => {
        const stillValid = await hasValidSessionToken();
        if (!cancelled && !stillValid) {
          setOpenGate(true);
        }
      }, 5_000);
    }

    void run();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [shouldProtect, pathname]);

  useEffect(() => {
    if (!openGate) return;
    let cancelled = false;

    const interval = window.setInterval(() => {
      if (!hasAuthTokenCookie()) return;

      void hasValidSessionToken().then((valid) => {
        if (!valid || cancelled) return;
        // Don't auto-close while the trial form is visible - the form sets the
        // authToken cookie on success and shows its own success message that the
        // user must be able to read before navigating away.
        if (view === "trial") return;

        setOpenGate(false);
        setOpenAuth(false);
        setView("gate");
      });
    }, 500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [openGate, view]);

  if (!shouldProtect) return null;

  return (
    <>
      {openGate && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[#050B1A]/80 backdrop-blur-[3px]" />

          {/* Modal */}
          <div className="relative w-full max-w-[600px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0B1228] shadow-[0_30px_90px_rgba(0,0,0,0.85)]">
            {/* subtle top glow */}
            <div className="pointer-events-none absolute -top-28 left-1/2 h-56 w-[860px] -translate-x-1/2 rounded-full bg-[#4F67FF]/18 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/8 to-transparent" />

            <div className="relative px-8 py-7">
              <div className="text-2xl font-semibold text-[#EAF0FF]">
                Continue to Premium Content
              </div>
              <div className="mt-2 text-sm text-[#EAF0FF]/70">
                {view === "gate"
                  ? "Please login to continue, or request one time access."
                  : "Request a one time access to continue."}
              </div>

              {/* Gate view: show link + buttons */}
              {view === "gate" && (
                <>
                  <div className="mt-4">
<SubscribeButton
  onAfterClick={() => setOpenGate(false)}
  className="inline-flex text-sm text-[#EAF0FF]/90 underline decoration-white/30 underline-offset-4 hover:decoration-white/60"
>
  View subscription plans
</SubscribeButton>
</div>

                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => setOpenAuth(true)}
                      className="h-12 rounded-2xl bg-[#4F67FF] text-white font-semibold shadow-[0_12px_30px_rgba(79,103,255,0.25)] hover:bg-[#3B55FF] transition"
                    >
                      Login / Signup
                    </button>

                    <button
                      onClick={() => setView("trial")}
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 text-[#EAF0FF] font-semibold hover:bg-white/10 transition"
                    >
                      Request One Time Access
                    </button>
                  </div>
                </>
              )}

              {/* Trial view: show only form + back inside form */}
              {view === "trial" && (
                <div className="mt-5">
                  <TrialRequestForm onBack={() => setView("gate")} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Existing Auth Modal (no logic change) */}
      <AuthModal open={openAuth} onClose={() => setOpenAuth(false)} />
    </>
  );
}
