import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

// Public contact form -> contact_leads. Basic validation + light size caps.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim().slice(0, 150);
    const email = String(body?.email || "").trim().slice(0, 255);
    const message = String(body?.message || "").trim().slice(0, 4000);
    const company = body?.company ? String(body.company).trim().slice(0, 200) : null;
    const phone = body?.phone ? String(body.phone).trim().slice(0, 50) : null;
    const subject = body?.subject ? String(body.subject).trim().slice(0, 200) : null;

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!name || !emailOk || !message) {
      return NextResponse.json(
        { error: "Name, a valid email and a message are required." },
        { status: 400 },
      );
    }

    await db.execute(
      `INSERT INTO contact_leads (name, email, company, phone, subject, message, source)
       VALUES (?, ?, ?, ?, ?, ?, 'contact')`,
      [name, email, company, phone, subject, message],
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[contact][POST]", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
