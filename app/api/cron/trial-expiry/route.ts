import db from "@/lib/db";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/sendEmail";
import { userTrialExpiryReminderEmail, userTrialExpiredEmail } from "@/lib/emailTemplates";

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

    // We only remind approved trials with an expiry date
    // Using MySQL DATEDIFF to compute days left:
    // daysLeft = DATEDIFF(trial_expires_at, NOW())
    const [rows2d]: any = await db.execute(
      `SELECT id, email, trial_expires_at
       FROM trial_leads
       WHERE status='approved'
         AND trial_expires_at IS NOT NULL
         AND DATEDIFF(trial_expires_at, NOW()) = 2
         AND reminder_2d_sent_at IS NULL`
    );

    const [rows1d]: any = await db.execute(
      `SELECT id, email, trial_expires_at
       FROM trial_leads
       WHERE status='approved'
         AND trial_expires_at IS NOT NULL
         AND DATEDIFF(trial_expires_at, NOW()) = 1
         AND reminder_1d_sent_at IS NULL`
    );

    const [rowsExpired]: any = await db.execute(
      `SELECT id, email, trial_expires_at
       FROM trial_leads
       WHERE status='approved'
         AND trial_expires_at IS NOT NULL
         AND trial_expires_at < NOW()
         AND expired_email_sent_at IS NULL`
    );

    let sent2d = 0, sent1d = 0, sentExpired = 0;

    // 2-day reminders
    for (const r of rows2d || []) {
      const tpl = userTrialExpiryReminderEmail({ email: r.email, daysLeft: 2 });
      await sendEmail({ to: r.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
      await db.execute(`UPDATE trial_leads SET reminder_2d_sent_at = NOW() WHERE id = ?`, [r.id]);
      sent2d++;
    }

    // 1-day reminders
    for (const r of rows1d || []) {
      const tpl = userTrialExpiryReminderEmail({ email: r.email, daysLeft: 1 });
      await sendEmail({ to: r.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
      await db.execute(`UPDATE trial_leads SET reminder_1d_sent_at = NOW() WHERE id = ?`, [r.id]);
      sent1d++;
    }

    // expired emails
    for (const r of rowsExpired || []) {
      const tpl = userTrialExpiredEmail({ email: r.email });
      await sendEmail({ to: r.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
      await db.execute(`UPDATE trial_leads SET expired_email_sent_at = NOW() WHERE id = ?`, [r.id]);
      sentExpired++;
    }

    // Optional admin summary (simple)
    const adminEmail = process.env.TRIAL_ADMIN_EMAIL;
    if (adminEmail && (sent2d + sent1d + sentExpired) > 0) {
      const subject = `[${process.env.APP_NAME || "RaceAutoAnalytics"}] Trial reminders sent`;
      const html = `<div style="font-family:Arial,sans-serif">
        <p>Trial reminder job complete.</p>
        <ul>
          <li>2-day reminders: ${sent2d}</li>
          <li>1-day reminders: ${sent1d}</li>
          <li>Expired notices: ${sentExpired}</li>
        </ul>
      </div>`;
      await sendEmail({ to: adminEmail, subject, html, text: `2d:${sent2d}, 1d:${sent1d}, expired:${sentExpired}` });
    }

    return NextResponse.json({ ok: true, sent2d, sent1d, sentExpired });
  } catch (err) {
    console.error("trial-expiry cron error:", err);
    return NextResponse.json({ message: "Cron failed" }, { status: 500 });
  }
}