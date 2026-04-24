const PLAN_LABELS: Record<string, string> = {
  bronze: "Individual Basic",
  silver: "Individual Pro",
  gold: "Business",
  platinum: "Business Pro",
};

export function getPublicPlanLabel(plan: string | null | undefined): string {
  const normalized = String(plan || "").trim().toLowerCase();
  if (!normalized) return "";
  return PLAN_LABELS[normalized] || plan || "";
}

export function formatPlanLabelOrFallback(
  plan: string | null | undefined,
  fallback = "-",
): string {
  const label = getPublicPlanLabel(plan);
  return label || fallback;
}
