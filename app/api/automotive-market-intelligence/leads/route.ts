import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/sendEmail";
import { FORECAST_INTERNAL_NOTIFICATION_RECIPIENTS } from "@/lib/forecastInternalNotificationRecipients";
import { createAutomotiveMarketIntelligenceLead } from "@/lib/automotiveMarketIntelligenceLeads";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const VALID_USER_TYPES = new Set([
  "OEM",
  "Supplier",
  "Dealer / Distributor",
  "Consultant",
  "Investor",
  "Research / Media",
  "Other",
]);

const VALID_INTERESTS = new Set([
  "Vehicle Sales Forecast",
  "Flash Reports",
  "OEM Market Share",
  "EV Market Insights",
  "Country-wise Data",
  "Subscription / Demo",
]);

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function escapeHtml(value: string) {
  return value
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

    const fullName = cleanText(body.fullName, 160);
    const businessEmail = cleanText(body.businessEmail, 190).toLowerCase();
    const companyName = cleanText(body.companyName, 190);
    const phoneNumber = cleanText(body.phoneNumber, 60);
    const country = cleanText(body.country, 120);
    const userType = cleanText(body.userType, 80);
    const interest = cleanText(body.interest, 120);
    const message = cleanText(body.message, 4000);
    const consent = Boolean(body.consent);

    if (!fullName) {
      return NextResponse.json(
        { message: "Full name is required" },
        { status: 400 },
      );
    }
    if (!businessEmail || !EMAIL_REGEX.test(businessEmail)) {
      return NextResponse.json(
        { message: "A valid business email is required" },
        { status: 400 },
      );
    }
    if (!companyName) {
      return NextResponse.json(
        { message: "Company name is required" },
        { status: 400 },
      );
    }
    if (!phoneNumber) {
      return NextResponse.json(
        { message: "Phone number is required" },
        { status: 400 },
      );
    }
    if (!country) {
      return NextResponse.json(
        { message: "Country is required" },
        { status: 400 },
      );
    }
    if (!VALID_USER_TYPES.has(userType)) {
      return NextResponse.json(
        { message: "Please choose a valid user type" },
        { status: 400 },
      );
    }
    if (!VALID_INTERESTS.has(interest)) {
      return NextResponse.json(
        { message: "Please choose a valid interest" },
        { status: 400 },
      );
    }
    if (!message || message.length < 5) {
      return NextResponse.json(
        { message: "Please describe your requirement" },
        { status: 400 },
      );
    }
    if (!consent) {
      return NextResponse.json(
        { message: "Contact consent is required" },
        { status: 400 },
      );
    }

    await createAutomotiveMarketIntelligenceLead({
      fullName,
      businessEmail,
      companyName,
      phoneNumber,
      country,
      userType,
      interest,
      message,
      consent,
      sourcePath: "/automotive-market-intelligence",
      userAgent: cleanText(req.headers.get("user-agent"), 500),
    });

    const subject = `[Market Intelligence Lead] ${companyName} - ${interest}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px; margin: 0 auto;">
        <h2 style="color: #111827; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">New Automotive Market Intelligence Lead</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 6px 0; color: #6b7280;">Name</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(fullName)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td style="padding: 6px 0;"><a href="mailto:${escapeHtml(businessEmail)}">${escapeHtml(businessEmail)}</a></td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Company</td><td style="padding: 6px 0;">${escapeHtml(companyName)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Phone</td><td style="padding: 6px 0;">${escapeHtml(phoneNumber)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Country</td><td style="padding: 6px 0;">${escapeHtml(country)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">User type</td><td style="padding: 6px 0;">${escapeHtml(userType)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Interest</td><td style="padding: 6px 0;">${escapeHtml(interest)}</td></tr>
        </table>
        <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; border-radius: 6px;">
          <div style="color: #6b7280; font-size: 12px; margin-bottom: 6px;">Message</div>
          <div style="color: #111827; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(message)}</div>
        </div>
      </div>
    `;
    const text = [
      "New Automotive Market Intelligence Lead",
      "",
      `Name: ${fullName}`,
      `Email: ${businessEmail}`,
      `Company: ${companyName}`,
      `Phone: ${phoneNumber}`,
      `Country: ${country}`,
      `User type: ${userType}`,
      `Interest: ${interest}`,
      "",
      "Message:",
      message,
    ].join("\n");

    sendEmail({
      to: [...FORECAST_INTERNAL_NOTIFICATION_RECIPIENTS],
      subject,
      html,
      text,
    }).catch((error) =>
      console.error("market intelligence lead email failed:", error),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("market intelligence lead submit error:", error);
    return NextResponse.json(
      { message: "Failed to submit enquiry" },
      { status: 500 },
    );
  }
}
