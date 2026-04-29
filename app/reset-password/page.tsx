// Audit PO-4: previous title "Password Reset" misled users into thinking the
// reset happens in this app. It actually opens raceautoindia.com. Title and
// page copy now accurately describe the destination so users know where they
// will end up before clicking.
export const metadata = {
  title: "Reset password on Race Auto India",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050B1A] px-4 py-12">
      <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#0B1228] p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
        <div className="text-lg font-semibold text-white">
          Password reset is handled on Race Auto India
        </div>
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          Your account credentials are managed by our parent site,{" "}
          <span className="text-white">raceautoindia.com</span>. Click the
          button below to open their password reset flow in a new tab. After
          resetting, return here and sign in with your new password.
        </p>
        <a
          href="https://raceautoindia.com/forgot-password"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#4F67FF] px-5 text-sm font-semibold text-white transition hover:bg-[#3B55FF]"
        >
          Open Race Auto India ↗
        </a>
        <p className="mt-4 text-[11px] text-white/40">
          Opens in a new tab. You can come back here and log in afterwards.
        </p>
      </div>
    </div>
  );
}
