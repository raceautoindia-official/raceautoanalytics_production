export type FeatureItem = {
  label: string;
};

export type PlanCard = {
  key: "silver" | "gold" | "platinum";
  title: string;
  monthlyPrice: number;
  annualPrice: number;
  features: FeatureItem[];
};

type RawPricingRow = {
  id?: number | string;
  plan?: string;
  silver?: string | number | null;
  gold?: string | number | null;
  platinum?: string | number | null;
  bronze?: string | number | null;
  [key: string]: any;
};

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const cleaned = String(value).replace(/,/g, "").trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeLabel(value: unknown): string {
  return toText(value).replace(/\s+/g, " ").trim();
}

function isHiddenRow(label: string) {
  const l = label.toLowerCase();

  return (
    l.includes("monthly price") ||
    l.includes("annual price") ||
    l === "usd" ||
    l === "multiplied_price" ||
    l === "multiplied price"
  );
}

function isFeatureEnabled(value: unknown) {
  const v = toText(value).toLowerCase();

  // Based on your current data pattern:
  // 1 and 3 behave like enabled/available rows
  // 2 behaves like hidden/not-for-this-tier
  if (v === "1" || v === "3") return true;

  // also support text flags if later used
  if (["yes", "true", "included", "active"].includes(v)) return true;

  return false;
}

function uniqueByLabel(items: FeatureItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function transformPricing(rows: RawPricingRow[] = []): PlanCard[] {
  const silverPlan: PlanCard = {
    key: "silver",
    title: "Silver",
    monthlyPrice: 0,
    annualPrice: 0,
    features: [],
  };

  const goldPlan: PlanCard = {
    key: "gold",
    title: "Gold",
    monthlyPrice: 0,
    annualPrice: 0,
    features: [],
  };

  const platinumPlan: PlanCard = {
    key: "platinum",
    title: "Platinum",
    monthlyPrice: 0,
    annualPrice: 0,
    features: [],
  };

  const silverOwn: FeatureItem[] = [];
  const goldRaw: FeatureItem[] = [];
  const platinumRaw: FeatureItem[] = [];

  for (const row of rows) {
    const label = normalizeLabel(row.plan);
    const lower = label.toLowerCase();

    if (!label) continue;

    // Pricing rows
    if (lower.includes("monthly")) {
      silverPlan.monthlyPrice = toNumber(row.silver);
      goldPlan.monthlyPrice = toNumber(row.gold);
      platinumPlan.monthlyPrice = toNumber(row.platinum);
      continue;
    }

    if (lower.includes("annual")) {
      silverPlan.annualPrice = toNumber(row.silver);
      goldPlan.annualPrice = toNumber(row.gold);
      platinumPlan.annualPrice = toNumber(row.platinum);
      continue;
    }

    // Ignore helper/meta rows
    if (isHiddenRow(label)) continue;

    // Build tier-wise enabled feature sets
    if (isFeatureEnabled(row.silver)) {
      silverOwn.push({ label });
    }

    if (isFeatureEnabled(row.gold)) {
      goldRaw.push({ label });
    }

    if (isFeatureEnabled(row.platinum)) {
      platinumRaw.push({ label });
    }
  }

  const silverLabels = new Set(
    silverOwn.map((item) => item.label.toLowerCase())
  );

  const goldOwn = goldRaw.filter(
    (item) =>
      !silverLabels.has(item.label.toLowerCase()) &&
      item.label.toLowerCase() !== "everything in silver plan"
  );

  const goldLabels = new Set([
    ...silverOwn.map((item) => item.label.toLowerCase()),
    ...goldOwn.map((item) => item.label.toLowerCase()),
  ]);

  const platinumOwn = platinumRaw.filter(
    (item) =>
      !goldLabels.has(item.label.toLowerCase()) &&
      item.label.toLowerCase() !== "everything in silver plan" &&
      item.label.toLowerCase() !== "everything in gold plan"
  );

  silverPlan.features = uniqueByLabel(silverOwn);

  goldPlan.features = uniqueByLabel([
    ...(silverOwn.length ? [{ label: "Everything in Silver Plan" }] : []),
    ...goldOwn,
  ]);

  platinumPlan.features = uniqueByLabel([
    ...(goldOwn.length || silverOwn.length
      ? [{ label: "Everything in Gold Plan" }]
      : []),
    ...platinumOwn,
  ]);

  return [silverPlan, goldPlan, platinumPlan];
}