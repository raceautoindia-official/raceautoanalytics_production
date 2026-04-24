import db from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/requestAuth";

export async function GET(req: Request) {
  try {
    // const access = await requireAdminAccess(req);
    // if (!access.ok) {
    //   return NextResponse.json(
    //     { message: access.message || "Admin access required" },
    //     { status: access.status || 403 },
    //   );
    // }

    const [rows] = await db.execute(
      `SELECT 
         id, name, email, phone, segment, company, description,
         status, requested_at, reviewed_at, reviewed_by,
         temp_username, trial_expires_at
       FROM trial_leads
       ORDER BY requested_at DESC
       LIMIT 500`
    );

    return NextResponse.json({ rows });
  } catch (err) {
    console.error("admin trial-leads GET error:", err);
    return NextResponse.json({ message: "Failed to load leads" }, { status: 500 });
  }
}
