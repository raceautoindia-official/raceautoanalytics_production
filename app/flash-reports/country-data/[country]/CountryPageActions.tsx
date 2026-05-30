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
      <Link
        href="/"
        className="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
      >
        Home
      </Link>
      <Link
        href={`/flash-reports?country=${encodeURIComponent(countrySlug)}`}
        className="inline-flex items-center rounded-xl border border-blue-300/40 bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-100 hover:bg-blue-500/30"
      >
        Go To {countryName} Flash Report
      </Link>
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center rounded-xl border border-white/20 bg-transparent px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
      >
        Back
      </button>
    </div>
  );
}
