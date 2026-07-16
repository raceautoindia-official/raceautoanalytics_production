import { useState, useEffect, useRef } from 'react';
import { getPublicPlanLabel } from '@/lib/planLabels';
import { SUBSCRIPTION_CHANGED_EVENT } from '@/lib/subscriptionEvents';

// Helper to read a named cookie
function getCookie(name) {
  const match = document.cookie.match(
    new RegExp('(^| )' + name + '=([^;]+)')
  );
  return match ? match[2] : null;
}

// Helper to decode JWT payload (no signature check)
function decodeJwt(token) {
  try {
    const b64 = token.split('.')[1];
    const json = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function useCurrentPlan() {
  const [planName, setPlanName] = useState(null);
  const [isValid, setIsValid]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [email, setEmail] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  // First load shows `loading`; focus/poll refetches update silently.
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const token = getCookie('authToken');
    if (!token) {
      setError('No authToken cookie');
      setLoading(false);
      return;
    }

    const payload = decodeJwt(token);
    if (!payload?.email) {
      setError('Invalid JWT payload');
      setLoading(false);
      return;
    }

    const userEmail = payload.email;
    const url   = `/api/my-plan?email=${userEmail}`;
    setEmail(userEmail);

    let cancelled = false;
    if (!hasLoadedRef.current) setLoading(true);

    fetch(url, {
      credentials: 'include',    // send cookies along
      cache: 'no-store',         // always read the current plan, never cached
    })
      .then((res) => {
        // 404 = upstream has no subscription row for this email (free user).
        // Treat as "no plan" instead of an error so consumers don't surface noise.
        if (res.status === 404) return [];
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        // data is an array of subscriptions
        const parseDateMs = (value) => {
          const raw = String(value ?? "").trim();
          if (!raw) return null;
          const ms = new Date(raw).getTime();
          return Number.isFinite(ms) ? ms : null;
        };

        const list = Array.isArray(data) ? data : [];
        const active = list.find(
          (s) => {
            const status = String(s?.status || "").trim().toLowerCase();
            if (status !== "active") return false;
            const endMs = parseDateMs(s?.end_date ?? s?.endDate);
            if (endMs == null) return false;
            return endMs >= Date.now();
          },
        );
        if (active) {
          setPlanName(getPublicPlanLabel(active.plan_name) || active.plan_name);
          setIsValid(active.status);
          setError(null);
        } else {
          // No active plan (cancelled/expired/downgraded upstream) — clear any
          // previously shown plan so a refetch reflects the change.
          setPlanName(null);
          setIsValid(false);
        }
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => {
        if (!cancelled) {
          hasLoadedRef.current = true;
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [refreshTick]);

  // Keep the plan fresh site-wide without a manual reload: silently refetch on
  // tab focus / visibility and every 90s while visible (mirrors the entitlement
  // hooks), so admin plan/window changes in Race Auto India reflect quickly.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const bump = () => setRefreshTick((t) => t + 1);
    const onVisible = () => {
      if (document.visibilityState === "visible") bump();
    };

    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", onVisible);
    // Refresh instantly after an in-app purchase/change in this browser.
    window.addEventListener(SUBSCRIPTION_CHANGED_EVENT, bump);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") bump();
    }, 90_000);

    return () => {
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(SUBSCRIPTION_CHANGED_EVENT, bump);
      window.clearInterval(interval);
    };
  }, []);

  return { planName, isValid, loading, error, email };
}
