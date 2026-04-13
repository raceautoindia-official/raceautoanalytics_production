"use client";

import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import GoogleLogin from "./GoogleLogin"; // keep existing component

export default function LoginForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [values, setValues] = useState({ email: "", password: "" });

  const onChange = (e) => {
    setError("");
    setValues((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);

      // Auth is now validated server-side in forecast-login
      await axios.post("/api/admin/forecast-login", values);

      toast.success("Login successful");
      onSuccess?.();
      window.location.reload();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Login failed. Please check your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <div className="text-sm font-semibold text-white">Welcome back</div>
        <div className="mt-1 text-xs text-white/65">
          Enter your credentials to continue.
        </div>
      </div>

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
            name="email"
            type="email"
            value={values.email}
            onChange={onChange}
            placeholder="name@company.com"
            className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10"
            required
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-white/70">
              Password
            </label>
            <a
              href="https://raceautoindia.com/forgot-password"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#4F67FF] hover:text-[#7B90FF] transition"
            >
              Forgot Password?
            </a>
          </div>
          <input
            name="password"
            type="password"
            value={values.password}
            onChange={onChange}
            placeholder="••••••••"
            className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 h-11 w-full rounded-xl border border-white/15 bg-white/10 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Login"}
        </button>

        <div className="flex items-center gap-3 py-2">
          <div className="h-px flex-1 bg-white/10" />
          <div className="text-[11px] text-white/50">OR</div>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Google login stays same logic, only style in its component */}
        <GoogleLogin />
      </form>
    </div>
  );
}
