import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/sendEmail";
import { FORECAST_INTERNAL_NOTIFICATION_RECIPIENTS } from "@/lib/forecastInternalNotificationRecipients";

// General enquiry form (replaces the "Email info@raceautoindia.com" footer
// on the subscription FAQ). Sends a single email to the internal recipient
// list defined in lib/forecastInternalNotificationRecipients.ts so any team
// member can pick it up.
//
// Input shape (all required except phone):
//   { name, email, phone?, enquiryType, message }

const VALID_ENQUIRY_TYPES = new Set([
  "Billing",
  "Refunds",
  "Cancellation / Downgrade",
  "Plan recommendation",
  "GST invoice request",
  "Technical issue",
  "Other",
]);

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 },
      );
    }

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const enquiryType = String(body.enquiryType || "").trim();
    const message = String(body.message || "").trim();

    if (!name) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 });
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { message: "A valid email is required" },
        { status: 400 },
      );
    }
    if (!enquiryType || !VALID_ENQUIRY_TYPES.has(enquiryType)) {
      return NextResponse.json(
        { message: "Please choose an enquiry type" },
        { status: 400 },
      );
    }
    if (!message || message.length < 5) {
      return NextResponse.json(
        { message: "Please describe your enquiry (at least 5 characters)" },
        { status: 400 },
      );
    }
    if (message.length > 4000) {
      return NextResponse.json(
        { message: "Message is too long (max 4000 characters)" },
        { status: 400 },
      );
    }

    const recipients = [...FORECAST_INTERNAL_NOTIFICATION_RECIPIENTS];

    const subject = `[Enquiry] ${enquiryType} — ${name}`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a; border-bottom: 2px solid #4F67FF; padding-bottom: 8px;">
          New Enquiry from Race Auto Analytics
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 130px;">Enquiry type</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${escapeHtml(enquiryType)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Name</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${escapeHtml(name)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Email</td>
            <td style="padding: 8px 0; color: #1a1a1a;">
              <a href="mailto:${escapeHtml(email)}" style="color: #4F67FF;">${escapeHtml(email)}</a>
            </td>
          </tr>
          ${
            phone
              ? `<tr>
                   <td style="padding: 8px 0; color: #666;">Phone</td>
                   <td style="padding: 8px 0; color: #1a1a1a;">${escapeHtml(phone)}</td>
                 </tr>`
              : ""
          }
        </table>
        <div style="background: #f5f7ff; border-left: 4px solid #4F67FF; padding: 12px 16px; border-radius: 4px; margin-top: 16px;">
          <div style="color: #666; font-size: 12px; margin-bottom: 6px;">Message</div>
          <div style="color: #1a1a1a; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(message)}</div>
        </div>
        <p style="color: #999; font-size: 11px; margin-top: 24px;">
          Submitted via the Race Auto Analytics subscription page contact form.
          Reply directly to this email to respond to ${escapeHtml(name)}.
        </p>
      </div>
    `;

    const text = [
      `New Enquiry from Race Auto Analytics`,
      ``,
      `Enquiry type: ${enquiryType}`,
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      ``,
      `Message:`,
      message,
      ``,
      `Submitted via the Race Auto Analytics subscription page contact form.`,
    ]
      .filter(Boolean)
      .join("\n");

    await sendEmail({
      to: recipients,
      subject,
      html,
      text,
    });

    return NextResponse.json({
      message: "Enquiry sent. Our team will get back to you shortly.",
    });
  } catch (err: any) {
    console.error("POST /api/contact/general-enquiry error:", err);
    return NextResponse.json(
      { message: err?.message || "Unable to send enquiry. Please try again." },
      { status: 500 },
    );
  }
}
