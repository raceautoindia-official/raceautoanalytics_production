"use client";

// Audit I-2: a small "Plans starting from ₹X/month" teaser block for the
// homepage so first-time visitors see a price range without having to click
// into /subscription. Auto-fetches the cheapest plan from the same upstream
// pricing source the SubscriptionModal uses, so the displayed price never
// goes stale relative to the subscription page.
//
// Failure-safe: if the upstream is slow or returns garbage, the component
// falls back to a generic "View pricing" link with no price — never blocks
// the homepage render.

import { useEffect, useState } from "react";
import Link from "next/link";

type RawPricingRow = {
  plan?: string;
  silver?: string | number | null;
  gold?: string | number | null;
  platinum?: string | number | null;
  bronze?: string | number | null;
  [key: string]: any;
};

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export default function PricingTeaser() {
  const [cheapest, setCheapest] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          "https://raceautoindia.com/api/subscription",
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("upstream not ok");
        const rows = (await res.json()) as RawPricingRow[];

        // Find the row that holds monthly prices (matches transformPricing.ts)
        const monthlyRow = (Array.isArray(rows) ? rows : []).find((r) =>
          String(r?.plan || "").toLowerCase().includes("monthly"),
        );

        if (!monthlyRow) throw new Error("no monthly row");

        const candidates = [
          toNum(monthlyRow.bronze),
          toNum(monthlyRow.silver),
          toNum(monthlyRow.gold),
          toNum(monthlyRow.platinum),
        ].filter((n) => n > 0);

        if (!candidates.length) throw new Error("no valid prices");

        const min = Math.min(...candidates);
        if (!cancelled) setCheapest(min);
      } catch {
        // Silent fallback — teaser still renders without a price.
        if (!cancelled) setCheapest(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bg-[#060D1F] px-4 py-8 border-y border-white/5">
      <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-[#7B93FF] font-semibold">
            Subscription
          </div>
          <div className="mt-1 text-lg font-semibold text-white sm:text-xl">
            {loading
              ? "Loading pricing…"
              : cheapest
                ? `Plans starting from ₹${Number(cheapest).toLocaleString("en-IN")}/month`
                : "Flexible plans for individuals and businesses"}
          </div>
          <div className="mt-1 text-sm text-white/55">
            Monthly &amp; annual billing · GST inclusive · Country and
            multi-region access tiers available.
          </div>
        </div>
        <Link
          href="/subscription"
          className="inline-flex h-11 items-center rounded-xl bg-[#4F67FF] px-5 text-sm font-semibold text-white transition hover:bg-[#3B55FF] shadow-[0_8px_24px_rgba(79,103,255,0.25)]"
        >
          View pricing &amp; plans
        </Link>
      </div>
    </section>
  );
}
