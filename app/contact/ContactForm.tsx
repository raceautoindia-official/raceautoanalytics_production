"use client";

import { useState } from "react";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-blue-400/60";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Failed to send");
      }
      setStatus("sent");
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Something went wrong");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-sm text-emerald-100">
        Thanks — your message has been received. Our team will get back to you at
        the email you provided.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-white/60">
            Name*
          </label>
          <input name="name" required className={inputCls} placeholder="Your name" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/60">
            Work email*
          </label>
          <input
            name="email"
            type="email"
            required
            className={inputCls}
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/60">
            Company
          </label>
          <input name="company" className={inputCls} placeholder="Company" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/60">
            Phone
          </label>
          <input name="phone" className={inputCls} placeholder="+91 …" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-white/60">
          Subject
        </label>
        <input
          name="subject"
          className={inputCls}
          placeholder="e.g., Subscription enquiry, sample report, partnership"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-white/60">
          Message*
        </label>
        <textarea
          name="message"
          required
          rows={5}
          className={inputCls}
          placeholder="How can we help?"
        />
      </div>

      {status === "error" && error && (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
