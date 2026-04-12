"use client";

import React, { useState } from "react";
import axios from "axios";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordForm({ onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      setLoading(true);
      const res = await axios.post("/api/admin/forgot-password", { email });
      setSuccess(res.data?.message || "Reset link sent.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-xs text-white/55 hover:text-white transition"
      >
        <ArrowLeft size={13} />
        Back to Login
      </button>

      <div className="mb-4">
        <div className="text-sm font-semibold text-white">Reset Password</div>
        <div className="mt-1 text-xs text-white/65">
          Enter your email and we&apos;ll send you a reset link.
        </div>
      </div>

      {success && (
        <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-200">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-white/70">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
              setSuccess("");
            }}
            placeholder="name@company.com"
            className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !!success}
          className="mt-2 h-11 w-full rounded-xl border border-white/15 bg-white/10 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
    </div>
  );
}
