import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/sendEmail";
import { enterpriseInquiryEmail } from "@/lib/emailTemplates";

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
    const company = typeof body.company === "string" ? body.company.trim() : "";
    const requirement =
      typeof body.requirement === "string" ? body.requirement.trim() : "";
    const planType = typeof body.planType === "string" ? body.planType.trim() : "Custom Plan";

    if (!name || !EMAIL_REGEX.test(email) || !phone || !company || !requirement) {
      return NextResponse.json(
        { message: "Please fill all required fields with valid values." },
        { status: 400 },
      );
    }

    const template = enterpriseInquiryEmail({
      name,
      email,
      phone,
      company,
      requirement,
      planType,
    });

    await sendEmail({
      to: "arunpandian972000@gmail.com",
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    return NextResponse.json({ success: true, message: "Inquiry submitted successfully." });
  } catch (error) {
    console.error("enterprise inquiry error:", error);
    return NextResponse.json(
      { message: "Unable to submit inquiry right now. Please try again shortly." },
      { status: 500 },
    );
  }
}
