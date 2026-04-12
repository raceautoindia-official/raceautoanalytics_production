import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata = {
  title: "Reset Password",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050B1A] px-4 py-12">
      <Suspense
        fallback={
          <div className="text-sm text-white/50">Loading...</div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
