"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { CheckCircle, XCircle } from "lucide-react";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [values, setValues] = useState({ password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setValues((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (values.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (values.password !== values.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post("/api/admin/reset-password", {
        token,
        password: values.password,
      });
      setSuccess(res.data?.message || "Password reset successful.");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(
        axiosErr?.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white " +
    "placeholder:text-white/35 outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10";

  // No token in URL
  if (!token) {
    return (
      <div className="w-full max-w-sm rounded-[24px] border border-white/10 bg-[#0B1228] p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
        <XCircle className="mx-auto mb-3 text-red-400" size={36} />
        <div className="text-sm font-semibold text-white">Invalid Link</div>
        <p className="mt-2 text-xs text-white/60">
          This password reset link is invalid or missing. Please request a new one.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-6 h-10 w-full rounded-xl border border-white/15 bg-white/10 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          Go to Home
        </button>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="w-full max-w-sm rounded-[24px] border border-white/10 bg-[#0B1228] p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
        <CheckCircle className="mx-auto mb-3 text-green-400" size={36} />
        <div className="text-sm font-semibold text-white">Password Reset</div>
        <p className="mt-2 text-xs text-white/60">{success}</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-6 h-10 w-full rounded-xl bg-[#4F67FF] text-sm font-semibold text-white transition hover:bg-[#3B55FF]"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-[24px] border border-white/10 bg-[#0B1228] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
      {/* Subtle glow */}
      <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-80 -translate-x-1/2 rounded-full bg-[#4F67FF]/15 blur-3xl" />

      <div className="mb-6">
        <div className="text-base font-semibold text-white">Set New Password</div>
        <div className="mt-1 text-xs text-white/60">
          Choose a strong password of at least 8 characters.
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-white/70">
            New Password
          </label>
          <input
            name="password"
            type="password"
            value={values.password}
            onChange={onChange}
            placeholder="••••••••"
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-white/70">
            Confirm Password
          </label>
          <input
            name="confirmPassword"
            type="password"
            value={values.confirmPassword}
            onChange={onChange}
            placeholder="••••••••"
            className={inputCls}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-1 h-11 w-full rounded-xl bg-[#4F67FF] text-sm font-semibold text-white shadow-[0_12px_30px_rgba(79,103,255,0.25)] transition hover:bg-[#3B55FF] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
}
