// Admin action: clear a stuck DB session lock for a specific user by id.
// Distinct from /api/auth/force-clear-session (which requires the user's own
// password). This admin endpoint trusts the caller — should only be invoked
// from the admin CMS UI which has its own login gate.
//
// Body shape: { id: number }

import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    const id = Number(body?.id);

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json(
        { success: false, message: "Valid user id is required" },
        { status: 400 },
      );
    }

    const [result] = await db.execute(
      "UPDATE users SET active_session_id = NULL, session_expires_at = NULL WHERE id = ?",
      [id],
    );

    const affected = (result && (result.affectedRows ?? 0)) || 0;
    if (affected === 0) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, message: "Session cleared" });
  } catch (error) {
    console.error("POST /api/admin/clear-user-session error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to clear session" },
      { status: 500 },
    );
  }
}
