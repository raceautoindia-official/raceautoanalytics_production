import { NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";
import { sendEmail } from "@/lib/sendEmail";
import { talkToExpertEmail } from "@/lib/emailTemplates";
import { FORECAST_INTERNAL_NOTIFICATION_RECIPIENTS } from "@/lib/forecastInternalNotificationRecipients";
import { SITE_URL } from "@/lib/seoRoutes";

export const dynamic = "force-dynamic";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

// Base URL for the approve/decline action links in the admin email.
// The link MUST point back to the same server that stored the lead, otherwise
// the click lands on a server whose DB has no matching row.
//  - Production: always the canonical site URL.
//  - Local/dev: this server's actual origin + scheme (so a local test email
//    links to http://localhost:<port>, not prod, and the lead is found).
function getActionBase(req: Request): string {
  if (process.env.NODE_ENV === "production") {
    return String(SITE_URL || "").replace(/\/+$/, "");
  }
  try {
    const url = new URL(req.url);
    const host = (
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      url.host
    )
      .split(",")[0]
      .trim();
    const proto = (
      req.headers.get("x-forwarded-proto") ||
      url.protocol.replace(":", "")
    )
      .split(",")[0]
      .trim();
    if (host) return `${proto || "http"}://${host}`.replace(/\/+$/, "");
  } catch {
    /* fall through to canonical */
  }
  return String(SITE_URL || "").replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const preferredDate =
      typeof body.preferredDate === "string" ? body.preferredDate.trim() : "";
    const preferredTime =
      typeof body.preferredTime === "string" ? body.preferredTime.trim() : "";
    const message =
      typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";

    if (!name || !EMAIL_REGEX.test(email) || !phone || !preferredDate || !preferredTime) {
      return NextResponse.json(
        { message: "Please fill all required fields with valid values." },
        { status: 400 },
      );
    }

    // Persist so the request can be approved/declined from the admin email.
    // Best-effort: if the insert fails we still notify admins (no action buttons).
    let actionLinks: { approveUrl?: string; rejectUrl?: string } = {};
    try {
      const token = crypto.randomBytes(24).toString("hex");
      const [result]: any = await db.query(
        `INSERT INTO talk_to_expert_leads
           (name, email, phone, preferred_date, preferred_time, message, status, token)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [name, email, phone, preferredDate, preferredTime, message || null, token],
      );
      const id = result?.insertId;
      if (id) {
        const base = getActionBase(req);
        const link = (action: string) =>
          `${base}/api/talk-to-expert/action?id=${id}&token=${token}&action=${action}`;
        actionLinks = { approveUrl: link("approve"), rejectUrl: link("reject") };
      }
    } catch (dbErr) {
      console.error("talk-to-expert insert failed (still emailing):", dbErr);
    }

    const template = talkToExpertEmail({
      name,
      email,
      phone,
      preferredDate,
      preferredTime,
      message,
      ...actionLinks,
    });

    await sendEmail({
      to: [...FORECAST_INTERNAL_NOTIFICATION_RECIPIENTS],
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    return NextResponse.json({
      success: true,
      message: "Request submitted successfully.",
    });
  } catch (error) {
    console.error("talk-to-expert error:", error);
    return NextResponse.json(
      { message: "Unable to submit right now. Please try again shortly." },
      { status: 500 },
    );
  }
}
