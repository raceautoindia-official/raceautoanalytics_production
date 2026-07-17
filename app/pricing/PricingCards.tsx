"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import type { PricingPlan } from "@/lib/pricing";

// Inlined (not imported from lib/pricing) so this client bundle never pulls in
// the DB module chain.
function formatInr(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

// Indicative USD conversion. Billing is processed in INR; USD is shown for
// international buyers. Adjust the rate as needed.
const USD_RATE = 85;
function formatUsd(inr: number): string {
  return `$${Math.max(1, Math.round(inr / USD_RATE)).toLocaleString("en-US")}`;
}

const RECOMMENDED: PricingPlan["key"] = "silver";

// Clean, curated plan details (country counts match the real entitlement tiers).
const PLAN_META: Record<PricingPlan["key"], { tagline: string; features: string[] }> = {
  bronze: {
    tagline: "For an individual analyst tracking one market.",
    features: [
      "Monthly flash reports for 1 country",
      "OEM market share & segment performance",
      "EV & alternative-fuel trend signals",
      "Interactive web dashboard",
    ],
  },
  silver: {
    tagline: "For analysts covering multiple markets.",
    features: [
      "Everything in Individual Basic",
      "Flash reports for 4 countries",
      "6-month sales forecast",
      "Application & segment-level splits",
    ],
  },
  gold: {
    tagline: "For teams that need forecasts and depth.",
    features: [
      "Everything in Individual Pro",
      "Flash reports for 5 countries",
      "Full forecast tool + Build Your Forecast",
      "Team access & business features",
    ],
  },
  platinum: {
    tagline: "For enterprises that need the widest coverage.",
    features: [
      "Everything in Business",
      "Flash reports for 11 countries",
      "Priority support & analyst access",
      "PR, promotion & partnership options",
    ],
  },
};

export default function PricingCards({ plans }: { plans: PricingPlan[] }) {
  const [annual, setAnnual] = useState(true);
  const [usd, setUsd] = useState(false);

  const money = (inr: number) => (usd ? formatUsd(inr) : formatInr(inr));

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
            <span className="ml-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
              save ~30%
            </span>
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
          return (
            <div
              key={p.key}
              className={`relative flex flex-col rounded-2xl border p-6 shadow-[0_12px_40px_rgba(0,0,0,.45)] ${
                recommended
                  ? "border-blue-400/40 bg-[#0b1428]"
                  : "border-white/10 bg-[#0b141f]/70"
              }`}
            >
              {recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-bold tracking-tight text-white">
                {p.title}
              </h3>
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
                  <span className="text-sm text-white/50">
                    {" "}
                    /{annual ? "year" : "month"}
                  </span>
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

              {meta?.features?.length > 0 && (
                <ul className="mt-6 space-y-2.5 text-sm text-white/70">
                  {meta.features.map((f, i) => (
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
    </div>
  );
}
