export const metadata = {
  title: "Password Reset",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050B1A] px-4 py-12">
      <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#0B1228] p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
        <div className="text-lg font-semibold text-white">
          Password reset moved
        </div>
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          Password is managed in Race Auto India. Please use the Race Auto India
          account flow to reset your password.
        </p>
        <a
          href="https://raceautoindia.com/forgot-password"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#4F67FF] px-5 text-sm font-semibold text-white transition hover:bg-[#3B55FF]"
        >
          Open Race Auto India
        </a>
      </div>
    </div>
  );
}
