import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";
import {
  fetchRaiForecastEntitlement,
  decodeJwtPayload,
} from "@/lib/internalSubscriptionFetch";

export const dynamic = "force-dynamic";

function getEmailFromCookie(): string | null {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("authToken")?.value;
    if (!token) return null;
    const payload = decodeJwtPayload(token);
    return payload?.email ? String(payload.email) : null;
  } catch {
    return null;
  }
}

/**
 * GET /api/forecast/user-regions
 * Returns the list of assigned Forecast region slots for the logged-in user.
 *
 * Shared-user inheritance:
 *   If the user has no own rows AND their entitlement shows accessType="shared"
 *   with a parentEmail, we return the plan owner's assigned regions.
 *   This allows shared users to access inherited region slots without self-assigning.
 *
 * Free users (no subscription) should not call this endpoint — they use
 * the legacy /api/user-country flow in forecast/page.js.
 */
export async function GET() {
  const email = getEmailFromCookie();
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // 1. Query own directly assigned regions first.
    const [ownRows] = await db.query(
      `SELECT id, region_name, slot_index, effective_plan_at_selection, access_type, source_owner_email, created_at
       FROM forecast_user_regions
       WHERE email = ?
       ORDER BY slot_index ASC`,
      [email],
    ) as any[];

    if (Array.isArray(ownRows) && ownRows.length > 0) {
      return NextResponse.json({ email, regions: ownRows });
    }

    // 2. No own rows — check if this is a shared user who should inherit from
    //    the plan owner's assigned regions.
    let parentEmail: string | null = null;
    try {
      const entitlement = await fetchRaiForecastEntitlement(email);
      if (
        entitlement.accessType === "shared" &&
        entitlement.parentEmail &&
        entitlement.isSubscribed &&
        entitlement.effectiveStatus === "active"
      ) {
        parentEmail = entitlement.parentEmail;
      }
    } catch {
      // Entitlement fetch failed — safe fallback: return empty.
    }

    if (!parentEmail) {
      return NextResponse.json({ email, regions: [] });
    }

    // 3. Return the plan owner's assigned regions as the inherited region list.
    const [parentRows] = await db.query(
      `SELECT id, region_name, slot_index, effective_plan_at_selection, access_type, source_owner_email, created_at
       FROM forecast_user_regions
       WHERE email = ?
       ORDER BY slot_index ASC`,
      [parentEmail],
    ) as any[];

    return NextResponse.json({
      email,
      regions: Array.isArray(parentRows) ? parentRows : [],
      inheritedFrom: parentEmail,
    });
  } catch (err: any) {
    console.error("GET /api/forecast/user-regions error:", err);
    return NextResponse.json(
      { error: "Failed to fetch user regions" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/forecast/user-regions
 * Body: { regions: string[] }  — array of region_name values to assign.
 *
 * Rules enforced server-side:
 * - User must be subscribed with an active plan
 * - Must be a direct (not shared) user — shared users cannot self-assign
 * - Cannot exceed plan's forecastRegionLimit
 * - Cannot re-assign a region already assigned
 * - Existing assigned regions are never removed
 */
export async function POST(req: Request) {
  const email = getEmailFromCookie();
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const incoming: string[] = Array.isArray(body?.regions) ? body.regions : [];
  if (!incoming.length) {
    return NextResponse.json(
      { error: "regions array is required and must not be empty" },
      { status: 400 },
    );
  }

  const cleaned = incoming
    .map((r) => String(r || "").trim())
    .filter(Boolean);
  if (!cleaned.length) {
    return NextResponse.json(
      { error: "No valid region names provided" },
      { status: 400 },
    );
  }

  try {
    const entitlement = await fetchRaiForecastEntitlement(email);

    if (!entitlement.isSubscribed || entitlement.effectiveStatus !== "active") {
      return NextResponse.json(
        { error: "Active subscription required to assign Forecast regions" },
        { status: 403 },
      );
    }

    if (entitlement.accessType === "shared") {
      return NextResponse.json(
        { error: "Shared users cannot self-assign regions. Contact your plan owner." },
        { status: 403 },
      );
    }

    const limit = entitlement.forecastRegionLimit;
    if (limit === 0) {
      return NextResponse.json(
        { error: "Your plan does not include Forecast region slots" },
        { status: 403 },
      );
    }

    // Get already-assigned regions
    const [existingRows] = await db.query(
      `SELECT region_name, slot_index FROM forecast_user_regions WHERE email = ? ORDER BY slot_index ASC`,
      [email],
    ) as any[];

    const existing = existingRows as Array<{ region_name: string; slot_index: number }>;
    const existingRegionNames = new Set(existing.map((r) => r.region_name));
    const usedSlots = existing.length;
    const remainingSlots = limit - usedSlots;

    if (remainingSlots <= 0) {
      return NextResponse.json(
        { error: "All your Forecast region slots are already filled" },
        { status: 403 },
      );
    }

    const toAdd = cleaned.filter((r) => !existingRegionNames.has(r));
    if (!toAdd.length) {
      return NextResponse.json(
        { error: "All provided regions are already assigned" },
        { status: 409 },
      );
    }

    if (toAdd.length > remainingSlots) {
      return NextResponse.json(
        {
          error: `You can only add ${remainingSlots} more region slot(s). You tried to add ${toAdd.length}.`,
        },
        { status: 403 },
      );
    }

    // Insert new slots
    let nextSlotIndex = usedSlots;
    for (const regionName of toAdd) {
      await db.execute(
        `INSERT IGNORE INTO forecast_user_regions
           (email, region_name, slot_index, effective_plan_at_selection, access_type, source_owner_email)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          email,
          regionName,
          nextSlotIndex,
          entitlement.effectivePlan ?? null,
          entitlement.accessType ?? null,
          entitlement.parentEmail ?? null,
        ],
      );
      nextSlotIndex++;
    }

    // Return refreshed list
    const [updatedRows] = await db.query(
      `SELECT id, region_name, slot_index, effective_plan_at_selection, access_type, source_owner_email, created_at
       FROM forecast_user_regions
       WHERE email = ?
       ORDER BY slot_index ASC`,
      [email],
    );

    return NextResponse.json({ email, regions: updatedRows, added: toAdd });
  } catch (err: any) {
    console.error("POST /api/forecast/user-regions error:", err);
    return NextResponse.json(
      { error: "Failed to assign regions" },
      { status: 500 },
    );
  }
}
