"use client";

import { type FormEvent, useMemo, useState } from "react";

const SAMPLE_REPORT_URL =
  "/sample-reports/race-auto-analytics-sample-report.pdf";

type FormState = {
  fullName: string;
  email: string;
  company: string;
  phone: string;
  country: string;
  userType: string;
  interest: string;
  message: string;
  consent: boolean;
};

const initialFormState: FormState = {
  fullName: "",
  email: "",
  company: "",
  phone: "",
  country: "",
  userType: "",
  interest: "",
  message: "",
  consent: false,
};

const userTypes = [
  "OEM",
  "Supplier",
  "Dealer / Distributor",
  "Consultant",
  "Investor",
  "Research / Media",
  "Other",
];

const interests = [
  "Vehicle Sales Forecast",
  "Flash Reports",
  "OEM Market Share",
  "EV Market Insights",
  "Country-wise Data",
  "Subscription / Demo",
];

export default function LeadCaptureForm() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const isComplete = useMemo(
    () =>
      Boolean(
        form.fullName.trim() &&
          form.email.trim() &&
          form.company.trim() &&
          form.phone.trim() &&
          form.country.trim() &&
          form.userType &&
          form.interest &&
          form.message.trim() &&
          form.consent,
      ),
    [form],
  );

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    if (error) setError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isComplete) {
      setError(
        "Please complete all required fields and accept the contact consent.",
      );
      setSubmitted(false);
      return;
    }

    setError("");
    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TextField
          id="fullName"
          label="Full Name"
          value={form.fullName}
          onChange={(value) => updateField("fullName", value)}
        />
        <TextField
          id="email"
          label="Business Email"
          type="email"
          value={form.email}
          onChange={(value) => updateField("email", value)}
        />
        <TextField
          id="company"
          label="Company Name"
          value={form.company}
          onChange={(value) => updateField("company", value)}
        />
        <TextField
          id="phone"
          label="Phone Number"
          type="tel"
          value={form.phone}
          onChange={(value) => updateField("phone", value)}
        />
        <TextField
          id="country"
          label="Country"
          value={form.country}
          onChange={(value) => updateField("country", value)}
        />
        <SelectField
          id="userType"
          label="User Type"
          value={form.userType}
          options={userTypes}
          onChange={(value) => updateField("userType", value)}
        />
        <div className="md:col-span-2">
          <SelectField
            id="interest"
            label="Interest"
            value={form.interest}
            options={interests}
            onChange={(value) => updateField("interest", value)}
          />
        </div>
        <div className="md:col-span-2">
          <label
            htmlFor="message"
            className="block text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
          >
            Message
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={4}
            value={form.message}
            onChange={(event) => updateField("message", event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-blue-300/50 focus:ring-2 focus:ring-blue-500/20"
            placeholder="Tell us about your market intelligence requirement"
          />
        </div>
      </div>

      <label className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-white/70">
        <input
          type="checkbox"
          checked={form.consent}
          required
          onChange={(event) => updateField("consent", event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-blue-600 focus:ring-blue-400"
        />
        <span>
          I agree to be contacted by Race Auto Analytics regarding reports,
          demos, and subscription information.
        </span>
      </label>

      {error ? (
        <p className="rounded-xl border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-100">
          {error}
        </p>
      ) : null}

      {submitted ? (
        <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-100">
          <p className="font-semibold">
            Thank you. Your sample report is now unlocked. Our team will contact
            you shortly.
          </p>
          <a
            href={SAMPLE_REPORT_URL}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-300 sm:w-auto"
          >
            Download Sample Report
          </a>
        </div>
      ) : null}

      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
      >
        Submit & Unlock Sample Report
      </button>
    </form>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-blue-300/50 focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
      >
        {label}
      </label>
      <select
        id={id}
        name={id}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-300/50 focus:ring-2 focus:ring-blue-500/20"
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
