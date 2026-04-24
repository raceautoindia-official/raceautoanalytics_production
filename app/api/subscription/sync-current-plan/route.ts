import db from "@/lib/db";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/sendEmail";
import { subscriptionPurchaseSuccessEmail } from "@/lib/emailTemplates";
import { requireSameUserOrInternal } from "@/lib/requestAuth";

function toMySQLDateTime(value: any) {
  if (!value) return null;

  const str = String(value).trim();

  // Already MySQL DATETIME format
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
    return str;
  }

  const date = new Date(str);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  // Convert ISO / JS date into MySQL DATETIME format
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function toReadableDate(value: any) {
  const parsed = toMySQLDateTime(value);
  if (!parsed) return null;
  return parsed.slice(0, 10);
}

async function trySendSubscriptionPurchaseEmail(email: string, active: any) {
  try {
    const paymentId =
      active?.payment_id != null ? String(active.payment_id) : "";
    const referenceKey =
      paymentId ||
      `subscription-${String(active?.id ?? "na")}-${String(active?.start_date ?? "na")}`;

    const [insertResult] = await db.execute(
      `INSERT IGNORE INTO subscription_email_log (email, event_type, reference_key, payload)
       VALUES (?, 'subscription_purchase_success', ?, ?)`,
      [email, referenceKey, JSON.stringify(active ?? {})],
    );

    if (Number((insertResult as { affectedRows?: number })?.affectedRows || 0) === 0) {
      return;
    }

    let amount: number | null = null;
    if (paymentId) {
      const [paymentRows] = await db.execute(
        `SELECT amount
         FROM payment_reference_log
         WHERE email = ? AND razorpay_payment_id = ? AND status = 'success'
         ORDER BY id DESC
         LIMIT 1`,
        [email, paymentId],
      );
      const payment = (paymentRows as any[])[0];
      amount = payment?.amount != null ? Number(payment.amount) : null;
    }

    const template = subscriptionPurchaseSuccessEmail({
      email,
      planName: String(active?.plan_name || "Subscription"),
      amount,
      currency: "INR",
      purchaseDate: toReadableDate(active?.start_date),
      renewalDate: toReadableDate(active?.end_date),
      paymentReference: paymentId || null,
    });

    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (error) {
    console.error("subscription purchase email failed:", error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email;
    const data = body?.data;
    const triggerPurchaseEmail = body?.triggerPurchaseEmail === true;

    if (!email) {
      return NextResponse.json(
        { success: false, message: "email is required" },
        { status: 400 }
      );
    }

    const access = await requireSameUserOrInternal(req, String(email));
    if (!access.ok) {
      return NextResponse.json(
        { success: false, message: access.message || "Forbidden" },
        { status: access.status || 403 },
      );
    }

    const list = Array.isArray(data) ? data : [];
    const active =
      list.find(
        (item: any) => String(item?.status || "").toLowerCase() === "active"
      ) ||
      list[0] || {
        user_id: null,
        id: null,
        payment_id: null,
        plan_name: "silver",
        status: "Active",
        start_date: null,
        end_date: null,
      };

    await db.execute(
      `
      INSERT INTO subscription_reference
      (
        email,
        remote_user_id,
        remote_subscription_id,
        payment_id,
        plan_name,
        status,
        start_date,
        end_date,
        raw_payload
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        remote_user_id = VALUES(remote_user_id),
        remote_subscription_id = VALUES(remote_subscription_id),
        payment_id = VALUES(payment_id),
        plan_name = VALUES(plan_name),
        status = VALUES(status),
        start_date = VALUES(start_date),
        end_date = VALUES(end_date),
        raw_payload = VALUES(raw_payload),
        synced_at = CURRENT_TIMESTAMP
      `,
      [
        String(email),
        active?.user_id ?? null,
        active?.id ?? null,
        active?.payment_id ?? null,
        active?.plan_name ? String(active.plan_name) : "silver",
        active?.status ? String(active.status) : "Active",
        toMySQLDateTime(active?.start_date),
        toMySQLDateTime(active?.end_date),
        JSON.stringify(data ?? active),
      ]
    );

    const activeStatus = String(active?.status || "").toLowerCase();
    if (triggerPurchaseEmail && activeStatus === "active") {
      await trySendSubscriptionPurchaseEmail(String(email), active);
    }

    return NextResponse.json({
      success: true,
      message: "Current plan synced successfully",
    });
  } catch (error) {
    console.error("sync-current-plan error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to sync current plan" },
      { status: 500 }
    );
  }
}
