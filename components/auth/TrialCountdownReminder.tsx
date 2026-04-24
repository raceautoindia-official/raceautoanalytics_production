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
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trialKey = useMemo(() => {
    const email = getEmailFromCookie();
    return `${email || "anon"}:${String(trialExpiresAt || "")}`;
  }, [trialExpiresAt]);

  useEffect(() => {
    if (!trialActive || !trialExpiresAt) {
      setCurrentReminder(null);
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
      const remainingMs = expiresAtMs - Date.now();
      if (remainingMs <= 0) {
        setCurrentReminder(null);
        return;
      }

      const match = THRESHOLDS.find(
        (m) => remainingMs <= m * 60_000 && remainingMs > (m - 1) * 60_000,
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

  if (!currentReminder) return null;

  const isFinalMinute = currentReminder === 1;
  const title = isFinalMinute
    ? "Trial Ending Soon"
    : `${currentReminder} Minute${currentReminder > 1 ? "s" : ""} Remaining`;
  const body = isFinalMinute
    ? "Your trial access will expire in 1 minute. Want to extend your access? Subscribe now to continue uninterrupted access."
    : `Your trial access will expire in ${currentReminder} minutes.`;

  return (
    <div className="fixed bottom-4 right-4 z-[9997] w-[92vw] max-w-sm rounded-2xl border border-white/15 bg-[#0B1228]/95 p-4 text-[#EAF0FF] shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold">{title}</div>
        <button
          type="button"
          onClick={() => setCurrentReminder(null)}
          className="text-xs text-[#EAF0FF]/60 transition hover:text-[#EAF0FF]"
          aria-label="Dismiss trial reminder"
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
  );
}

