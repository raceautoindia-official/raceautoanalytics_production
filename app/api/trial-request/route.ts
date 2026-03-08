import db from "@/lib/db";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/sendEmail";
import { adminNewTrialRequestEmail } from "@/lib/emailTemplates";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim();
    const phone = String(body?.phone || "").trim();
    const segment = String(body?.segment || "").trim();
    const company = body?.company ? String(body.company).trim() : null;
    const description = body?.description ? String(body.description).trim() : null;

    if (!name) return NextResponse.json({ message: "Name is required" }, { status: 400 });
    if (!email || !/^\S+@\S+\.\S+$/.test(email))
      return NextResponse.json({ message: "Valid email is required" }, { status: 400 });
    if (!phone) return NextResponse.json({ message: "Phone is required" }, { status: 400 });
    if (!segment) return NextResponse.json({ message: "Segment is required" }, { status: 400 });

    // Save lead
    await db.execute(
      `INSERT INTO trial_leads (name,email,phone,segment,company,description,status)
       VALUES (?,?,?,?,?,?,'pending')`,
      [name, email, phone, segment, company, description]
    );

    // Notify admin via SES (non-blocking)
    const adminEmail = process.env.TRIAL_ADMIN_EMAIL;
    if (adminEmail) {
      const tpl = adminNewTrialRequestEmail({
        name,
        email,
        phone,
        segment,
        company,
        description,
      });

      sendEmail({
        to: adminEmail,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      }).catch((e) => console.error("SES admin notify failed:", e));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("trial-request error:", err);
    return NextResponse.json({ message: "Failed to submit request" }, { status: 500 });
  }
}