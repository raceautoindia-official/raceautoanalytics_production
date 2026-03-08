import db from "@/lib/db";
import { NextResponse } from "next/server";

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email;
    const data = body?.data;

    if (!email) {
      return NextResponse.json(
        { success: false, message: "email is required" },
        { status: 400 }
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