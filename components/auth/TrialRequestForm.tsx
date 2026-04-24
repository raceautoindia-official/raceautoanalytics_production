"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Rocket } from "lucide-react";
import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import CodeInput from "@/app/flash-reports/components/Login/CodeInput";

type Props = {
  onSuccess?: () => void;
  onBack?: () => void;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
  verificationMode: "email" | "phone" | "both";
};

type PendingVerificationState = {
  pendingEmail?: boolean;
  pendingPhone?: boolean;
  completed?: boolean;
};

type TrialRegisterResponse = {
  email?: string;
  mobile?: string;
  pending?: PendingVerificationState;
  cooldowns?: {
    emailResendSeconds?: number;
    otpResendSeconds?: number;
  };
  error_code?: string;
  message?: string;
};

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

const normalizeMobile = (input: string) => {
  if (!input || typeof input !== "string") return "";
  let cleaned = input.trim().replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("00")) cleaned = `+${cleaned.slice(2)}`;

  if (cleaned.startsWith("+")) {
    cleaned = `+${cleaned.slice(1).replace(/\D/g, "")}`;
  } else {
    const digits = cleaned.replace(/\D/g, "");
    if (digits.length === 10) cleaned = `+91${digits}`;
    else if (digits.length >= 8 && digits.length <= 15) cleaned = `+${digits}`;
    else return "";
  }

  return /^\+[1-9]\d{7,14}$/.test(cleaned) ? cleaned : "";
};

const maskEmail = (email?: string | null) => {
  if (!email) return "";
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  if (name.length <= 2) return `${name[0] || "*"}*@${domain}`;
  return `${name[0]}${"*".repeat(Math.max(1, name.length - 2))}${name[name.length - 1]}@${domain}`;
};

const maskMobile = (mobile?: string | null) => {
  if (!mobile) return "";
  const digits = String(mobile).replace(/\D/g, "");
  if (digits.length < 4) return mobile;
  return `+**${"*".repeat(Math.max(2, digits.length - 6))}${digits.slice(-4)}`;
};

