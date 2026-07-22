"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type CountryPageActionsProps = {
  countrySlug: string;
  countryName: string;
};

export default function CountryPageActions({
  countrySlug,
  countryName,
}: CountryPageActionsProps) {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/flash-reports/overview");
  }

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center rounded-xl border border-white/20 bg-transparent px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
      >
        Back
      </button>
      <Link
        href={`/flash-reports?country=${encodeURIComponent(countrySlug)}`}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-orange-500/25 transition hover:from-amber-300 hover:via-orange-400 hover:to-orange-500 hover:shadow-orange-500/40"
      >
        Go To {countryName} Flash Report
        <span aria-hidden className="text-base leading-none">→</span>
      </Link>
    </div>
  );
}
