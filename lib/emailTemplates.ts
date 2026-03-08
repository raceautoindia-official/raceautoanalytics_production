export function adminNewTrialRequestEmail(lead: {
  name: string;
  email: string;
  phone: string;
  segment: string;
  company?: string | null;
  description?: string | null;
  id?: number;
}) {
  const app = process.env.APP_NAME || "RaceAutoAnalytics";
  const adminUrl = `${process.env.APP_BASE_URL || ""}/admin/trial-leads`;

  const subject = `[${app}] New Free Trial Request`;

  const html = `
  <div style="font-family:Arial,sans-serif; background:#050B1A; padding:24px; color:#EAF0FF;">
    <div style="max-width:640px; margin:0 auto; background:#0B1228; border:1px solid rgba(255,255,255,0.12); border-radius:16px; overflow:hidden;">
      <div style="padding:18px 18px 0 18px;">
        <h2 style="margin:0; font-size:18px;">New Free Trial Request</h2>
        <p style="margin:8px 0 0 0; color:rgba(234,240,255,0.75); font-size:13px;">
          A user has requested free trial access.
        </p>
      </div>

      <div style="padding:18px;">
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <tr><td style="padding:6px 0; color:rgba(234,240,255,0.6);">Name</td><td style="padding:6px 0;">${lead.name}</td></tr>
          <tr><td style="padding:6px 0; color:rgba(234,240,255,0.6);">Email</td><td style="padding:6px 0;">${lead.email}</td></tr>
          <tr><td style="padding:6px 0; color:rgba(234,240,255,0.6);">Phone</td><td style="padding:6px 0;">${lead.phone}</td></tr>
          <tr><td style="padding:6px 0; color:rgba(234,240,255,0.6);">Segment</td><td style="padding:6px 0;">${lead.segment}</td></tr>
          <tr><td style="padding:6px 0; color:rgba(234,240,255,0.6);">Company</td><td style="padding:6px 0;">${lead.company || "-"}</td></tr>
        </table>
        ${lead.description ? `<p style="margin:12px 0 0 0; color:rgba(234,240,255,0.75); font-size:13px;"><b>Description:</b> ${lead.description}</p>` : ""}

        <div style="margin-top:16px;">
          <a href="${adminUrl}" style="display:inline-block; background:#4F67FF; color:#fff; text-decoration:none; padding:10px 14px; border-radius:12px; font-weight:bold; font-size:13px;">
            Open Admin Leads Panel
          </a>
        </div>
      </div>
    </div>
  </div>
  `;

  const text = `New Free Trial Request\nName: ${lead.name}\nEmail: ${lead.email}\nPhone: ${lead.phone}\nSegment: ${lead.segment}\nCompany: ${lead.company || "-"}\nAdmin Panel: ${adminUrl}`;

  return { subject, html, text };
}

export function userTrialActivatedEmail(args: {
  name?: string;
  email: string;
  tempPassword: string;
  expiresInDays: number;
}) {
  const app = process.env.APP_NAME || "RaceAutoAnalytics";
  const base = process.env.APP_BASE_URL || "";
  const loginUrl = `${base}/flash-reports`;

  const subject = `[${app}] Your Free Trial Access Details (Valid ${args.expiresInDays} days)`;

  const html = `
  <div style="font-family:Arial,sans-serif; background:#050B1A; padding:24px; color:#EAF0FF;">
    <div style="max-width:640px; margin:0 auto; background:#0B1228; border:1px solid rgba(255,255,255,0.12); border-radius:16px; overflow:hidden;">
      <div style="padding:18px 18px 0 18px;">
        <h2 style="margin:0; font-size:18px;">Free Trial Access</h2>
        <p style="margin:8px 0 0 0; color:rgba(234,240,255,0.75); font-size:13px;">
          Your free trial access is provided for <b>${args.expiresInDays} days</b>.
        </p>
      </div>

      <div style="padding:18px;">
        <div style="background:#0E1833; border:1px solid rgba(255,255,255,0.10); border-radius:12px; padding:14px;">
          <div style="font-size:13px; color:rgba(234,240,255,0.8); margin-bottom:10px;">Login Credentials</div>
          <div style="font-size:13px;"><b>Username:</b> ${args.email}</div>
          <div style="font-size:13px; margin-top:6px;"><b>Password:</b> <span style="font-family:monospace;">${args.tempPassword}</span></div>
        </div>

        <div style="margin-top:16px;">
          <a href="${loginUrl}" style="display:inline-block; background:#4F67FF; color:#fff; text-decoration:none; padding:10px 14px; border-radius:12px; font-weight:bold; font-size:13px;">
            Login Now
          </a>
        </div>

        <p style="margin:14px 0 0 0; font-size:12px; color:rgba(234,240,255,0.6); line-height:1.5;">
          If you face any login issues, please reply to this email.
        </p>
      </div>
    </div>
  </div>
  `;

  const text = `Free Trial Access\nUsername: ${args.email}\nPassword: ${args.tempPassword}\nValid: ${args.expiresInDays} days\nLogin: ${loginUrl}`;

  return { subject, html, text };
}

