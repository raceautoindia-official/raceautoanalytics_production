import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/flash-reports/segment-countries?segment=two-wheeler
 *
 * Returns the country slugs that actually have data for one segment:
 *   { segment: "two-wheeler", countries: ["india", "brazil", ...] }
 *
 * Why this exists: every country node in the CMS is created with the FULL set
 * of segment children (Australia has two-wheeler, tractor, truck… all ten),
 * so a segment's presence in the tree says nothing about whether it has data.
 * Availability is only real if some volume_data row hangs off that subtree.
 *
 * Used by the country selector on a segment page so countries without data for
 * that segment are not offered — previously switching to one left the user on
 * a page reading "0 units" with every metric dashed out.
 */

const SEGMENT_NODE_NAMES: Record<string, string[]> = {
  "two-wheeler": ["two-wheeler", "two wheeler", "2w"],
  "three-wheeler": ["three wheeler", "three-wheeler", "3w"],
  "passenger-vehicles": ["passenger vehicle", "passenger vehicles", "pv"],
  "commercial-vehicles": ["commercial vehicle", "commercial vehicles", "cv"],
  "commercial-vehicles/trucks": ["truck", "trucks"],
  "commercial-vehicles/buses": ["bus", "buses"],
  tractor: ["tractor"],
  "construction-equipment": [
    "construction equipment",
    "construction-equipment",
    "ce",
  ],
  "overall-automotive-industry": ["overall"],
};

const norm = (s: unknown) => String(s || "").toLowerCase().trim();
const slugify = (s: unknown) =>
  norm(s)
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

export async function GET(req: Request) {
  const segment = String(
    new URL(req.url).searchParams.get("segment") || "",
  ).trim();
  const names = SEGMENT_NODE_NAMES[segment];

  if (!names) {
    return NextResponse.json(
      { error: "Unknown segment", segment, countries: [] },
      { status: 400 },
    );
  }

  try {
    const [nodeRows] = await db.query(
      `SELECT id, parent_id, name FROM hierarchy_nodes`,
    );
    const nodes = Array.isArray(nodeRows) ? (nodeRows as any[]) : [];
    const childrenOf = new Map<string, any[]>();
    for (const n of nodes) {
      const k = String(n.parent_id);
      if (!childrenOf.has(k)) childrenOf.set(k, []);
      childrenOf.get(k)!.push(n);
    }
    const kids = (id: any) => childrenOf.get(String(id)) || [];

    // Node ids that some volume_data row actually hangs off.
    const [vdRows] = await db.query(`SELECT stream, data FROM volume_data`);
    const withData = new Set<string>();
    for (const r of (Array.isArray(vdRows) ? vdRows : []) as any[]) {
      // Ignore rows whose payload is empty — a row with no values is a
      // placeholder, not coverage.
      let d: any = r?.data;
      if (typeof d === "string") {
        try {
          d = JSON.parse(d);
        } catch {
          d = null;
        }
      }
      const inner = d && typeof d === "object" ? (d.data ?? d) : null;
      if (!inner || typeof inner !== "object" || !Object.keys(inner).length) {
        continue;
      }
      for (const part of String(r?.stream || "").split(",")) {
        const v = part.trim();
        if (v) withData.add(v);
      }
    }

    const root = nodes.find(
      (n) =>
        (norm(n.name) === "main root" || norm(n.name) === "mainroot") &&
        (n.parent_id == null || n.parent_id === 0),
    );
    const flash = root
      ? kids(root.id).find((n) => norm(n.name).startsWith("flash"))
      : null;
    if (!flash) return NextResponse.json({ segment, countries: [] });

    const countriesNode = kids(flash.id).find(
      (n) => norm(n.name) === "countries",
    );

    /** True when any node under this segment subtree carries data. */
    const subtreeHasData = (segmentNode: any) => {
      const stack = [segmentNode.id];
      const seen = new Set<string>();
      while (stack.length) {
        const cur = stack.pop();
        const key = String(cur);
        if (seen.has(key)) continue;
        seen.add(key);
        if (withData.has(key)) return true;
        for (const k of kids(cur)) stack.push(k.id);
      }
      return false;
    };

    const matchesSegment = (n: any) => {
      const nn = norm(n.name);
      return names.some((want) => nn === want);
    };

    const available: string[] = [];

    // India is the default market: its segments sit directly under
    // flash-reports rather than under countries/<slug>.
    const indiaSegment = kids(flash.id).find(matchesSegment);
    if (indiaSegment && subtreeHasData(indiaSegment)) available.push("india");

    if (countriesNode) {
      for (const country of kids(countriesNode.id)) {
        const slug = slugify(country.name);
        if (!slug || slug === "india") continue;
        const segNode = kids(country.id).find(matchesSegment);
        if (segNode && subtreeHasData(segNode)) available.push(slug);
      }
    }

    return NextResponse.json(
      { segment, countries: Array.from(new Set(available)) },
      { headers: { "Cache-Control": "public, max-age=300" } },
    );
  } catch (e) {
    console.error("segment-countries error:", e);
    // Fail open: an empty list would wrongly hide every country.
    return NextResponse.json({ segment, countries: null });
  }
}
