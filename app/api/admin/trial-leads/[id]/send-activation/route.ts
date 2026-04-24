import db from "@/lib/db";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/sendEmail";
import { userTrialActivatedEmail } from "@/lib/emailTemplates";
import { requireAdminAccess } from "@/lib/requestAuth";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const startedAt = Date.now();
  try {
    const access = await requireAdminAccess(req);
    if (!access.ok) {
      return NextResponse.json(
        { message: access.message || "Admin access required" },
        { status: access.status || 403 },
      );
    }

    const id = Number(ctx.params.id);
    console.log("[SES][send-activation] start", { id });

    if (!id) {
      console.log("[SES][send-activation] invalid id");
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    console.log("[SES][send-activation] body keys", Object.keys(body || {}));

    const tempPassword = String(body?.temp_password || "").trim();
    if (!tempPassword) {
      console.log("[SES][send-activation] temp_password missing");
      return NextResponse.json({ message: "temp_password is required" }, { status: 400 });
    }

    console.log("[SES][send-activation] fetching lead from DB...");
    const [rows]: any = await db.execute(
      `SELECT id, name, email, status
       FROM trial_leads
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    console.log("[SES][send-activation] DB rows length", rows?.length || 0);

    if (!rows || rows.length === 0) {
      console.log("[SES][send-activation] lead not found");
      return NextResponse.json({ message: "Lead not found" }, { status: 404 });
    }

    const lead = rows[0];
    console.log("[SES][send-activation] lead", {
      id: lead.id,
      email: lead.email,
      status: lead.status,
    });

    if (lead.status !== "approved") {
      console.log("[SES][send-activation] lead not approved");
      return NextResponse.json({ message: "Lead is not approved" }, { status: 400 });
    }

    const tpl = userTrialActivatedEmail({
      name: lead.name,
      email: lead.email,
      tempPassword,
      expiresInDays: 7,
    });

    console.log("[SES][send-activation] sending email...", {
      to: lead.email,
      from: process.env.SES_FROM_EMAIL,
      region: process.env.AWS_REGION,
    });

    const sesResp = await sendEmail({
      to: lead.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });

    console.log("[SES][send-activation] SES response", sesResp);

    console.log("[SES][send-activation] done in ms", Date.now() - startedAt);

    return NextResponse.json({ ok: true, ses: sesResp });
  } catch (err: any) {
    console.error("[SES][send-activation] ERROR", {
      message: err?.message,
      name: err?.name,
      code: err?.code,
      statusCode: err?.$metadata?.httpStatusCode,
      requestId: err?.$metadata?.requestId,
      stack: err?.stack,
    });

    return NextResponse.json(
      {
        message: "Failed to send activation email",
        error: err?.message || "unknown",
        code: err?.code || null,
      },
      { status: 500 }
    );
  }
}
