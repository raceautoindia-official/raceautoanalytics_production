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
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // If the API call fails, still clear the cookie locally
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

  const logoutBtnClasses =
    baseBtnClasses +
    " border-white/20 bg-red-600 text-white " +
    "shadow-[inset_0_0_0_1px_rgba(47,57,73,0.35),0_14px_34px_rgba(220,38,38,0.35)] " +
    "hover:bg-red-500 hover:shadow-[inset_0_0_0_1px_rgba(47,57,73,0.45),0_20px_44px_rgba(220,38,38,0.45)]";

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
