"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  trialActive?: boolean;
  trialExpiresAt?: string | null;
};

const THRESHOLDS = [4, 3, 2, 1] as const;

type ReminderMinute = (typeof THRESHOLDS)[number];

function getEmailFromCookie(): string {
  if (typeof document === "undefined") return "";
  try {
    const match = document.cookie.match(/(?:^|;\s*)authToken=([^;]+)/);
    if (!match) return "";
    const token = decodeURIComponent(match[1]);
    const b64 = token.split(".")[1];
    if (!b64) return "";
    const json = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json);
    return String(payload?.email || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

function parseSeenMap(raw: string | null): Record<string, boolean> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export default function TrialCountdownReminder({
  trialActive,
  trialExpiresAt,
}: Props) {
  const router = useRouter();
  const [currentReminder, setCurrentReminder] = useState<ReminderMinute | null>(
    null,
  );
  // Audit FT-4: persistent "X:XX remaining" pill so the trial state is
  // always visible — previously the escalation toasts only fired at minute
  // boundaries and auto-hid after 7s, leaving long stretches with NO trial
  // indicator at all (which is what the audit complained about).
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trialKey = useMemo(() => {
    const email = getEmailFromCookie();
    return `${email || "anon"}:${String(trialExpiresAt || "")}`;
  }, [trialExpiresAt]);

  useEffect(() => {
    if (!trialActive || !trialExpiresAt) {
      setCurrentReminder(null);
      setRemainingMs(null);
      return;
    }

    const expiresAtMs = new Date(trialExpiresAt).getTime();
    if (!Number.isFinite(expiresAtMs)) return;

    const storageKey = `trial-reminders:${trialKey}`;

    const markShown = (minute: ReminderMinute) => {
      const seen = parseSeenMap(sessionStorage.getItem(storageKey));
      if (seen[String(minute)]) return false;
      seen[String(minute)] = true;
      sessionStorage.setItem(storageKey, JSON.stringify(seen));
      return true;
    };

    const triggerReminder = (minute: ReminderMinute) => {
      if (!markShown(minute)) return;
      setCurrentReminder(minute);

      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }

      // Keep final 1-minute reminder visible until user dismisses or trial expires.
      if (minute !== 1) {
        hideTimerRef.current = setTimeout(() => {
          setCurrentReminder((prev) => (prev === minute ? null : prev));
        }, 7000);
      }
    };

    const tick = () => {
      const remaining = expiresAtMs - Date.now();
      // Audit FT-4: keep the persistent pill in sync every tick.
      setRemainingMs(remaining > 0 ? remaining : 0);

      if (remaining <= 0) {
        setCurrentReminder(null);
        return;
      }

      const match = THRESHOLDS.find(
        (m) => remaining <= m * 60_000 && remaining > (m - 1) * 60_000,
      );
      if (!match) return;
      triggerReminder(match);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => {
      clearInterval(interval);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [trialActive, trialExpiresAt, trialKey]);

  // Audit FT-1: standardize user-visible naming on "One Time Access"
  // (matches the trial form / gate copy across the app). Internal prop names
  // (trialActive, trialExpiresAt) and the API path stay as-is — backend
  // contract is unchanged.
  const isFinalMinute = currentReminder === 1;
  const title = isFinalMinute
    ? "One Time Access Ending Soon"
    : currentReminder
      ? `${currentReminder} Minute${currentReminder > 1 ? "s" : ""} Remaining`
      : "";
  const body = isFinalMinute
    ? "Your One Time Access will expire in 1 minute. Subscribe now to continue uninterrupted access."
    : currentReminder
      ? `Your One Time Access will expire in ${currentReminder} minutes.`
      : "";

  // Format remaining time for the persistent pill: M:SS
  const persistentTimeLabel = (() => {
    if (!trialActive || remainingMs == null || remainingMs <= 0) return null;
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  })();

  // If neither the persistent pill nor a reminder toast should show, render nothing.
  if (!persistentTimeLabel && !currentReminder) return null;

  return (
    <>
      {/* Audit FT-4: persistent compact pill — always visible during the
          trial so users know exactly how much time they have left. Doesn't
          steal focus, doesn't auto-dismiss, low-noise. Sits above the
          escalation toast so both can coexist when a reminder fires. */}
      {persistentTimeLabel && (
        <div className="fixed bottom-4 left-4 z-[9996] inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-[#0B1228]/95 px-3 py-1.5 text-xs text-[#EAF0FF] shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <span
            className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse"
            aria-hidden="true"
          />
          <span className="text-[#EAF0FF]/75">One Time Access:</span>
          <span className="font-mono font-semibold tabular-nums text-amber-200">
            {persistentTimeLabel}
          </span>
          <button
            type="button"
            onClick={() => router.push("/subscription?source=trial-pill")}
            className="ml-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-[#7B93FF] hover:bg-white/5 transition"
          >
            Subscribe →
          </button>
        </div>
      )}

      {/* Existing escalation toast — fires at 4/3/2/1 min thresholds with
          stronger urgency styling. Coexists with the persistent pill. */}
      {currentReminder && (
        <div className="fixed bottom-4 right-4 z-[9997] w-[92vw] max-w-sm rounded-2xl border border-white/15 bg-[#0B1228]/95 p-4 text-[#EAF0FF] shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm font-semibold">{title}</div>
            <button
              type="button"
              onClick={() => setCurrentReminder(null)}
              className="text-xs text-[#EAF0FF]/60 transition hover:text-[#EAF0FF]"
              aria-label="Dismiss One Time Access reminder"
            >
              Dismiss
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#EAF0FF]/75">{body}</p>
          <button
            type="button"
            onClick={() => router.push("/subscription?source=trial-countdown")}
            className={[
              "mt-3 inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold transition",
              isFinalMinute
                ? "bg-[#4F67FF] text-white hover:bg-[#3B55FF]"
                : "border border-white/15 bg-white/10 text-[#EAF0FF] hover:bg-white/15",
            ].join(" ")}
          >
            View Subscription Plans
          </button>
        </div>
      )}
    </>
  );
}

