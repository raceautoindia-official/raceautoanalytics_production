"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Headphones, X, Check, Loader2, CalendarClock } from "lucide-react";

const TIME_SLOTS = [
  "10:00 AM – 11:00 AM",
  "11:00 AM – 12:00 PM",
  "12:00 PM – 1:00 PM",
  "2:00 PM – 3:00 PM",
  "3:00 PM – 4:00 PM",
  "4:00 PM – 5:00 PM",
  "5:00 PM – 6:00 PM",
];

const HELP_POINTS = [
  "Choose the right report or subscription",
  "Understand market trends and forecasts",
  "Access OEM, model and segment-level insights",
  "Find customised research solutions",
];

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

type FormState = {
  name: string;
  email: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  message: string;
};

const EMPTY: FormState = {
  name: "",
  email: "",
  phone: "",
  preferredDate: "",
  preferredTime: "",
  message: "",
};

export default function TalkToExpertWidget() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      window.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const setField = (k: keyof FormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  function closeAndReset() {
    setOpen(false);
    // Reset a moment later so the closing transition doesn't flash empty fields.
    setTimeout(() => {
      setSubmitted(false);
      setError(null);
      setForm(EMPTY);
    }, 200);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (
      !form.name.trim() ||
      !EMAIL_REGEX.test(form.email.trim()) ||
      !form.phone.trim() ||
      !form.preferredDate ||
      !form.preferredTime
    ) {
      setError("Please fill in your name, a valid email, phone, date and time.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/talk-to-expert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Submission failed");
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const labelCls = "block text-sm font-semibold text-slate-800";
  const inputCls =
    "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

  return (
    <>
      {/* Floating button — sits above the scroll-to-top button, bottom-right */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Talk to an Expert"
        className="group fixed bottom-24 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.45)] ring-1 ring-white/15 transition hover:from-blue-500 hover:to-indigo-500 hover:shadow-[0_16px_38px_rgba(37,99,235,0.55)] focus:outline-none focus:ring-2 focus:ring-blue-300 md:bottom-6 md:right-24"
      >
        <Headphones className="h-5 w-5" />
        <span className="hidden sm:inline">Talk to an Expert</span>
      </button>

      {!open ? null : (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <button
            aria-label="Close"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={closeAndReset}
            type="button"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tte-title"
            className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 pt-5 pb-4">
              <div>
                <h2 id="tte-title" className="text-xl font-extrabold tracking-tight text-slate-900">
                  Talk to an Expert
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  Not sure which report or subscription best fits your business?
                  Speak with our automotive analysts for personalised guidance.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAndReset}
                className="-mr-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body (scrolls) */}
            <div className="overflow-y-auto px-6 py-5">
              {submitted ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                    <Check className="h-7 w-7 text-emerald-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">Thank you!</h3>
                  <p className="mt-1.5 max-w-sm text-sm text-slate-500">
                    Your request has reached our team. One of our automotive
                    analysts will get back to you at your preferred time.
                  </p>
                  <button
                    type="button"
                    onClick={closeAndReset}
                    className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {/* What experts help with */}
                  <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700/80">
                      Our experts can help you
                    </p>
                    <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {HELP_POINTS.map((p) => (
                        <li key={p} className="flex items-start gap-2 text-[13px] text-slate-700">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className={labelCls} htmlFor="tte-name">
                        Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="tte-name"
                        type="text"
                        value={form.name}
                        onChange={(e) => setField("name", e.target.value)}
                        className={inputCls}
                        placeholder="Your full name"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelCls} htmlFor="tte-email">
                          Email <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="tte-email"
                          type="email"
                          value={form.email}
                          onChange={(e) => setField("email", e.target.value)}
                          className={inputCls}
                          placeholder="you@company.com"
                          required
                        />
                      </div>
                      <div>
                        <label className={labelCls} htmlFor="tte-phone">
                          Phone <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="tte-phone"
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setField("phone", e.target.value)}
                          className={inputCls}
                          placeholder="+91 ..."
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelCls} htmlFor="tte-date">
                          Preferred Date <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="tte-date"
                          type="date"
                          min={today}
                          value={form.preferredDate}
                          onChange={(e) => setField("preferredDate", e.target.value)}
                          className={inputCls}
                          required
                        />
                      </div>
                      <div>
                        <label className={labelCls} htmlFor="tte-time">
                          Preferred Time <span className="text-rose-500">*</span>
                        </label>
                        <select
                          id="tte-time"
                          value={form.preferredTime}
                          onChange={(e) => setField("preferredTime", e.target.value)}
                          className={inputCls}
                          required
                        >
                          <option value="">Select a time slot</option>
                          {TIME_SLOTS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={labelCls} htmlFor="tte-msg">
                        How can we help?{" "}
                        <span className="font-normal text-slate-400">(optional)</span>
                      </label>
                      <textarea
                        id="tte-msg"
                        value={form.message}
                        onChange={(e) => setField("message", e.target.value)}
                        rows={3}
                        className={inputCls + " resize-y"}
                        placeholder="Tell us briefly what you're looking for..."
                      />
                    </div>

                    {error && (
                      <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
                        {error}
                      </p>
                    )}

                    {/* Footer actions */}
                    <div className="flex flex-col-reverse items-stretch gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      {/* Real <button>, not <a>: globals.css forces
                          `a { color: inherit !important }`, which on this dark
                          site turns anchor text white → invisible on the white
                          modal. A button keeps the intended color. */}
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = "/subscription";
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                      >
                        <CalendarClock className="h-4 w-4" />
                        Become a Subscriber
                      </button>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={closeAndReset}
                          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                          {submitting ? "Submitting..." : "Submit"}
                        </button>
                      </div>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