export function userTrialExpiryReminderEmail(args: {
  email: string;
  daysLeft: number;
  expiresAt?: string;
}) {
  const app = process.env.APP_NAME || "RaceAutoAnalytics";
  const base = process.env.APP_BASE_URL || "";
  const loginUrl = `${base}/flash-reports`;

  const subject = `[${app}] Trial Expiry Reminder (${args.daysLeft} day${args.daysLeft === 1 ? "" : "s"} left)`;

  const html = `
  <div style="font-family:Arial,sans-serif; background:#050B1A; padding:24px; color:#EAF0FF;">
    <div style="max-width:640px; margin:0 auto; background:#0B1228; border:1px solid rgba(255,255,255,0.12); border-radius:16px; overflow:hidden;">
      <div style="padding:18px 18px 0 18px;">
        <h2 style="margin:0; font-size:18px;">Trial Expiry Reminder</h2>
        <p style="margin:8px 0 0 0; color:rgba(234,240,255,0.75); font-size:13px;">
          Your free trial will expire in <b>${args.daysLeft} day${args.daysLeft === 1 ? "" : "s"}</b>.
        </p>
      </div>
      <div style="padding:18px;">
        <a href="${loginUrl}" style="display:inline-block; background:#4F67FF; color:#fff; text-decoration:none; padding:10px 14px; border-radius:12px; font-weight:bold; font-size:13px;">
          Open Dashboard
        </a>
        <p style="margin:14px 0 0 0; font-size:12px; color:rgba(234,240,255,0.6); line-height:1.5;">
          If you want to continue access, please reply to this email for subscription options.
        </p>
      </div>
    </div>
  </div>
  `;

  const text = `Trial Expiry Reminder: ${args.daysLeft} day(s) left.\nLogin: ${loginUrl}`;
  return { subject, html, text };
}

export function userTrialExpiredEmail(args: { email: string }) {
  const app = process.env.APP_NAME || "RaceAutoAnalytics";
  const base = process.env.APP_BASE_URL || "";
  const url = `${base}/subscription`; // or your preferred page

  const subject = `[${app}] Trial Expired`;

  const html = `
  <div style="font-family:Arial,sans-serif; background:#050B1A; padding:24px; color:#EAF0FF;">
    <div style="max-width:640px; margin:0 auto; background:#0B1228; border:1px solid rgba(255,255,255,0.12); border-radius:16px; overflow:hidden;">
      <div style="padding:18px 18px 0 18px;">
        <h2 style="margin:0; font-size:18px;">Trial Expired</h2>
        <p style="margin:8px 0 0 0; color:rgba(234,240,255,0.75); font-size:13px;">
          Your free trial has expired. If you want to continue access, we can activate a subscription.
        </p>
      </div>
      <div style="padding:18px;">
        <a href="${url}" style="display:inline-block; background:#4F67FF; color:#fff; text-decoration:none; padding:10px 14px; border-radius:12px; font-weight:bold; font-size:13px;">
          View Subscription
        </a>
      </div>
    </div>
  </div>
  `;

  const text = `Trial Expired. View subscription: ${url}`;
  return { subject, html, text };
}