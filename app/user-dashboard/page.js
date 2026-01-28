'use client'
import { useCurrentPlan } from '../hooks/useCurrentPlan';

export default function Dashboard() {
  const { planName, isValid, loading, error, email } = useCurrentPlan();

  if (loading) return <p>Loading your plan…</p>;
  if (error)   return <p>Error: {error}</p>;

  if (!planName) {
    return <p>You don’t have an active subscription.</p>;
  }

  return (
    <p>
      {email} Your current plan: <strong>{planName}</strong>
      {isValid
        ?` ${isValid}` 
        : ' — expired'}
    </p>
  );
}
