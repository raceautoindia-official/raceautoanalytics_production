"use client";

import React, { useState } from "react";
import { Rocket } from "lucide-react";

type Props = {
  onSuccess?: () => void;
  onBack?: () => void;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

export default function TrialRequestForm({ onSuccess, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [trialActive, setTrialActive] = useState(false);
  const [trialExpiresAt, setTrialExpiresAt] = useState<string>("");

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const labelCls = "mb-1 block text-xs font-medium text-[#EAF0FF]/75";
  const inputBase =
    "h-10 w-full rounded-xl px-3 text-sm outline-none transition " +
    "bg-white/5 border border-white/10 text-[#EAF0FF] placeholder:text-[#EAF0FF]/45 " +
    "focus:ring-2 focus:ring-[#4F67FF]/35 focus:border-white/20";

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErr("");
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    if (!form.name.trim()) return "Name is required";
    if (!form.email.trim()) return "Email is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Enter a valid email";
    if (!form.phone.trim()) return "Phone number is required";
    if (!form.password || form.password.length < 6)
      return "Password must be at least 6 characters";
    return "";
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/free-trial/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          password: form.password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Surface the backend message directly (duplicate email, etc.)
        setErr(data?.message || "Something went wrong. Please try again.");
        return;
      }

      setTrialExpiresAt(data?.trialExpiresAt || "");
      setTrialActive(true);
      onSuccess?.();
    } catch (e: any) {
      setErr(e?.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ────────────────────────────────────────────────────────────
  if (trialActive) {
    let secondsLabel = "60 seconds";
    if (trialExpiresAt) {
      const ms = new Date(trialExpiresAt).getTime() - Date.now();
      const secs = Math.max(1, Math.round(ms / 1000));
      secondsLabel = `${secs} second${secs !== 1 ? "s" : ""}`;
    }

    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-[#0E1833]/70 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
            <Rocket className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-emerald-300">
              Account created successfully.
            </div>
            <div className="mt-1 text-xs leading-relaxed text-[#EAF0FF]/70">
              Your free trial access is active for{" "}
              <span className="font-semibold text-[#EAF0FF]">{secondsLabel}</span>.
              You now have full access to Flash Reports, Forecast, and all
              premium data.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            // Reload so the new authToken cookie is picked up across the app
            window.location.href = "/flash-reports";
          }}
          className="mt-5 h-10 w-full rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition shadow-[0_8px_24px_rgba(16,185,129,0.25)]"
        >
          Start Exploring
        </button>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0E1833]/70 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#EAF0FF]">
            Start Your Free Trial
          </div>
          <div className="mt-0.5 text-xs text-[#EAF0FF]/60">
            Create your account and get 10 minutes of full access — instantly.
          </div>
        </div>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="h-9 flex-shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-[#EAF0FF] hover:bg-white/10 transition"
          >
            Back
          </button>
        )}
      </div>

      {err && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {err}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-2.5">
        <div>
          <label className={labelCls}>Name</label>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="Your full name"
            autoComplete="name"
            className={inputBase}
          />
        </div>

        <div>
          <label className={labelCls}>Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            placeholder="name@company.com"
            autoComplete="email"
            className={inputBase}
          />
        </div>

        <div>
          <label className={labelCls}>Phone Number</label>
          <input
            name="phone"
            value={form.phone}
            onChange={onChange}
            placeholder="+91..."
            autoComplete="tel"
            className={inputBase}
          />
        </div>

        <div>
          <label className={labelCls}>Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            className={inputBase}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 h-10 w-full rounded-xl bg-[#4F67FF] text-white text-sm font-semibold shadow-[0_12px_30px_rgba(79,103,255,0.25)] hover:bg-[#3B55FF] transition disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Creating account…" : "Activate Free Trial"}
        </button>

        <p className="text-center text-[11px] text-[#EAF0FF]/35">
          One free trial per email. No credit card required.
        </p>
      </form>
    </div>
  );
}
