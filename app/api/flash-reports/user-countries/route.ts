import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";
import {
  fetchRaiFlashEntitlement,
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
 * GET /api/flash-reports/user-countries
 * Returns the list of countries accessible to the logged-in user as Flash
 * Report country slots.
 *
 * Shared-user inheritance:
 *   If the user has no own rows AND their entitlement shows accessType="shared"
 *   with a parentEmail, we return the parent owner's assigned countries.
 *   This allows shared users to access inherited country slots without
 *   self-assigning.
 */
export async function GET() {
  const email = getEmailFromCookie();
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // 1. Query the user's own directly assigned countries first.
    const [ownRows] = await db.query(
      `SELECT id, country_id, slot_index, effective_plan_at_selection, access_type, source_owner_email, created_at
       FROM flash_report_user_countries
       WHERE email = ?
       ORDER BY slot_index ASC`,
      [email],
    ) as any[];

    if (Array.isArray(ownRows) && ownRows.length > 0) {
      // Direct user or shared user who already has own rows — return as-is.
      return NextResponse.json({ email, countries: ownRows });
    }

    // 2. No own rows — check if this is a shared user who should inherit from
    //    the plan owner's assigned countries.
    let parentEmail: string | null = null;
    try {
      const entitlement = await fetchRaiFlashEntitlement(email);
      if (
        entitlement.accessType === "shared" &&
        entitlement.parentEmail &&
        entitlement.isSubscribed &&
        entitlement.effectiveStatus === "active"
      ) {
        parentEmail = entitlement.parentEmail;
      }
    } catch {
      // Entitlement fetch failed — safe fallback: return empty, do not block.
    }

    if (!parentEmail) {
      // Not a shared user or entitlement unavailable — return empty.
      return NextResponse.json({ email, countries: [] });
    }

    // 3. Return the plan owner's assigned countries as the inherited country list.
    const [parentRows] = await db.query(
      `SELECT id, country_id, slot_index, effective_plan_at_selection, access_type, source_owner_email, created_at
       FROM flash_report_user_countries
       WHERE email = ?
       ORDER BY slot_index ASC`,
      [parentEmail],
    ) as any[];

    return NextResponse.json({
      email,
      countries: Array.isArray(parentRows) ? parentRows : [],
      inheritedFrom: parentEmail,
    });
  } catch (err: any) {
    console.error("GET /api/flash-reports/user-countries error:", err);
    return NextResponse.json(
      { error: "Failed to fetch user countries" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/flash-reports/user-countries
 * Body: { countries: string[] }  — array of country_id values to assign.
 *
 * Rules enforced server-side:
 * - User must be subscribed (entitlement check via Race Auto India internal API)
 * - Cannot exceed plan's flashReportCountryLimit
 * - Cannot re-assign a country that is already assigned
 * - Cannot exceed remaining slot count
 * - Existing assigned countries are never removed
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

  const incoming: string[] = Array.isArray(body?.countries) ? body.countries : [];
  if (!incoming.length) {
    return NextResponse.json(
      { error: "countries array is required and must not be empty" },
      { status: 400 },
    );
  }

  // Validate each country_id is a non-empty string
  const cleaned = incoming
    .map((c) => String(c || "").toLowerCase().trim())
    .filter(Boolean);
  if (!cleaned.length) {
    return NextResponse.json(
      { error: "No valid country IDs provided" },
      { status: 400 },
    );
  }

  try {
    // Fetch entitlement from Race Auto India
    const entitlement = await fetchRaiFlashEntitlement(email);

    if (!entitlement.isSubscribed || entitlement.effectiveStatus !== "active") {
      return NextResponse.json(
        { error: "Active subscription required to assign Flash Report countries" },
        { status: 403 },
      );
    }

    if (entitlement.accessType === "shared") {
      return NextResponse.json(
        { error: "Shared users cannot self-assign countries. Contact your plan owner." },
        { status: 403 },
      );
    }

    const limit = entitlement.flashReportCountryLimit;
    if (limit === 0) {
      return NextResponse.json(
        { error: "Your plan does not include Flash Report country slots" },
        { status: 403 },
      );
    }

    // Get already-assigned countries
    const [existingRows] = await db.query(
      `SELECT country_id, slot_index FROM flash_report_user_countries WHERE email = ? ORDER BY slot_index ASC`,
      [email],
    ) as any[];

    const existing = existingRows as Array<{ country_id: string; slot_index: number }>;
    const existingCountryIds = new Set(existing.map((r) => r.country_id));
    const usedSlots = existing.length;
    const remainingSlots = limit - usedSlots;

    if (remainingSlots <= 0) {
      return NextResponse.json(
        { error: "All your country slots are already filled" },
        { status: 403 },
      );
    }

    // Filter out already-assigned countries
    const toAdd = cleaned.filter((c) => !existingCountryIds.has(c));
    if (!toAdd.length) {
      return NextResponse.json(
        { error: "All provided countries are already assigned" },
        { status: 409 },
      );
    }

    if (toAdd.length > remainingSlots) {
      return NextResponse.json(
        {
          error: `You can only add ${remainingSlots} more country slot(s). You tried to add ${toAdd.length}.`,
        },
        { status: 403 },
      );
    }

    // Insert new slots
    let nextSlotIndex = usedSlots; // 0-based
    const inserts: any[] = [];
    for (const countryId of toAdd) {
      inserts.push([
        email,
        countryId,
        nextSlotIndex,
        entitlement.effectivePlan ?? null,
        entitlement.accessType ?? null,
        entitlement.parentEmail ?? null,
      ]);
      nextSlotIndex++;
    }

    for (const row of inserts) {
      await db.execute(
        `INSERT IGNORE INTO flash_report_user_countries
           (email, country_id, slot_index, effective_plan_at_selection, access_type, source_owner_email)
         VALUES (?, ?, ?, ?, ?, ?)`,
        row,
      );
    }

    // Return refreshed list
    const [updatedRows] = await db.query(
      `SELECT id, country_id, slot_index, effective_plan_at_selection, access_type, source_owner_email, created_at
       FROM flash_report_user_countries
       WHERE email = ?
       ORDER BY slot_index ASC`,
      [email],
    );

    return NextResponse.json({ email, countries: updatedRows, added: toAdd });
  } catch (err: any) {
    console.error("POST /api/flash-reports/user-countries error:", err);
    return NextResponse.json(
      { error: "Failed to assign countries" },
      { status: 500 },
    );
  }
}
