import { useState, useEffect } from 'react';

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
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        // data is an array of subscriptions
        const active = data.find((s) => s.status === 'Active');
        if (active) {
          setPlanName(active.plan_name);
          setIsValid(active.status);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { planName, isValid, loading, error, email };
}
