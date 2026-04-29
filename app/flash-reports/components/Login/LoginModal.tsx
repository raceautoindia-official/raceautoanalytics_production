"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import dynamic from "next/dynamic";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import LoginForm from "./LoginForm";
const Signup = dynamic(() => import("@/app/components/register/signup"), {
  ssr: false,
});

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
          <div className="relative my-4 w-full max-w-[560px] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[24px] border border-white/10 bg-[#0B1228] shadow-[0_30px_90px_rgba(0,0,0,0.85)] sm:my-0 sm:max-h-[calc(100vh-3rem)] sm:rounded-[28px]">
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
      <div className="relative flex items-start justify-between gap-4 px-4 pt-3 sm:px-6 lg:px-8">
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
      <div className="relative px-4 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pt-6">
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
      <div className="relative px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5 lg:px-8 lg:pb-8 lg:pt-6">
        <div className="rounded-2xl border border-white/10 bg-[#0E1833]/70 p-4 sm:p-6">
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
              onSwitchToLogin={() => setMode("login")}
            />
          )}
        </div>
      </div>
      <ToastContainer
        position="top-right"
        // Audit PO-2: previously 3500ms — too short for users to read error
        // messages. Bumped to 6000ms to match typical UX guidance for error
        // toasts. Success/info still readable comfortably at this duration.
        autoClose={6000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="dark"
      />
    </Shell>
  );

  return embedded ? modalContent : createPortal(modalContent, document.body);
}
