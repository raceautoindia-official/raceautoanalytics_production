// Admin users overview endpoint — read-only enriched view of the `users` table
// for the CMS user management page. Never exposes password_hash or OTP secrets;
// instead derives a friendly `loginType` field so the UI can display:
//   "Google login" vs "Email + password" vs "Email + password (external)"
//
// Heuristic for loginType (no schema change required):
//   - password_hash present                                  → "email_password" (local hash set, e.g. via reset)
//   - password_hash null, verification_mode set              → "email_password" (signed up via email/password; pwd on raceautoindia.com)
//   - password_hash null, verification_mode null             → "google"        (no local pwd, never went through OTP/verify)

import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

function deriveLoginType(row) {
  if (row?.password_hash) return "email_password";
  if (row?.verification_mode) return "email_password";
  return "google";
}

function deriveSessionStatus(row) {
  const sessionId = row?.active_session_id;
  const expiresAtRaw = row?.session_expires_at;
  if (!sessionId || !expiresAtRaw) return "none";
  const expiresAt = new Date(expiresAtRaw).getTime();
  if (!Number.isFinite(expiresAt)) return "none";
  return expiresAt > Date.now() ? "active" : "expired";
}

function deriveTrialStatus(row) {
  const used = Boolean(row?.free_trial_used);
  const expiresAtRaw = row?.free_trial_expires_at;
  if (!used && !expiresAtRaw) return "never";
  if (!expiresAtRaw) return used ? "used" : "never";
  const expiresAt = new Date(expiresAtRaw).getTime();
  if (!Number.isFinite(expiresAt)) return used ? "used" : "never";
  return expiresAt > Date.now() ? "active" : "expired";
}

export async function GET() {
  try {
    // Pull all relevant fields EXCEPT secrets (password_hash, OTP hashes,
    // reset tokens). password_hash is referenced ONLY to derive loginType
    // server-side and is then dropped before returning.
    const [rows] = await db.query(
      `
      SELECT
        id,
        email,
        mobile_number,
        verification_mode,
        email_verified,
        phone_verified,
        verified_at,
        last_login_at,
        active_session_id,
        session_expires_at,
        free_trial_used,
        free_trial_started_at,
        free_trial_expires_at,
        free_trial_name,
        free_trial_phone,
        welcome_email_sent_at,
        password_hash
      FROM users
      ORDER BY id DESC
      `,
    );

    const users = (Array.isArray(rows) ? rows : []).map((row) => {
      const loginType = deriveLoginType(row);
      const sessionStatus = deriveSessionStatus(row);
      const trialStatus = deriveTrialStatus(row);

      // Drop the raw password_hash from the response — never expose it.
      // We only used it for loginType derivation above.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...safe } = row;

      return {
        ...safe,
        loginType,
        sessionStatus,
        trialStatus,
        // Friendly booleans for the UI
        emailVerifiedBool: Boolean(row.email_verified),
        phoneVerifiedBool: Boolean(row.phone_verified),
        freeTrialUsedBool: Boolean(row.free_trial_used),
      };
    });

    // Aggregate stats for the page header
    const stats = {
      total: users.length,
      googleLogin: users.filter((u) => u.loginType === "google").length,
      emailPasswordLogin: users.filter((u) => u.loginType === "email_password").length,
      emailVerified: users.filter((u) => u.emailVerifiedBool).length,
      phoneVerified: users.filter((u) => u.phoneVerifiedBool).length,
      activeSession: users.filter((u) => u.sessionStatus === "active").length,
      trialActive: users.filter((u) => u.trialStatus === "active").length,
      trialUsed: users.filter((u) => u.trialStatus === "used" || u.trialStatus === "expired").length,
    };

    return NextResponse.json({ success: true, users, stats });
  } catch (error) {
    console.error("GET /api/admin/users-overview error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
