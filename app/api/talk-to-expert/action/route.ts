import db from "@/lib/db";
import { sendEmail } from "@/lib/sendEmail";
import {
  talkToExpertApprovedEmail,
  talkToExpertRejectedEmail,
} from "@/lib/emailTemplates";

export const dynamic = "force-dynamic";

// A simple branded HTML page shown to the admin after they click a link.
function page(title: string, bodyHtml: string, accent = "#60a5fa") {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" /><title>${title}</title></head>
<body style="margin:0; font-family:Arial,Helvetica,sans-serif; background:#0b141f; color:#eaf0ff; display:flex; min-height:100vh; align-items:center; justify-content:center; padding:24px;">
  <div style="max-width:460px; width:100%; background:#111a2b; border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:28px; text-align:center;">
    <h1 style="margin:0 0 10px; font-size:20px; color:${accent};">${title}</h1>
    ${bodyHtml}
  </div>
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  const token = String(searchParams.get("token") || "");
  const action = String(searchParams.get("action") || "");
  const confirm = searchParams.get("confirm") === "1";

  if (!id || !token || (action !== "approve" && action !== "reject")) {
    return page(
      "Invalid link",
      `<p style="color:#94a3b8; font-size:14px;">This approval link is invalid or incomplete.</p>`,
      "#f87171",
    );
  }

  try {
    const [rows]: any = await db.query(
      `SELECT * FROM talk_to_expert_leads WHERE id = ? LIMIT 1`,
      [id],
    );
    const lead = Array.isArray(rows) ? rows[0] : null;

    if (!lead || String(lead.token) !== token) {
      return page(
        "Invalid link",
        `<p style="color:#94a3b8; font-size:14px;">This link is invalid or has expired.</p>`,
        "#f87171",
      );
    }

    if (lead.status !== "pending") {
      return page(
        "Already handled",
        `<p style="color:#94a3b8; font-size:14px;">This request was already <b style="color:#eaf0ff;">${lead.status}</b>.</p>`,
        "#94a3b8",
      );
    }

    // Step 1 — confirmation (prevents email scanners from auto-triggering).
    if (!confirm) {
      const label = action === "approve" ? "APPROVE" : "DECLINE";
      const btn = action === "approve" ? "#16a34a" : "#dc2626";
      const confirmUrl = `${origin}/api/talk-to-expert/action?id=${id}&token=${encodeURIComponent(
        token,
      )}&action=${action}&confirm=1`;
      return page(
        `${label} this request?`,
        `<p style="color:#cbd5e1; font-size:14px; margin:0 0 4px;">${lead.name} &middot; ${lead.email}</p>
         <p style="color:#94a3b8; font-size:13px; margin:0 0 16px;">${lead.preferred_date} &middot; ${lead.preferred_time}<br />They will be emailed automatically.</p>
         <a href="${confirmUrl}" style="display:inline-block; background:${btn}; color:#fff; text-decoration:none; padding:11px 24px; border-radius:10px; font-weight:bold; font-size:14px;">Confirm ${label}</a>`,
        btn,
      );
    }

    // Step 2 — apply + notify the requester.
    const newStatus = action === "approve" ? "approved" : "rejected";
    await db.query(
      `UPDATE talk_to_expert_leads SET status = ?, responded_at = NOW() WHERE id = ?`,
      [newStatus, id],
    );

    try {
      const tpl =
        newStatus === "approved"
          ? talkToExpertApprovedEmail({
              name: lead.name,
              preferredDate: lead.preferred_date,
              preferredTime: lead.preferred_time,
            })
          : talkToExpertRejectedEmail({ name: lead.name });
      await sendEmail({
        to: lead.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
    } catch (mailErr) {
      console.error("talk-to-expert requester notify failed:", mailErr);
    }

    const ok = newStatus === "approved";
    return page(
      ok ? "Meeting approved ✓" : "Request declined",
      `<p style="color:#cbd5e1; font-size:14px;">${lead.name} has been emailed that their consultation was <b style="color:#eaf0ff;">${newStatus}</b>.</p>`,
      ok ? "#4ade80" : "#f87171",
    );
  } catch (e) {
    console.error("talk-to-expert action error:", e);
    return page(
      "Something went wrong",
      `<p style="color:#94a3b8; font-size:14px;">Please try again in a moment.</p>`,
      "#f87171",
    );
  }
}
