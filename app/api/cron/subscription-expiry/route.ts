import db from "@/lib/db";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/sendEmail";
import { subscriptionExpiryReminderEmail } from "@/lib/emailTemplates";

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const header = req.headers.get("x-cron-token");
  return token === secret || header === secret;
}

export async function GET(req: Request) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const [rows] = await db.execute(
      `SELECT email, remote_subscription_id, end_date,
              DATEDIFF(end_date, NOW()) AS days_left
       FROM subscription_reference
       WHERE status = 'Active'
         AND end_date IS NOT NULL
         AND DATEDIFF(end_date, NOW()) BETWEEN 1 AND 7`,
    );

    let sent = 0;
    let skipped = 0;

    for (const row of (rows as any[]) || []) {
      const daysLeft = Number(row?.days_left);
      const email = String(row?.email || "").trim();
      if (!email || !Number.isFinite(daysLeft) || daysLeft < 1 || daysLeft > 7) {
        continue;
      }

      const referenceKey = `${String(
        row?.remote_subscription_id ?? "na",
      )}:${String(row?.end_date ?? "na")}:${daysLeft}`;

      const [insertResult] = await db.execute(
        `INSERT IGNORE INTO subscription_email_log (email, event_type, reference_key, payload)
         VALUES (?, 'subscription_expiry_reminder', ?, ?)`,
        [email, referenceKey, JSON.stringify(row)],
      );

      if (Number((insertResult as { affectedRows?: number })?.affectedRows || 0) === 0) {
        skipped++;
        continue;
      }

      try {
        const template = subscriptionExpiryReminderEmail({
          email,
          daysLeft,
        });
        await sendEmail({
          to: email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
        sent++;
      } catch (mailError) {
        console.error("subscription expiry reminder send failed:", mailError);
        await db.execute(
          `DELETE FROM subscription_email_log
           WHERE email = ? AND event_type = 'subscription_expiry_reminder' AND reference_key = ?`,
          [email, referenceKey],
        );
      }
    }

    return NextResponse.json({ ok: true, sent, skipped });
  } catch (error) {
    console.error("subscription-expiry cron error:", error);
    return NextResponse.json({ message: "Cron failed" }, { status: 500 });
  }
}
