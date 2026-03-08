import db from "@/lib/db";
import { NextResponse } from "next/server";
import crypto from "crypto";

function generateTempPassword(len = 10) {
  return crypto
    .randomBytes(32)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, len);
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const id = Number(ctx.params.id);
    if (!id) return NextResponse.json({ message: "Invalid id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const status = String(body?.status || "").trim(); // approved | rejected
    const reviewedBy = body?.reviewedBy ? String(body.reviewedBy).trim() : null;

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    // fetch email for generating username
    const [rows]: any = await db.execute(
      `SELECT id, email FROM trial_leads WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!rows || rows.length === 0) {
      return NextResponse.json({ message: "Lead not found" }, { status: 404 });
    }
    const lead = rows[0];

    if (status === "rejected") {
      await db.execute(
        `UPDATE trial_leads
         SET status='rejected',
             reviewed_at = NOW(),
             reviewed_by = ?
         WHERE id = ?`,
        [reviewedBy, id]
      );
      return NextResponse.json({ ok: true });
    }

    // approved: update only status fields (no temp creds stored)
    await db.execute(
      `UPDATE trial_leads
       SET status='approved',
           reviewed_at = NOW(),
           reviewed_by = ?
       WHERE id = ?`,
      [reviewedBy, id]
    );

    const tempUsername = lead.email; // ✅ email is username
    const tempPasswordPlain = generateTempPassword(10);

    return NextResponse.json({
      ok: true,
      temp_username: tempUsername,
      temp_password: tempPasswordPlain,
      expires_in_days: 7,
    });
  } catch (err) {
    console.error("trial-leads status error:", err);
    return NextResponse.json({ message: "Failed to update status" }, { status: 500 });
  }
}