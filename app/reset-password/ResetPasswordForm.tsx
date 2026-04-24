"use client";

export default function ResetPasswordForm() {
  return (
    <div className="w-full max-w-sm rounded-[24px] border border-white/10 bg-[#0B1228] p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
      <div className="text-sm font-semibold text-white">Password reset moved</div>
      <p className="mt-2 text-xs text-white/60">
        Password reset is managed by Race Auto India. Continue there to reset
        your password.
      </p>
      <a
        href="https://raceautoindia.com/forgot-password"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#4F67FF] text-sm font-semibold text-white transition hover:bg-[#3B55FF]"
      >
        Open Race Auto India
      </a>
    </div>
  );
}
