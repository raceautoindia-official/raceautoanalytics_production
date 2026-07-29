import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/sendEmail";
import { talkToExpertEmail } from "@/lib/emailTemplates";
import { FORECAST_INTERNAL_NOTIFICATION_RECIPIENTS } from "@/lib/forecastInternalNotificationRecipients";

export const dynamic = "force-dynamic";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

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

    const template = talkToExpertEmail({
      name,
      email,
      phone,
      preferredDate,
      preferredTime,
      message,
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
