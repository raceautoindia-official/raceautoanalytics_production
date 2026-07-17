import db from "@/lib/db";
import transformPricing, {
  type PlanCard,
} from "@/components/subscription/transformPricing";

// Flash-report country access per plan (matches the entitlement limits).
const PLAN_COUNTRIES: Record<string, number> = {
  bronze: 1,
  silver: 4,
  gold: 5,
  platinum: 11,
};

export type PricingPlan = PlanCard & { countries: number };

// Server-side: read the CMS-managed plan table and shape it via the same
// transformPricing used by the subscribe modal, so the public /pricing page
// always matches the real plans. Returns [] on any DB error (page still renders).
export async function getPricingPlans(): Promise<PricingPlan[]> {
  try {
    const [rows]: any = await db.execute(
      `SELECT plan, bronze, silver, gold, platinum FROM subscription_plan_reference`,
    );
    const cards = transformPricing(Array.isArray(rows) ? rows : []);
    // Only surface plans that actually have a price configured.
    return cards
      .filter((c) => c.monthlyPrice > 0 || c.annualPrice > 0)
      .map((c) => ({ ...c, countries: PLAN_COUNTRIES[c.key] ?? 0 }));
  } catch (e) {
    console.error("getPricingPlans error:", e);
    return [];
  }
}

export function formatInr(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}
