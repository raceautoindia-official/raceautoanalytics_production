import { NextResponse } from "next/server";
import db from "@/lib/db";
import {
  getFlashCountry,
  resolveCountryMeta,
  flagFromIso2,
  regionLabel as regionLabelFor,
  type FlashRegionKey,
  type CountryStatus,
} from "@/lib/flashReportRegistry";

export const dynamic = "force-dynamic";

const normKey = (s: any) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

const titleCase = (s: string) =>
  s
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Legacy flag fallback — used ONLY when a hierarchy country is not yet in the
// registry. Registry countries get their flag from iso2 (flagFromIso2), so this
// map no longer needs new entries; new markets should be added to the registry.
const FLAG_MAP: Record<string, string> = {
  india: "🇮🇳",
  peru: "🇵🇪",
  usa: "🇺🇸",
  "united-states": "🇺🇸",
  chile: "🇨🇱",
  japan: "🇯🇵",
  germany: "🇩🇪",
  france: "🇫🇷",
  thailand: "🇹🇭",
  vietnam: "🇻🇳",
  pakistan: "🇵🇰",
  australia: "🇦🇺",
  "south-africa": "🇿🇦",
  colombia: "🇨🇴",
  brazil: "🇧🇷",
  sweden: "🇸🇪",
  russia: "🇷🇺",
  belgium: "🇧🇪",
};

type CountryOption = {
  // --- existing contract (unchanged) ---
  value: string;
  label: string;
  flag: string;
  // --- additive metadata (safe to ignore for existing consumers) ---
  iso2: string | null;
  region: FlashRegionKey | null;
  regionLabel: string | null;
  status: CountryStatus;
};

// Build a country option, enriching from the registry when the slug is known.
// Existing keys keep their exact prior values; only extra fields are added.
function makeOption(value: string, label: string): CountryOption {
  const rc = getFlashCountry(value); // explicit launch registry (for product status)
  // iso2 + region resolve for ANY country via the full ISO-3166 world dataset,
  // so a market like Czech Republic gets its flag + Europe region, not "Other".
  const meta = resolveCountryMeta(value);
  const iso2 = meta?.iso2 ?? null;
  const region = meta?.region ?? null;
  return {
    value,
    label,
    // Emoji flag kept for backward compatibility; the UI renders a real flag
    // image from `iso2` (emoji flags show as country codes on Windows).
    flag: iso2 ? flagFromIso2(iso2) : FLAG_MAP[value] || "🌍",
    iso2,
    region,
    regionLabel: region ? regionLabelFor(region) : null,
    // A country present in the hierarchy has data, so it is effectively live
    // even if the registry hasn't been updated with its metadata yet.
    status: rc?.status ?? "live",
  };
}

const INDIA_OPTION = makeOption("india", "India");

export async function GET() {
  try {
    const [rows] = await db.query(
      `SELECT id, parent_id, name FROM hierarchy_nodes`,
    );

    const nodes = Array.isArray(rows) ? (rows as any[]) : [];

    // main root
    const mainRoot =
      nodes.find(
        (n) =>
          (String(n.name || "").toLowerCase().trim() === "main root" ||
            String(n.name || "").toLowerCase().trim() === "mainroot") &&
          (n.parent_id == null || n.parent_id === 0),
      ) || null;

    if (!mainRoot) {
      return NextResponse.json([INDIA_OPTION]);
    }

    // flash-reports
    const flashReports =
      nodes.find(
        (n) =>
          String(n.parent_id) === String(mainRoot.id) &&
          (String(n.name || "").toLowerCase().trim() === "flash-reports" ||
            String(n.name || "").toLowerCase().trim() === "flashreports"),
      ) || null;

    if (!flashReports) {
      return NextResponse.json([INDIA_OPTION]);
    }

    // countries node under flash-reports
    const countriesNode =
      nodes.find(
        (n) =>
          String(n.parent_id) === String(flashReports.id) &&
          String(n.name || "").toLowerCase().trim() === "countries",
      ) || null;

    const countryChildren = countriesNode
      ? nodes.filter((n) => String(n.parent_id) === String(countriesNode.id))
      : [];

    // always include India first (India uses the old root flow)
    const out: CountryOption[] = [INDIA_OPTION];

    for (const c of countryChildren) {
      const raw = String(c.name || "").trim();
      if (!raw) continue;

      const value = normKey(raw); // url-safe key
      if (!value || value === "india") continue;

      out.push(makeOption(value, titleCase(raw)));
    }

    // sort non-india alphabetically
    const head = out[0];
    const tail = out
      .slice(1)
      .sort((a, b) => a.label.localeCompare(b.label, "en"));

    return NextResponse.json([head, ...tail]);
  } catch (e: any) {
    console.error("GET /api/flash-reports/countries error:", e);
    return NextResponse.json([INDIA_OPTION], { status: 200 });
  }
}