export default function TrialRequestForm({ onSuccess, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [trialActive, setTrialActive] = useState(false);
  const [verificationState, setVerificationState] =
    useState<PendingVerificationState | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredMobile, setRegisteredMobile] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [activeMethod, setActiveMethod] = useState<"email" | "phone">("email");
  const [firebaseConfirmation, setFirebaseConfirmation] =
    useState<ConfirmationResult | null>(null);
  const [completionToastShown, setCompletionToastShown] = useState(false);
  const [cooldowns, setCooldowns] = useState({
    emailResendSeconds: 0,
    otpResendSeconds: 0,
  });
  const [busy, setBusy] = useState({
    verifyEmail: false,
    resendEmail: false,
    verifyPhone: false,
    resendPhone: false,
  });

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    password: "",
    verificationMode: "email",
  });

  const labelCls = "mb-1 block text-xs font-medium text-[#EAF0FF]/75";
  const inputBase =
    "h-10 w-full rounded-xl px-3 text-sm outline-none transition " +
    "bg-white/5 border border-white/10 text-[#EAF0FF] placeholder:text-[#EAF0FF]/45 " +
    "focus:ring-2 focus:ring-[#4F67FF]/35 focus:border-white/20";

  useEffect(() => {
    const timer = setInterval(() => {
      setCooldowns((prev) => ({
        emailResendSeconds: Math.max(0, (prev.emailResendSeconds || 0) - 1),
        otpResendSeconds: Math.max(0, (prev.otpResendSeconds || 0) - 1),
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    };
  }, []);

  useEffect(() => {
    if (!verificationState) return;
    if (verificationState.pendingEmail) {
      setActiveMethod("email");
      return;
    }
    if (verificationState.pendingPhone) {
      setActiveMethod("phone");
    }
  }, [verificationState]);

  const isVerified = useMemo(() => {
    if (!verificationState) return false;
    return Boolean(verificationState.completed);
  }, [verificationState]);

  useEffect(() => {
    if (!isVerified) {
      if (completionToastShown) setCompletionToastShown(false);
      return;
    }

    if (completionToastShown) return;
    setCompletionToastShown(true);
    setTrialActive(true);
    onSuccess?.();
    const timer = window.setTimeout(() => {
      window.location.reload();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [isVerified, completionToastShown, onSuccess]);

  const getFirebaseErrorMessage = (error: unknown, fallback: string) => {
    const errObj = error as
      | { code?: string; response?: { data?: { code?: string; message?: string } }; message?: string }
      | undefined;
    const code = errObj?.code || errObj?.response?.data?.code;
    if (code === "auth/invalid-verification-code") return "Invalid OTP. Please try again.";
    if (code === "auth/code-expired") return "OTP has expired. Please request a new OTP.";
    if (code === "auth/too-many-requests") return "Too many OTP attempts. Please wait and retry.";
    if (code === "auth/invalid-phone-number") return "Invalid phone number format.";
    return errObj?.response?.data?.message || errObj?.message || fallback;
  };

  const hydratePendingVerification = (payload: TrialRegisterResponse) => {
    if (!payload?.pending) return;
    setRegisteredEmail(payload?.email || form.email.trim().toLowerCase());
    setRegisteredMobile(payload?.mobile || normalizeMobile(form.phone));
    setVerificationState(payload.pending);
    setCooldowns((prev) => ({
      emailResendSeconds: payload?.cooldowns?.emailResendSeconds ?? prev.emailResendSeconds,
      otpResendSeconds: payload?.cooldowns?.otpResendSeconds ?? prev.otpResendSeconds,
    }));
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErr("");
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    if (!form.name.trim()) return "Name is required";
    if (!form.email.trim()) return "Email is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Enter a valid email";
    if (!form.password || form.password.length < 8)
      return "Password must be at least 8 characters";
    if (!["email", "phone", "both"].includes(form.verificationMode)) {
      return "Select a verification preference";
    }
    if ((form.verificationMode === "phone" || form.verificationMode === "both") && !normalizeMobile(form.phone)) {
      return "Enter a valid phone number";
    }
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
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        verificationMode: form.verificationMode,
      };

      const res = await fetch("/api/free-trial/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: TrialRegisterResponse = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.error_code === "VERIFICATION_PENDING" && data?.pending) {
          hydratePendingVerification(data);
          return;
        }
        setErr(data?.message || "Something went wrong. Please try again.");
        return;
      }

      setRegisteredEmail(data?.email || payload.email);
      setRegisteredMobile(data?.mobile || normalizeMobile(payload.phone));
      setVerificationState(data?.pending || null);
      setEmailCode("");
      setOtpCode("");
      setFirebaseConfirmation(null);
      setCooldowns({
        emailResendSeconds: data?.cooldowns?.emailResendSeconds || 0,
        otpResendSeconds: data?.cooldowns?.otpResendSeconds || 0,
      });

    } catch (error: unknown) {
      setErr((error as { message?: string } | undefined)?.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async () => {
    try {
      setBusy((prev) => ({ ...prev, verifyEmail: true }));
      setErr("");
      const { data } = await axios.post("/api/auth/verify-email", {
        email: registeredEmail,
        code: emailCode,
      });
      setVerificationState(data?.pending || null);
      setEmailCode("");
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } } | undefined)?.response?.data?.message ||
        "Email verification failed.";
      setErr(msg);
    } finally {
      setBusy((prev) => ({ ...prev, verifyEmail: false }));
    }
  };

  const resendEmail = async () => {
    try {
      setBusy((prev) => ({ ...prev, resendEmail: true }));
      setErr("");
      const { data } = await axios.post("/api/auth/resend-email-verification", {
        email: registeredEmail,
      });
      setCooldowns((prev) => ({
        ...prev,
        emailResendSeconds: data?.retryAfterSeconds || 0,
      }));
    } catch (error: unknown) {
      const retryAfter =
        (error as { response?: { data?: { retryAfterSeconds?: number } } } | undefined)?.response?.data?.retryAfterSeconds || 0;
      if (retryAfter > 0) {
        setCooldowns((prev) => ({ ...prev, emailResendSeconds: retryAfter }));
      }
      const msg =
        (error as { response?: { data?: { message?: string } } } | undefined)?.response?.data?.message ||
        "Unable to resend verification email.";
      setErr(msg);
    } finally {
      setBusy((prev) => ({ ...prev, resendEmail: false }));
    }
  };

  const sendFirebaseOtp = async () => {
    try {
      setBusy((prev) => ({ ...prev, resendPhone: true }));
      setErr("");
      if (cooldowns.otpResendSeconds > 0) return;

      const auth = getFirebaseAuth();
      if (!auth) {
        const msg = "Firebase phone verification is not configured.";
        setErr(msg);
        return;
      }

      if (!registeredMobile) {
        const msg = "Mobile number is missing for this account.";
        setErr(msg);
        return;
      }

      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, "trial-firebase-recaptcha", {
          size: "invisible",
        });
      }

      const confirmation = await signInWithPhoneNumber(
        auth,
        registeredMobile,
        window.recaptchaVerifier,
      );

      setFirebaseConfirmation(confirmation);
      setOtpCode("");
      setCooldowns((prev) => ({
        ...prev,
        otpResendSeconds: Math.max(prev.otpResendSeconds || 0, 60),
      }));
    } catch (error: unknown) {
      const msg = getFirebaseErrorMessage(error, "Unable to send OTP.");
      setErr(msg);
    } finally {
      setBusy((prev) => ({ ...prev, resendPhone: false }));
    }
  };

  const verifyPhone = async () => {
    try {
      setBusy((prev) => ({ ...prev, verifyPhone: true }));
      setErr("");

      if (!firebaseConfirmation) {
        const msg = "Please request OTP first.";
        setErr(msg);
        return;
      }

      const credential = await firebaseConfirmation.confirm(otpCode);
      const idToken = await credential.user.getIdToken(true);

      const { data } = await axios.post("/api/auth/verify-phone/firebase", {
        email: registeredEmail,
        idToken,
      });

      try {
        const auth = getFirebaseAuth();
        if (auth) await signOut(auth);
      } catch (signOutErr) {
        console.warn("Firebase sign-out warning:", signOutErr);
      }

      setVerificationState(data?.pending || null);
      setRegisteredMobile(data?.mobile || registeredMobile);
      setOtpCode("");
    } catch (error: unknown) {
      const msg = getFirebaseErrorMessage(error, "OTP verification failed.");
      setErr(msg);
    } finally {
      setBusy((prev) => ({ ...prev, verifyPhone: false }));
    }
  };

  if (trialActive) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-[#0E1833]/70 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
            <Rocket className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-emerald-300">
              Your account has been created successfully.
            </div>
            <div className="mt-1 text-xs leading-relaxed text-[#EAF0FF]/70">
              You are now signed in and have 5 minutes of access to the Flash Reports overview page.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            window.location.href = "/flash-reports";
          }}
          className="mt-5 h-10 w-full rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition shadow-[0_8px_24px_rgba(16,185,129,0.25)]"
        >
          Start Exploring
        </button>
      </div>
    );
  }

  if (verificationState && !isVerified) {
    const pendingEmail = Boolean(verificationState.pendingEmail);
    const pendingPhone = Boolean(verificationState.pendingPhone);

    const helperText = pendingEmail && pendingPhone
      ? "Click here to complete verification"
      : pendingEmail
        ? "Click here to verify your email"
        : "Click here to verify your phone number";

    return (
      <div className="space-y-3 sm:space-y-4">
        {err && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-[#EAF0FF]/80 sm:p-4">
          <p className="mb-1 text-sm text-[#EAF0FF]">
            Your account is already created. Complete verification to activate trial access.
          </p>
          {pendingEmail && pendingPhone && "Email and phone verification are still pending."}
          {pendingEmail && !pendingPhone && "Email verification is still pending."}
          {!pendingEmail && pendingPhone && "Phone verification is still pending."}
          <button
            type="button"
            onClick={() => {
              if (pendingEmail) {
                setActiveMethod("email");
              } else {
                setActiveMethod("phone");
                if (!firebaseConfirmation && cooldowns.otpResendSeconds === 0) {
                  sendFirebaseOtp();
                }
              }
            }}
            className="mt-2 text-xs font-semibold text-[#AFC2FF] transition hover:text-white"
          >
            {helperText}
          </button>
        </div>

        {pendingEmail && (
          <div className={`space-y-2 rounded-xl border p-3 sm:p-4 ${activeMethod === "email" ? "border-[#4F67FF]/50 bg-[#4F67FF]/10" : "border-white/10 bg-white/5"}`}>
            <p className="text-xs text-[#EAF0FF]/65">Email: {maskEmail(registeredEmail)}</p>
            <p className="text-xs text-[#EAF0FF]/70">Enter the 6-digit email verification code.</p>
            <CodeInput
              value={emailCode}
              onChange={(code: string) => {
                setErr("");
                setEmailCode(code);
              }}
              autoFocus={activeMethod === "email"}
              disabled={busy.verifyEmail}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
              <button
                type="button"
                onClick={verifyEmail}
                disabled={busy.verifyEmail || emailCode.length < 6}
                className="h-10 w-full rounded-xl bg-[#4F67FF] px-4 text-sm font-semibold text-white transition hover:bg-[#3B55FF] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {busy.verifyEmail ? "Verifying..." : "Verify Email"}
              </button>
              <button
                type="button"
                onClick={resendEmail}
                disabled={busy.resendEmail || cooldowns.emailResendSeconds > 0}
                className="h-10 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {cooldowns.emailResendSeconds > 0
                  ? `Resend in ${cooldowns.emailResendSeconds}s`
                  : busy.resendEmail
                    ? "Sending..."
                    : "Resend Code"}
              </button>
            </div>
          </div>
        )}

        {pendingPhone && (
          <div className={`space-y-2 rounded-xl border p-3 sm:p-4 ${activeMethod === "phone" ? "border-[#4F67FF]/50 bg-[#4F67FF]/10" : "border-white/10 bg-white/5"}`}>
            <div id="trial-firebase-recaptcha" />
            <p className="text-xs text-[#EAF0FF]/65">Mobile: {maskMobile(registeredMobile)}</p>
            <p className="text-xs text-[#EAF0FF]/70">Enter the 6-digit OTP.</p>
            <CodeInput
              value={otpCode}
              onChange={(code: string) => {
                setErr("");
                setOtpCode(code);
              }}
              autoFocus={activeMethod === "phone"}
              disabled={busy.verifyPhone}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
              <button
                type="button"
                onClick={verifyPhone}
                disabled={busy.verifyPhone || otpCode.length < 6 || !firebaseConfirmation}
                className="h-10 w-full rounded-xl bg-[#4F67FF] px-4 text-sm font-semibold text-white transition hover:bg-[#3B55FF] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {busy.verifyPhone ? "Verifying..." : "Verify OTP"}
              </button>
              <button
                type="button"
                onClick={sendFirebaseOtp}
                disabled={busy.resendPhone || cooldowns.otpResendSeconds > 0}
                className="h-10 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {cooldowns.otpResendSeconds > 0
                  ? `Resend in ${cooldowns.otpResendSeconds}s`
                  : busy.resendPhone
                    ? "Sending..."
                    : firebaseConfirmation
                      ? "Resend OTP"
                      : "Send OTP"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0E1833]/70 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#EAF0FF]">
            Start Your Free Trial
          </div>
          <div className="mt-0.5 text-xs text-[#EAF0FF]/60">
            Create your account and get 5 minutes of access to the Flash Reports overview page.
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
          <label className={labelCls}>Verification Preference</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { value: "email", label: "Email verification" },
              { value: "phone", label: "Phone verification" },
              { value: "both", label: "Both verification" },
            ].map((option) => {
              const selected = form.verificationMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, verificationMode: option.value as FormState["verificationMode"] }))}
                  className={[
                    "w-full rounded-xl border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-[#4F67FF]/35",
                    selected
                      ? "border-[#4F67FF]/70 bg-[#4F67FF]/15 text-[#EAF0FF]"
                      : "border-white/10 bg-white/5 text-[#EAF0FF]/80 hover:bg-white/10",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
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
            placeholder="At least 8 characters"
            autoComplete="new-password"
            className={inputBase}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 h-10 w-full rounded-xl bg-[#4F67FF] text-white text-sm font-semibold shadow-[0_12px_30px_rgba(79,103,255,0.25)] hover:bg-[#3B55FF] transition disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Creating account..." : "Activate Free Trial"}
        </button>

        <p className="text-center text-[11px] text-[#EAF0FF]/35">
          One free trial per email. No credit card required.
        </p>
      </form>
    </div>
  );
}
