"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import type { PricingPlan } from "@/lib/pricing";
// Shared currency helpers (no DB deps) so /pricing and the subscription modal
// always show the SAME amount for a plan — same USD rate, same rounding.
import { formatUsdFromInr, formatInrCurrency } from "@/lib/currency";

const RECOMMENDED: PricingPlan["key"] = "silver";

// Per-plan tagline only. Feature bullets come from the SAME CMS rows the
// subscription page uses (plan.features) so the two surfaces never disagree;
// FALLBACK_FEATURES is used only if a plan has no CMS feature rows at all, so
// a card is never rendered empty.
const PLAN_META: Record<
  PricingPlan["key"],
  { tagline: string; fallbackFeatures: string[] }
> = {
  bronze: {
    tagline: "For an individual analyst tracking one market.",
    fallbackFeatures: [
      "Monthly flash reports for 1 country",
      "OEM segment share & segment performance",
      "EV & alternative-fuel trend signals",
      "Interactive web dashboard",
    ],
  },
  silver: {
    tagline: "For analysts covering multiple markets.",
    fallbackFeatures: [
      "Everything in Individual Basic Plan",
      "Flash reports for 4 countries",
      "6-month sales forecast",
      "Application & segment-level splits",
    ],
  },
  gold: {
    tagline: "For teams that need forecasts and depth.",
    fallbackFeatures: [
      "Everything in Individual Pro Plan",
      "Flash reports for 5 countries",
      "Full forecast tool + Build Your Forecast",
      "Team access & business features",
    ],
  },
  platinum: {
    tagline: "For enterprises that need the widest coverage.",
    fallbackFeatures: [
      "Everything in Business Plan",
      "Flash reports for 11 countries",
      "Priority support & analyst access",
      "PR, promotion & partnership options",
    ],
  },
};

// Same badge wording as the subscription page (minus the logged-in
// Current/Included/Upgrade states, which /pricing has no entitlement data for).
function getPlanBadge(key: PricingPlan["key"]) {
  if (key === "bronze")
    return { text: "Starter", className: "bg-amber-500/15 text-amber-300" };
  if (key === "platinum")
    return { text: "Premium", className: "bg-pink-500/15 text-pink-300" };
  return { text: "Best Choice", className: "bg-white/10 text-white/75" };
}

export default function PricingCards({ plans }: { plans: PricingPlan[] }) {
  // Default to MONTHLY to match the subscription page — previously this
  // defaulted to annual, so the same plan appeared to change price when a
  // user clicked through from /pricing to /subscription.
  const [annual, setAnnual] = useState(false);
  const [usd, setUsd] = useState(false);

  const money = (inr: number) =>
    usd ? formatUsdFromInr(inr) : formatInrCurrency(inr);

  // Real annual savings derived from actual prices (the subscription page does
  // the same). Replaces a hardcoded "save ~30%" that nothing verified.
  const savePct = (() => {
    const ref =
      plans.find(
        (p) => p.key === RECOMMENDED && p.monthlyPrice > 0 && p.annualPrice > 0,
      ) || plans.find((p) => p.monthlyPrice > 0 && p.annualPrice > 0);
    if (!ref) return 0;
    const yearly = ref.monthlyPrice * 12;
    if (ref.annualPrice >= yearly) return 0;
    return Math.round(((yearly - ref.annualPrice) / yearly) * 100);
  })();

  return (
    <div>
      {/* Toggles */}
      <div className="mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
        {/* Billing */}
        <div className="flex items-center gap-3">
          <span className={annual ? "text-white/50" : "font-semibold text-white"}>
            Monthly
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={annual}
            onClick={() => setAnnual((v) => !v)}
            className={`relative h-7 w-12 rounded-full border border-white/15 transition ${
              annual ? "bg-blue-600" : "bg-white/10"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                annual ? "left-6" : "left-0.5"
              }`}
            />
          </button>
          <span className={annual ? "font-semibold text-white" : "text-white/50"}>
            Annual
            {savePct > 0 && (
              <span className="ml-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                Save {savePct}%
              </span>
            )}
          </span>
        </div>

        {/* Currency */}
        <div className="inline-flex rounded-xl border border-white/15 bg-white/5 p-0.5 text-sm">
          <button
            type="button"
            onClick={() => setUsd(false)}
            className={`rounded-lg px-3 py-1 font-semibold transition ${
              !usd ? "bg-white/15 text-white" : "text-white/55 hover:text-white/80"
            }`}
          >
            ₹ INR
          </button>
          <button
            type="button"
            onClick={() => setUsd(true)}
            className={`rounded-lg px-3 py-1 font-semibold transition ${
              usd ? "bg-white/15 text-white" : "text-white/55 hover:text-white/80"
            }`}
          >
            $ USD
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const price = annual ? p.annualPrice : p.monthlyPrice;
          const recommended = p.key === RECOMMENDED;
          const meta = PLAN_META[p.key];
          const badge = getPlanBadge(p.key);
          // CMS-driven bullets (same rows the subscription page renders).
          // Falls back to curated copy only if the CMS has no feature rows.
          const features = p.features?.length
            ? p.features.map((f) => f.label)
            : meta.fallbackFeatures;
          return (
            <div
              key={p.key}
              className={`relative flex flex-col rounded-2xl border p-6 shadow-[0_12px_40px_rgba(0,0,0,.45)] ${
                recommended
                  ? "border-blue-400/40 bg-[#0b1428]"
                  : "border-white/10 bg-[#0b141f]/70"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-bold tracking-tight text-white">
                  {p.title}
                </h3>
                {/* Same badge wording as the subscription page. */}
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${badge.className}`}
                >
                  {badge.text}
                </span>
              </div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-blue-300/80">
                {p.countries} {p.countries === 1 ? "country" : "countries"}
              </div>
              {meta?.tagline && (
                <p className="mt-2 text-xs leading-5 text-white/55">
                  {meta.tagline}
                </p>
              )}

              <div className="mt-4">
                <span className="text-3xl font-extrabold tracking-tight text-white">
                  {price > 0 ? money(price) : "Custom"}
                </span>
                {price > 0 && (
                  // Wording matches the subscription page, including the
                  // GST-inclusive note (the old footer claimed GST was extra).
                  <div className="mt-1 text-sm text-white/60">
                    per {annual ? "year" : "month"}
                    <span className="ml-1 text-[11px] text-white/45">
                      · incl. GST
                    </span>
                  </div>
                )}
                {usd && price > 0 && (
                  <div className="mt-1 text-[11px] text-white/40">
                    ≈ indicative · billed in INR
                  </div>
                )}
              </div>

              <Link
                href="/subscription"
                className={`mt-5 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  recommended
                    ? "bg-blue-600 text-white hover:bg-blue-500"
                    : "border border-white/15 bg-white/5 text-white/90 hover:bg-white/10"
                }`}
              >
                Get started
              </Link>

              {features.length > 0 && (
                <ul className="mt-6 space-y-2.5 text-sm text-white/70">
                  {features.map((f, i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom / Enterprise — the subscription page offers this as a card;
          /pricing previously had no equivalent at all. */}
      <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,.45)] sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold tracking-tight text-white">
              Custom Plan
            </h3>
            <span className="rounded-full bg-blue-500/15 px-3 py-1 text-[11px] font-semibold text-blue-300">
              Enterprise
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
            Need a tailored solution for your business? Custom seats, multi-team
            access, tailored regional combinations, and enterprise onboarding
            support.
          </p>
        </div>
        <Link
          href="/subscription"
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10"
        >
          Contact Sales Team
        </Link>
      </div>
    </div>
  );
}
