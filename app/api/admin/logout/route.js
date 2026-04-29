import db from "@/lib/db";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// Decode a JWT WITHOUT signature verification — used only to extract the
// email claim during logout cleanup. Safe in this context because we are
// CLEARING access (revocation), not granting it. An attacker who somehow
// crafted a fake token can only revoke the matching email's session, which
// is equivalent to logging that user out — no data exposure.
function unsignedDecodeEmail(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded !== "object") return null;
    const email = decoded.email;
    return typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

export async function POST(req) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const authTokenMatch = cookieHeader.match(/(?:^|;\s*)authToken=([^;]+)/);
    const token = authTokenMatch ? authTokenMatch[1] : null;

    let email = null;
    let dbCleared = false;
    let dbError = null;

    if (token) {
      // Step 1: try to verify the JWT and extract email. Separate try so
      // a verify failure does not skip the DB cleanup attempt below.
      try {
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        if (decoded && typeof decoded === "object" && decoded.email) {
          email = String(decoded.email).trim().toLowerCase();
        }
      } catch {
        // Verification failed (expired / signature mismatch / malformed).
        // Fall back to unsigned decode so we can still clear the lock for
        // this email — losing the lock is the desired outcome for the user
        // anyway, so trusting the embedded email here is acceptable.
        email = unsignedDecodeEmail(token);
      }

      // Step 2: clear the DB lock for this email. Wrapped in its own try
      // so DB errors are surfaced (not silently swallowed) — previously the
      // single try/catch made stranded users impossible to diagnose.
      if (email) {
        try {
          await db.execute(
            "UPDATE users SET active_session_id = NULL, session_expires_at = NULL WHERE email = ?",
            [email]
          );
          dbCleared = true;
        } catch (err) {
          console.error("logout: DB clear failed for", email, err);
          dbError = "session_db_clear_failed";
        }
      }
    }

    // Always clear the cookie. Surface DB cleanup outcome in the response so
    // the client can warn the user if the server-side lock didn't clear (the
    // recovery flow on next login picks this up via the force-clear path).
    const response = NextResponse.json({
      message: "Logged out",
      sessionCleared: dbCleared,
      sessionWarning: dbError,
    });
    response.cookies.set("authToken", "", {
      path: "/",
      // Match the attributes used at set-time so the browser actually clears
      // the cookie (mismatched sameSite/secure can leave a stale cookie).
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
