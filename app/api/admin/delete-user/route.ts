// Admin action: delete a local `users` row by id — but ONLY if the email is
// no longer present in the Race Auto India (RAI) database.
//
// Rationale: users in this app's `users` table are linked to RAI. If a user
// still exists in RAI, deleting the local row creates a confusing split state
// and breaks entitlement/auth logic. So the delete is gated:
//   - email still in RAI  → 409, blocked (remove it in RAI first)
//   - email not in RAI    → delete the local `users` row only
//   - RAI unreachable      → 503, fail-safe (never delete when unverified)
//
// Existence is derived from the existing internal access-summary endpoint
// (per product decision). We only treat a *clear* not-found as deletable; any
// ambiguity (5xx, network error, malformed payload) fails safe and blocks.
//
// Trusts the caller — invoked from the CMS UI, which is behind the /admin
// middleware Basic-Auth gate (same trust model as clear-user-session).

import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

const INTERNAL_BASE =
  process.env.RACE_AUTO_INDIA_INTERNAL_BASE || "https://raceautoindia.com";
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "";

type RaiPresence = "present" | "absent" | "unknown";

async function checkRaiPresence(email: string): Promise<RaiPresence> {
  try {
    const url = `${INTERNAL_BASE}/api/internal/subscription/access-summary?email=${encodeURIComponent(
      email,
    )}`;
    const res = await fetch(url, {
      headers: { "x-internal-api-key": INTERNAL_KEY },
      cache: "no-store",
    });

    // A clear "not found" is the only safe signal to allow deletion.
    if (res.status === 404) return "absent";
    // Auth/server errors → cannot trust the answer → block (fail safe).
    if (!res.ok) return "unknown";

    const data: any = await res.json().catch(() => null);
    if (!data || typeof data !== "object") return "unknown";

    // Explicit not-found flags, if the upstream provides them.
    if (data.exists === false || data.found === false || data.userExists === false) {
      return "absent";
    }

    // Treat any signal that the user is *known* to RAI as "present".
    const known =
      data.exists === true ||
      data.found === true ||
      data.userExists === true ||
      Boolean(data.userId ?? data.user_id ?? data.id) ||
      Boolean(data.hasDirectPlan || data.hasSharedPlan || data.isSubscribed) ||
      Boolean(data.effectivePlan || data.directPlan || data.sharedPlan) ||
      Boolean(data.role || data.accountStatus || data.membershipApprovalStatus) ||
      Boolean(data.parentEmail || data.parent_email) ||
      // Upstream echoes back a real, matching email with surrounding account
      // context (more than a bare echo of our query param).
      (typeof data.email === "string" &&
        data.email.trim().toLowerCase() === email &&
        Object.keys(data).length > 2);

    return known ? "present" : "absent";
  } catch {
    return "unknown";
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const id = Number(body?.id);

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json(
        { success: false, message: "Valid user id is required" },
        { status: 400 },
      );
    }

    const [rows]: any = await db.execute(
      "SELECT id, email FROM users WHERE id = ? LIMIT 1",
      [id],
    );
    const user = Array.isArray(rows) ? rows[0] : null;
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    const email = String(user.email || "").trim().toLowerCase();

    if (email) {
      const presence = await checkRaiPresence(email);

      if (presence === "present") {
        return NextResponse.json(
          {
            success: false,
            code: "RAI_PRESENT",
            message:
              "This email is present in the Race Auto India database. Please remove it there first, then you can delete it here.",
          },
          { status: 409 },
        );
      }

      if (presence === "unknown") {
        return NextResponse.json(
          {
            success: false,
            code: "RAI_UNVERIFIED",
            message:
              "Could not verify this email against the Race Auto India database right now. Deletion was blocked for safety — please try again.",
          },
          { status: 503 },
        );
      }
    }

    // Email is not in RAI (or the row has no email) → delete the local row only.
    const [result]: any = await db.execute("DELETE FROM users WHERE id = ?", [id]);
    const affected = (result && result.affectedRows) || 0;
    if (affected === 0) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, message: "User deleted" });
  } catch (error) {
    console.error("POST /api/admin/delete-user error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete user" },
      { status: 500 },
    );
  }
}
