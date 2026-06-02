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
      setError("Please complete all required fields and accept the contact consent.");
      setSubmitted(false);
      return;
    }

    setError("");
    setSubmitted(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6"
      aria-describedby="lead-form-note"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            className="block text-sm font-semibold text-slate-800"
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
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            placeholder="Tell us about your market intelligence requirement"
          />
        </div>
      </div>

      <label className="mt-4 flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
        <input
          type="checkbox"
          checked={form.consent}
          required
          onChange={(event) => updateField("consent", event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
        />
        <span>
          I agree to be contacted by Race Auto Analytics regarding reports,
          demos, and subscription information.
        </span>
      </label>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {submitted ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
          <p className="font-semibold">
            Thank you. Your sample report is now unlocked. Our team will contact
            you shortly.
          </p>
          <a
            href={SAMPLE_REPORT_URL}
            className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 sm:w-auto"
          >
            Download Sample Report
          </a>
        </div>
      ) : null}

      <button
        type="submit"
        className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:w-auto"
      >
        Submit & Unlock Sample Report
      </button>

      <p id="lead-form-note" className="mt-3 text-xs leading-5 text-slate-500">
        This form is frontend-only for now and can be connected to CRM, email,
        or database workflows later.
      </p>
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
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
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
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">
        {label}
      </label>
      <select
        id={id}
        name={id}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
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
