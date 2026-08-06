// Shared USD/INR display conversion.
//
// Single source of truth so the public /pricing page and the subscription
// modal always show the SAME amount for a given plan. Billing is ALWAYS
// processed in INR; USD is an indicative display for international buyers.
//
// No DB / server imports here — this file is safe to pull into client bundles.

export const USD_RATE = 90.2;

/** Indicative USD, formatted like the subscription modal: 2 decimals under
 *  $100, whole dollars at/above $100 (e.g. ₹1499 -> "$16.62", ₹17600 -> "$195"). */
export function formatUsdFromInr(inr: number): string {
  if (!inr || inr <= 0) return "$0";
  const converted = inr / USD_RATE;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: converted >= 100 ? 0 : 2,
  }).format(converted);
}

/** INR, whole rupees with Indian grouping (e.g. 1499 -> "₹1,499"). */
export function formatInrCurrency(inr: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(inr)));
}
