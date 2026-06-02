import Link from "next/link";

export default function PricingTeaser() {
  return (
    <section className="bg-[#060D1F] px-4 py-8 border-y border-white/5">
      <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-[#7B93FF] font-semibold">
            Subscription
          </div>
          <div className="mt-1 text-lg font-semibold text-white sm:text-xl">
            Flexible plans for individuals and businesses
          </div>
          <div className="mt-1 text-sm text-white/55">
            Monthly &amp; annual billing &middot; GST inclusive &middot; Country and
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
