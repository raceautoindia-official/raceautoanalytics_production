import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      email,
      remote_user_id = null,
      plan_name = null,
      duration = null,
      amount = null,
      razorpay_order_id = null,
      razorpay_payment_id = null,
      status,
      message = null,
      request_payload = null,
      response_payload = null,
    } = body || {};

    if (!email || !status) {
      return NextResponse.json(
        { success: false, message: "email and status are required" },
        { status: 400 }
      );
    }

    await db.execute(
      `
      INSERT INTO payment_reference_log
      (
        email,
        remote_user_id,
        plan_name,
        duration,
        amount,
        razorpay_order_id,
        razorpay_payment_id,
        status,
        message,
        request_payload,
        response_payload
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        String(email),
        remote_user_id,
        plan_name,
        duration,
        amount,
        razorpay_order_id,
        razorpay_payment_id,
        String(status),
        message,
        JSON.stringify(request_payload),
        JSON.stringify(response_payload),
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Payment log stored successfully",
    });
  } catch (error) {
    console.error("sync-payment-log error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to store payment log" },
      { status: 500 }
    );
  }
}