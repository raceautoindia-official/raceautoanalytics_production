"use client";

import React, { useMemo, useState } from "react";

type Props = {
  onSuccess?: () => void;
  onBack?: () => void; // ✅ back to gate screen
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  segment: string;
  company?: string;
  description?: string;
};

export default function TrialRequestForm({ onSuccess, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState<string>("");

  const [step, setStep] = useState<1 | 2>(1);

  const segments = useMemo(
    () => [
      "Passenger Vehicles",
      "Commercial Vehicles",
      "Electric Vehicles",
      "Two-Wheelers",
      "Three-Wheelers",
      "Construction Equipment",
      "Farm Machinery",
      "Tyres",
      "Automotive Components",
      "Multi-Segment / Market Research",
    ],
    []
  );

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    segment: "",
    company: "",
    description: "",
  });

  const labelCls = "mb-1 block text-xs font-medium text-[#EAF0FF]/75";
  const inputBase =
    "h-10 w-full rounded-xl px-3 text-sm outline-none transition " +
    "bg-white/5 border border-white/10 text-[#EAF0FF] placeholder:text-[#EAF0FF]/45 " +
    "focus:ring-2 focus:ring-[#4F67FF]/35 focus:border-white/20";

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const validateStep1 = () => {
    if (!form.name.trim()) return "Name is required";
    if (!form.email.trim()) return "Email is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Enter a valid email";
    if (!form.phone.trim()) return "Phone number is required";
    return "";
  };

  const validateStep2 = () => {
    if (!form.segment.trim()) return "Select a segment";
    return "";
  };

  const goNext = () => {
    setErr("");
    const v = validateStep1();
    if (v) {
      setErr(v);
      return;
    }
    setStep(2);
  };

  const goBackStep = () => {
    setErr("");
    setStep(1);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    const v1 = validateStep1();
    if (v1) {
      setErr(v1);
      setStep(1);
      return;
    }

    const v2 = validateStep2();
    if (v2) {
      setErr(v2);
      setStep(2);
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/trial-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          segment: form.segment.trim(),
          company: form.company?.trim() || null,
          description: form.description?.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to submit request");

      setSubmitted(true);
      onSuccess?.();
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0E1833]/70 p-4">
        <div className="text-sm font-semibold text-[#EAF0FF]">Request submitted ✅</div>
        <div className="mt-1 text-xs text-[#EAF0FF]/70 leading-5">
          Our team will verify the details and follow up via email.
        </div>

        {/* optional: back to gate after submit */}
        {onBack && (
          <button
            type="button"
            onClick={() => onBack()}
            className="mt-4 h-10 w-full rounded-xl border border-white/10 bg-white/5 text-[#EAF0FF] font-semibold hover:bg-white/10 transition"
          >
            Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0E1833]/70 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#EAF0FF]">Request Free Trial</div>
          <div className="mt-1 text-xs text-[#EAF0FF]/70">
            {step === 1
              ? "Step 1 of 2 — Basic details"
              : "Step 2 of 2 — Additional details"}
          </div>
        </div>

        {/* Right side: step pills + back to gate */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div
              className={[
                "h-2.5 w-8 rounded-full",
                step === 1 ? "bg-[#4F67FF]" : "bg-white/10",
              ].join(" ")}
            />
            <div
              className={[
                "h-2.5 w-8 rounded-full",
                step === 2 ? "bg-[#4F67FF]" : "bg-white/10",
              ].join(" ")}
            />
          </div>

          {onBack && (
            <button
              type="button"
              onClick={() => onBack()}
              className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-[#EAF0FF] hover:bg-white/10 transition"
              title="Back"
            >
              Back
            </button>
          )}
        </div>
      </div>

      {err ? (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-2.5">
        {step === 1 && (
          <>
            <div>
              <label className={labelCls}>Name</label>
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="Enter your name"
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
                className={inputBase}
              />
            </div>

            <button
              type="button"
              onClick={goNext}
              className="mt-2 h-10 w-full rounded-xl bg-[#4F67FF] text-white font-semibold shadow-[0_12px_30px_rgba(79,103,255,0.25)] hover:bg-[#3B55FF] transition"
            >
              Next
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <label className={labelCls}>Segment</label>
              <select
                name="segment"
                value={form.segment}
                onChange={onChange}
                className={inputBase}
              >
                <option value="" disabled className="bg-[#0B1228]">
                  Select segment
                </option>
                {segments.map((s) => (
                  <option key={s} value={s} className="bg-[#0B1228]">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>
                Company Name <span className="text-[#EAF0FF]/45">(optional)</span>
              </label>
              <input
                name="company"
                value={form.company || ""}
                onChange={onChange}
                placeholder="Company name"
                className={inputBase}
              />
            </div>

            <div>
              <label className={labelCls}>
                Description <span className="text-[#EAF0FF]/45">(optional)</span>
              </label>
              <textarea
                name="description"
                value={form.description || ""}
                onChange={onChange}
                placeholder="Tell us what you want to access..."
                className="min-h-[76px] w-full rounded-xl px-3 py-2 text-sm outline-none transition bg-white/5 border border-white/10 text-[#EAF0FF] placeholder:text-[#EAF0FF]/45 focus:ring-2 focus:ring-[#4F67FF]/35 focus:border-white/20"
              />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={goBackStep}
                className="h-10 rounded-xl border border-white/10 bg-white/5 text-[#EAF0FF] font-semibold hover:bg-white/10 transition"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={loading}
                className="h-10 rounded-xl bg-[#4F67FF] text-white font-semibold shadow-[0_12px_30px_rgba(79,103,255,0.25)] hover:bg-[#3B55FF] transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}