import { NextResponse } from "next/server";
import db from "@/lib/db";

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
};

export async function GET() {
  try {
    const [rows] = await db.query(
      `SELECT id, parent_id, name FROM hierarchy_nodes`,
    );

    const nodes = Array.isArray(rows) ? (rows as any[]) : [];

    const findByName = (nameKey: string, parentId?: any) =>
      nodes.find((n) => {
        const sameName =
          String(n.name || "").toLowerCase().trim() === nameKey ||
          String(n.name || "").toLowerCase().trim() === nameKey.replace("-", " ");
        const sameParent =
          parentId == null ? true : String(n.parent_id) === String(parentId);
        return sameName && sameParent;
      }) || null;

    // main root
    const mainRoot =
      nodes.find(
        (n) =>
          (String(n.name || "").toLowerCase().trim() === "main root" ||
            String(n.name || "").toLowerCase().trim() === "mainroot") &&
          (n.parent_id == null || n.parent_id === 0),
      ) || null;

    if (!mainRoot) {
      return NextResponse.json([{ value: "india", label: "India", flag: "🇮🇳" }]);
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
      return NextResponse.json([{ value: "india", label: "India", flag: "🇮🇳" }]);
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
    const out: Array<{ value: string; label: string; flag: string }> = [
      { value: "india", label: "India", flag: "🇮🇳" },
    ];

    for (const c of countryChildren) {
      const raw = String(c.name || "").trim();
      if (!raw) continue;

      const value = normKey(raw); // url-safe key
      if (!value || value === "india") continue;

      out.push({
        value,
        label: titleCase(raw),
        flag: FLAG_MAP[value] || "🌍",
      });
    }

    // sort non-india alphabetically
    const head = out[0];
    const tail = out
      .slice(1)
      .sort((a, b) => a.label.localeCompare(b.label, "en"));

    return NextResponse.json([head, ...tail]);
  } catch (e: any) {
    console.error("GET /api/flash-reports/countries error:", e);
    return NextResponse.json(
      [{ value: "india", label: "India", flag: "🇮🇳" }],
      { status: 200 },
    );
  }
}