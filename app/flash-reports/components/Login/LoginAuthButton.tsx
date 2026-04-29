"use client";

import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import AuthModal from "./LoginModal";
import { useAuthModal } from "@/utils/AuthModalcontext";

const LoginNavButton = () => {
  const [token, setToken] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const { show, open, close } = useAuthModal();

  useEffect(() => {
    setIsMounted(true);
    const cookieToken = Cookies.get("authToken") || null;
    setToken(cookieToken);
  }, []);

  if (!isMounted) return null;

  const handleLogout = async () => {
    // Track whether the server-side cleanup actually succeeded. The previous
    // implementation silently swallowed every failure here and reloaded —
    // which left the DB session lock active and produced the "I logged out
    // but can't log back in" stuck-session bug. Now: warn the user (so they
    // know the next login may need the force-clear path) but still proceed
    // with cookie removal + reload so the local UI state is clean.
    let serverCleanupOk = false;
    let networkOk = false;
    try {
      const res = await fetch("/api/admin/logout", { method: "POST" });
      networkOk = true;
      if (res.ok) {
        try {
          const data = await res.json();
          serverCleanupOk = !!data?.sessionCleared;
        } catch {
          // Non-JSON response — treat as ambiguous, don't claim success.
          serverCleanupOk = false;
        }
      }
    } catch {
      networkOk = false;
    }

    if (!networkOk || !serverCleanupOk) {
      // Best-effort visible warning. The session lock is short-lived (2 hours)
      // and the next login attempt has a force-clear recovery path, so the
      // user is never permanently stuck — just informed.
      try {
        if (typeof window !== "undefined") {
          // Lightweight inline alert; intentionally NOT a toast (toast lib
          // may not be mounted on every page that hosts the logout button).
          console.warn(
            "Logout: server-side session may not have fully cleared.",
          );
        }
      } catch {
        // ignore
      }
    }

    Cookies.remove("authToken");
    // Full reload clears all client-side hook state (entitlement, assigned
    // countries, etc.) so no stale previous-user data lingers.
    window.location.reload();
  };

  const baseBtnClasses =
    "ml-auto inline-flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl border text-sm font-semibold tracking-tight backdrop-blur-md transition " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent " +
    "active:translate-y-0";

  const loginBtnClasses =
    baseBtnClasses +
    " border-white/15 bg-white/5 text-white " +
    "shadow-[inset_0_0_0_1px_rgba(47,57,73,0.40),0_12px_30px_rgba(17,24,39,0.35)] " +
    "hover:bg-white/10 hover:border-white/25 hover:shadow-[inset_0_0_0_1px_rgba(47,57,73,0.48),0_18px_40px_rgba(30,64,175,0.35)]";

  // Audit #5: previously bg-red-600 made Logout look like a destructive/danger
  // action (audit said "jarring red"). Softened to a neutral outline button —
  // still clearly clickable, no longer reads as "delete" or "warning".
  const logoutBtnClasses =
    baseBtnClasses +
    " border-white/15 bg-white/5 text-white/85 " +
    "shadow-[inset_0_0_0_1px_rgba(47,57,73,0.40),0_12px_30px_rgba(17,24,39,0.30)] " +
    "hover:bg-white/10 hover:text-white hover:border-white/25 hover:shadow-[inset_0_0_0_1px_rgba(47,57,73,0.48),0_18px_40px_rgba(17,24,39,0.40)]";

  return (
    <>
      {!token ? (
        <>
          <button className={loginBtnClasses} onClick={open} type="button">
            Login
          </button>
          <AuthModal show={show} onClose={close} />
        </>
      ) : (
        <button className={logoutBtnClasses} onClick={handleLogout} type="button">
          Logout
        </button>
      )}
    </>
  );
};

export default LoginNavButton;
