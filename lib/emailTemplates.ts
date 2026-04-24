export function passwordResetEmail(args: { email: string; resetUrl: string }) {
  const app = process.env.APP_NAME || "RaceAutoAnalytics";

  const subject = `[${app}] Password Reset Request`;

  const html = `
  <div style="font-family:Arial,sans-serif; background:#050B1A; padding:24px; color:#EAF0FF;">
    <div style="max-width:640px; margin:0 auto; background:#0B1228; border:1px solid rgba(255,255,255,0.12); border-radius:16px; overflow:hidden;">
      <div style="padding:18px 18px 0 18px;">
        <h2 style="margin:0; font-size:18px;">Password Reset</h2>
        <p style="margin:8px 0 0 0; color:rgba(234,240,255,0.75); font-size:13px;">
          We received a request to reset the password for <b>${args.email}</b>.
          Click the button below to set a new password.
        </p>
      </div>
      <div style="padding:18px;">
        <div style="margin-bottom:16px;">
          <a href="${args.resetUrl}"
            style="display:inline-block; background:#4F67FF; color:#fff; text-decoration:none;
                   padding:10px 18px; border-radius:12px; font-weight:bold; font-size:13px;">
            Reset Password
          </a>
        </div>
        <p style="margin:0; font-size:12px; color:rgba(234,240,255,0.5); line-height:1.5;">
          This link expires in <b>1 hour</b>. If you did not request a password reset,
          you can safely ignore this email and your password will not be changed.
        </p>
        <p style="margin:10px 0 0 0; font-size:11px; color:rgba(234,240,255,0.35); word-break:break-all;">
          ${args.resetUrl}
        </p>
      </div>
    </div>
  </div>
  `;

  const text = `Password Reset\n\nReset your password here:\n${args.resetUrl}\n\nThis link expires in 1 hour.\nIf you did not request this, ignore this email.`;

  return { subject, html, text };
}

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

  const subject = `[${app}] New one time access Request`;

  const html = `
  <div style="font-family:Arial,sans-serif; background:#050B1A; padding:24px; color:#EAF0FF;">
    <div style="max-width:640px; margin:0 auto; background:#0B1228; border:1px solid rgba(255,255,255,0.12); border-radius:16px; overflow:hidden;">
      <div style="padding:18px 18px 0 18px;">
        <h2 style="margin:0; font-size:18px;">New one time access Request</h2>
        <p style="margin:8px 0 0 0; color:rgba(234,240,255,0.75); font-size:13px;">
          A user has requested one time access access.
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

  const text = `New one time access Request\nName: ${lead.name}\nEmail: ${lead.email}\nPhone: ${lead.phone}\nSegment: ${lead.segment}\nCompany: ${lead.company || "-"}\nAdmin Panel: ${adminUrl}`;

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

  const subject = `[${app}] Your one time access Access Details (Valid ${args.expiresInDays} days)`;

  const html = `
  <div style="font-family:Arial,sans-serif; background:#050B1A; padding:24px; color:#EAF0FF;">
    <div style="max-width:640px; margin:0 auto; background:#0B1228; border:1px solid rgba(255,255,255,0.12); border-radius:16px; overflow:hidden;">
      <div style="padding:18px 18px 0 18px;">
        <h2 style="margin:0; font-size:18px;">one time access Access</h2>
        <p style="margin:8px 0 0 0; color:rgba(234,240,255,0.75); font-size:13px;">
          Your one time access access is provided for <b>${args.expiresInDays} days</b>.
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

  const text = `one time access Access\nUsername: ${args.email}\nPassword: ${args.tempPassword}\nValid: ${args.expiresInDays} days\nLogin: ${loginUrl}`;

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
          Your one time access will expire in <b>${args.daysLeft} day${args.daysLeft === 1 ? "" : "s"}</b>.
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
  const url = `${base}/subscription`;

  const subject = `[${app}] Trial Expired`;

  const html = `
  <div style="font-family:Arial,sans-serif; background:#050B1A; padding:24px; color:#EAF0FF;">
    <div style="max-width:640px; margin:0 auto; background:#0B1228; border:1px solid rgba(255,255,255,0.12); border-radius:16px; overflow:hidden;">
      <div style="padding:18px 18px 0 18px;">
        <h2 style="margin:0; font-size:18px;">Trial Expired</h2>
        <p style="margin:8px 0 0 0; color:rgba(234,240,255,0.75); font-size:13px;">
          Your one time access has expired. If you want to continue access, we can activate a subscription.
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

export function userWelcomeEmail(args: { email: string; name?: string }) {
  const app = process.env.APP_NAME || "RaceAutoAnalytics";
  const base = process.env.APP_BASE_URL || "";
  const dashboardUrl = `${base}/flash-reports`;
  const subscriptionUrl = `${base}/subscription`;

  const subject = `[${app}] Welcome to ${app}`;
  const greetingName = args.name?.trim() || args.email;

  const html = `
  <div style="margin:0; padding:24px 12px; background:#F3F6FF; font-family:Arial,sans-serif; color:#0B1228;">
    <div style="max-width:640px; margin:0 auto; background:#FFFFFF; border:1px solid #E1E8FF; border-radius:16px; overflow:hidden;">
      <div style="padding:16px 18px; background:#0B1228; color:#EAF0FF;">
        <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#AFC2FF;">Race Auto Analytics</div>
        <h2 style="margin:8px 0 0 0; font-size:20px; line-height:1.3;">Welcome to ${app}</h2>
      </div>
      <div style="padding:18px;">
        <p style="margin:0; font-size:14px; line-height:1.7; color:#1C2440;">
          Hi <b>${greetingName}</b>, your account has been created successfully.
          You can now access your dashboard and explore subscription plans based on your needs.
        </p>
        <div style="margin-top:14px; border:1px solid #E6ECFF; border-radius:12px; padding:12px; background:#F8FAFF;">
          <div style="font-size:12px; color:#4F67FF; font-weight:700;">Account Summary</div>
          <div style="margin-top:6px; font-size:13px; color:#223055;"><b>Email:</b> ${args.email}</div>
        </div>
        <div style="margin-top:16px;">
          <a href="${dashboardUrl}" style="display:inline-block; background:#4F67FF; color:#fff; text-decoration:none; padding:10px 14px; border-radius:10px; font-weight:700; font-size:13px; margin-right:8px;">
            Open Dashboard
          </a>
          <a href="${subscriptionUrl}" style="display:inline-block; background:#EAF0FF; color:#1C2440; text-decoration:none; padding:10px 14px; border-radius:10px; font-weight:700; font-size:13px;">
            View Subscription
          </a>
        </div>
      </div>
      <div style="padding:12px 18px; border-top:1px solid #E6ECFF; background:#FAFCFF; font-size:11px; color:#69759A;">
        ${app} | Market intelligence for automotive and industrial equipment sectors
      </div>
    </div>
  </div>
  `;

  const text = `Welcome to ${app}, ${greetingName}. Your account is ready. Open dashboard: ${dashboardUrl}. View subscription: ${subscriptionUrl}`;
  return { subject, html, text };
}

export function subscriptionPurchaseSuccessEmail(args: {
  email: string;
  planName: string;
  amount?: number | null;
  currency?: string | null;
  purchaseDate?: string | null;
  renewalDate?: string | null;
  paymentReference?: string | null;
}) {
  const app = process.env.APP_NAME || "RaceAutoAnalytics";
  const base = process.env.APP_BASE_URL || "";
  const subscriptionUrl = `${base}/subscription`;
  const dashboardUrl = `${base}/settings`;
  const currency = (args.currency || "INR").toUpperCase();
  const amountText =
    typeof args.amount === "number" && Number.isFinite(args.amount)
      ? `${currency} ${args.amount}`
      : "N/A";

  const subject = `[${app}] Subscription Activated - ${args.planName}`;
  const html = `
  <div style="margin:0; padding:24px 12px; background:#F3F6FF; font-family:Arial,sans-serif; color:#0B1228;">
    <div style="max-width:640px; margin:0 auto; background:#FFFFFF; border:1px solid #DDE7FF; border-radius:16px; overflow:hidden;">
      <div style="padding:16px 18px; background:#0B1228; color:#EAF0FF;">
        <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#AFC2FF;">Payment Confirmation</div>
        <h2 style="margin:8px 0 0 0; font-size:20px; line-height:1.3;">Subscription Activated</h2>
      </div>
      <div style="padding:18px;">
        <p style="margin:0; font-size:14px; line-height:1.7; color:#1C2440;">
          Your subscription has been activated successfully. Here are your billing details:
        </p>
        <table style="width:100%; border-collapse:collapse; font-size:13px; margin-top:14px; border:1px solid #E6ECFF;">
          <tr><td style="padding:8px 10px; color:#5B6689; background:#F8FAFF; width:42%;">Plan</td><td style="padding:8px 10px; color:#1C2440;">${args.planName}</td></tr>
          <tr><td style="padding:8px 10px; color:#5B6689; background:#F8FAFF;">Amount</td><td style="padding:8px 10px; color:#1C2440;">${amountText}</td></tr>
          <tr><td style="padding:8px 10px; color:#5B6689; background:#F8FAFF;">Purchase Date</td><td style="padding:8px 10px; color:#1C2440;">${args.purchaseDate || "N/A"}</td></tr>
          <tr><td style="padding:8px 10px; color:#5B6689; background:#F8FAFF;">Expiry / Renewal</td><td style="padding:8px 10px; color:#1C2440;">${args.renewalDate || "N/A"}</td></tr>
          <tr><td style="padding:8px 10px; color:#5B6689; background:#F8FAFF;">Reference</td><td style="padding:8px 10px; color:#1C2440;">${args.paymentReference || "N/A"}</td></tr>
        </table>
        <div style="margin-top:16px;">
          <a href="${dashboardUrl}" style="display:inline-block; background:#4F67FF; color:#fff; text-decoration:none; padding:10px 14px; border-radius:10px; font-weight:700; font-size:13px; margin-right:8px;">
            Go to Profile
          </a>
          <a href="${subscriptionUrl}" style="display:inline-block; background:#EAF0FF; color:#1C2440; text-decoration:none; padding:10px 14px; border-radius:10px; font-weight:700; font-size:13px;">
            Manage Subscription
          </a>
        </div>
      </div>
      <div style="padding:12px 18px; border-top:1px solid #E6ECFF; background:#FAFCFF; font-size:11px; color:#69759A;">
        ${app} secure payments powered by Razorpay
      </div>
    </div>
  </div>
  `;

  const text = `Subscription activated. Plan: ${args.planName}. Amount: ${amountText}. Purchase Date: ${args.purchaseDate || "N/A"}. Renewal: ${args.renewalDate || "N/A"}. Reference: ${args.paymentReference || "N/A"}.`;
  return { subject, html, text };
}

export function subscriptionExpiryReminderEmail(args: {
  email: string;
  daysLeft: number;
}) {
  const app = process.env.APP_NAME || "RaceAutoAnalytics";
  const base = process.env.APP_BASE_URL || "";
  const renewUrl = `${base}/subscription`;
  const dayCopy = args.daysLeft === 1 ? "tomorrow" : `in ${args.daysLeft} days`;
  const sentence = `Your subscription will expire ${dayCopy}. Renew soon to continue uninterrupted access.`;

  const subject = `[${app}] Subscription Expiry Reminder`;
  const html = `
  <div style="margin:0; padding:24px 12px; background:#F3F6FF; font-family:Arial,sans-serif; color:#0B1228;">
    <div style="max-width:640px; margin:0 auto; background:#FFFFFF; border:1px solid #DDE7FF; border-radius:16px; overflow:hidden;">
      <div style="padding:16px 18px; background:#0B1228; color:#EAF0FF;">
        <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#AFC2FF;">Subscription Reminder</div>
        <h2 style="margin:8px 0 0 0; font-size:20px; line-height:1.3;">Renewal Due Soon</h2>
      </div>
      <div style="padding:18px;">
        <p style="margin:0; font-size:14px; line-height:1.7; color:#1C2440;">
          ${sentence}
        </p>
        <div style="margin-top:14px; border:1px solid #FFE3AA; background:#FFF9EC; border-radius:12px; padding:10px 12px; font-size:12px; color:#7A5B1B;">
          Keep your analytics and entitlements active by renewing before expiry.
        </div>
        <div style="margin-top:16px;">
          <a href="${renewUrl}" style="display:inline-block; background:#4F67FF; color:#fff; text-decoration:none; padding:10px 14px; border-radius:10px; font-weight:700; font-size:13px;">
            Renew Subscription
          </a>
        </div>
      </div>
      <div style="padding:12px 18px; border-top:1px solid #E6ECFF; background:#FAFCFF; font-size:11px; color:#69759A;">
        ${app} | Your trusted automotive intelligence platform
      </div>
    </div>
  </div>
  `;

  return { subject, html, text: sentence };
}

export function enterpriseInquiryEmail(args: {
  name: string;
  email: string;
  phone: string;
  company: string;
  requirement: string;
  planType?: string | null;
}) {
  const app = process.env.APP_NAME || "RaceAutoAnalytics";
  const subject = `[${app}] Enterprise Inquiry - ${args.company || args.name}`;
  const html = `
  <div style="font-family:Arial,sans-serif; background:#050B1A; padding:24px; color:#EAF0FF;">
    <div style="max-width:640px; margin:0 auto; background:#0B1228; border:1px solid rgba(255,255,255,0.12); border-radius:16px; overflow:hidden;">
      <div style="padding:18px 18px 0 18px;">
        <h2 style="margin:0; font-size:18px;">New Enterprise Inquiry</h2>
      </div>
      <div style="padding:18px;">
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <tr><td style="padding:6px 0; color:rgba(234,240,255,0.6);">Name</td><td style="padding:6px 0;">${args.name}</td></tr>
          <tr><td style="padding:6px 0; color:rgba(234,240,255,0.6);">Email</td><td style="padding:6px 0;">${args.email}</td></tr>
          <tr><td style="padding:6px 0; color:rgba(234,240,255,0.6);">Phone</td><td style="padding:6px 0;">${args.phone}</td></tr>
          <tr><td style="padding:6px 0; color:rgba(234,240,255,0.6);">Company</td><td style="padding:6px 0;">${args.company}</td></tr>
          <tr><td style="padding:6px 0; color:rgba(234,240,255,0.6);">Plan Context</td><td style="padding:6px 0;">${args.planType || "Custom Plan"}</td></tr>
        </table>
        <p style="margin:12px 0 0 0; color:rgba(234,240,255,0.9); font-size:13px; line-height:1.6;">
          <b>Requirement:</b><br />${args.requirement}
        </p>
      </div>
    </div>
  </div>
  `;
  const text = `Enterprise inquiry from ${args.name} (${args.email}, ${args.phone}) - ${args.company}. Requirement: ${args.requirement}`;
  return { subject, html, text };
}
