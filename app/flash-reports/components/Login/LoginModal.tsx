"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";

import LoginForm from "./LoginForm";
import Signup from "@/app/components/register/signup";

type Props = {
  open?: boolean;
  show?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;

  // UI control
  disableClose?: boolean; // if true: no X, no overlay close, no ESC
  embedded?: boolean; // if true: no overlay shell
};

export default function AuthModal({
  open,
  show,
  onClose,
  onSuccess,
  disableClose = false,
  embedded = false,
}: Props) {
  const visible = typeof open === "boolean" ? open : !!show;
  const pathname = usePathname();
  const [mode, setMode] = useState<"login" | "signup">("login");

  // Reset to login each time opens (pure UI behavior)
  useEffect(() => {
    if (visible) setMode("login");
  }, [visible]);

  // ESC close (only if allowed)
  useEffect(() => {
    if (!visible || disableClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, disableClose, onClose]);

  const title = useMemo(() => {
    if (pathname?.startsWith("/forecast")) return "Forecast Premium Access";
    if (pathname?.startsWith("/flash-reports")) return "Flash Reports Premium Access";
    return "RaceAutoAnalytics Premium";
  }, [pathname]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!visible || !mounted) return null;

  const Shell = ({ children }: { children: React.ReactNode }) => {
    if (embedded) return <>{children}</>;
    return (
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-[#050B1A]/80 backdrop-blur-[14px]"
          onClick={() => {
            if (!disableClose) onClose?.();
          }}
        />

        {/* Modal */}
        <div className="relative flex min-h-full items-start justify-center p-4 sm:items-center sm:p-6">
          <div className="relative my-4 w-full max-w-[400px] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[28px] border border-white/10 bg-[#0B1228] shadow-[0_30px_90px_rgba(0,0,0,0.85)] sm:my-0 sm:max-h-[calc(100vh-3rem)]">
            {children}
          </div>
        </div>
      </div>
    );
  };

  const modalContent = (
    <Shell>
      {/* subtle top glow */}
      <div className="pointer-events-none absolute -top-28 left-1/2 h-56 -translate-x-1/2 rounded-full bg-[#4F67FF]/18 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/8 to-transparent" />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-4 px-8 pt-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl " />
          <div></div>
        </div>

        {!disableClose && (
          <button
            type="button"
            onClick={() => onClose?.()}
            className="rounded-2xl border border-white/10 bg-white/5 p-2 text-[#EAF0FF]/80 transition hover:bg-white/10 hover:text-[#EAF0FF]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="relative px-8 pt-6">
        <div className="grid grid-cols-2 rounded-2xl border border-white/10 bg-white/5">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={[
              "h-8 rounded-xl text-sm font-semibold transition",
              mode === "login"
                ? "bg-[#4F67FF]/18 text-[#EAF0FF] border border-[#4F67FF]/30"
                : "text-[#EAF0FF]/70 hover:bg-white/5 hover:text-[#EAF0FF]",
            ].join(" ")}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => setMode("signup")}
            className={[
              "h-8 rounded-xl text-sm font-semibold transition",
              mode === "signup"
                ? "bg-[#4F67FF]/18 text-[#EAF0FF] border border-[#4F67FF]/30"
                : "text-[#EAF0FF]/70 hover:bg-white/5 hover:text-[#EAF0FF]",
            ].join(" ")}
          >
            Sign up
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="relative px-8 pb-8 pt-6">
        <div className="rounded-2xl border border-white/10 bg-[#0E1833]/70 p-6">
          {mode === "login" ? (
            <LoginForm
              onSuccess={() => {
                onSuccess?.();
                onClose?.();
              }}
            />
          ) : (
            <Signup
              onSuccess={() => {
                onSuccess?.();
                onClose?.();
              }}
            />
          )}
        </div>
      </div>
    </Shell>
  );

  return embedded ? modalContent : createPortal(modalContent, document.body);
}