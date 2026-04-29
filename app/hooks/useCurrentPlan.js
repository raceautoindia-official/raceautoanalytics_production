import { useState, useEffect } from 'react';
import { getPublicPlanLabel } from '@/lib/planLabels';

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

    const email = payload.email;
    const url   = `/api/my-plan?email=${email}`;
    setEmail(email);

    fetch(url, {
      credentials: 'include',    // send cookies along
    })
      .then((res) => {
        // 404 = upstream has no subscription row for this email (free user).
        // Treat as "no plan" instead of an error so consumers don't surface noise.
        if (res.status === 404) return [];
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        // data is an array of subscriptions
        const parseDateMs = (value) => {
          const raw = String(value ?? "").trim();
          if (!raw) return null;
          const ms = new Date(raw).getTime();
          return Number.isFinite(ms) ? ms : null;
        };

        const active = data.find(
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
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { planName, isValid, loading, error, email };
}
