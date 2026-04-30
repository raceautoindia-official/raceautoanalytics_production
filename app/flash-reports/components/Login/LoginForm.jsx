"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Link from "next/link";
import { RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import CodeInput from "./CodeInput";
import GoogleLogin from "./GoogleLogin";

const maskEmail = (email) => {
  if (!email) return "";
  const [name, domain] = String(email).split("@");
  if (!name || !domain) return email;
  if (name.length <= 2) return `${name[0] || "*"}*@${domain}`;
  return `${name[0]}${"*".repeat(Math.max(1, name.length - 2))}${name[name.length - 1]}@${domain}`;
};

const maskMobile = (mobile) => {
  if (!mobile) return "";
  const digits = String(mobile).replace(/\D/g, "");
  if (digits.length < 4) return mobile;
  return `+**${"*".repeat(Math.max(2, digits.length - 6))}${digits.slice(-4)}`;
};

export default function LoginForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [values, setValues] = useState({ email: "", password: "" });
  // Tracks the recovery offer shown when the server returns a 409 SESSION_LOCKED
  // for a stuck DB session lock. When non-null, the form displays a "Force
  // logout from other device" button that re-validates the password against
  // /api/auth/force-clear-session and immediately retries login on success.
  const [forceClearOffer, setForceClearOffer] = useState(null);
  const [forceClearLoading, setForceClearLoading] = useState(false);
  // Tracks the "use Google sign-in" hint shown when the server returns a 401
  // USE_GOOGLE_LOGIN for an email that's registered as a Google-signup
  // account (no password set). When true, the form renders the existing
  // GoogleLogin component inline so the user can recover in one click.
  const [showGoogleHint, setShowGoogleHint] = useState(false);

  const [recovery, setRecovery] = useState(null);
  const [emailCode, setEmailCode] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [activeMethod, setActiveMethod] = useState("email");
  const [completionToastShown, setCompletionToastShown] = useState(false);
  const [firebaseConfirmation, setFirebaseConfirmation] = useState(null);
  const [busy, setBusy] = useState({
    verifyEmail: false,
    resendEmail: false,
    verifyPhone: false,
    resendPhone: false,
  });
  const [cooldowns, setCooldowns] = useState({ emailResendSeconds: 0, otpResendSeconds: 0 });
  const hasActiveCooldown =
    (cooldowns.emailResendSeconds || 0) > 0 ||
    (cooldowns.otpResendSeconds || 0) > 0;

  useEffect(() => {
    if (!hasActiveCooldown) return;

    const timer = setInterval(() => {
      setCooldowns((prev) => ({
        emailResendSeconds: Math.max(0, (prev.emailResendSeconds || 0) - 1),
        otpResendSeconds: Math.max(0, (prev.otpResendSeconds || 0) - 1),
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [hasActiveCooldown]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const getFirebaseErrorMessage = (err, fallback) => {
    const code = err?.code || err?.response?.data?.code;
    if (code === "auth/invalid-verification-code") return "Invalid OTP. Please try again.";
    if (code === "auth/code-expired") return "OTP has expired. Please request a new OTP.";
    if (code === "auth/too-many-requests") return "Too many OTP attempts. Please wait and retry.";
    if (code === "auth/invalid-phone-number") return "Invalid phone number format.";
    return err?.response?.data?.message || err?.message || fallback;
  };

  const hydrateRecovery = (payload) => {
    const pending = payload?.pending || null;
    if (!pending?.pendingEmail && !pending?.pendingPhone) return;

    setRecovery({
      pending,
      verificationMode: payload?.verification_mode || payload?.verificationMode || null,
      email: payload?.email || values.email.toLowerCase().trim(),
      mobile: payload?.mobile || null,
      maskedEmail: payload?.masked_email || payload?.maskedEmail || maskEmail(payload?.email || values.email),
      maskedMobile: payload?.masked_mobile || payload?.maskedMobile || maskMobile(payload?.mobile),
    });

    setCooldowns((prev) => ({
      emailResendSeconds: payload?.cooldowns?.emailResendSeconds ?? prev.emailResendSeconds,
      otpResendSeconds: payload?.cooldowns?.otpResendSeconds ?? prev.otpResendSeconds,
    }));

    setError("");
  };

  const fetchVerificationStatus = async (emailInput) => {
    const { data } = await axios.post("/api/auth/verification-status", {
      email: (emailInput || values.email || "").toLowerCase().trim(),
    });

    if (data?.exists && data?.verificationRequired) {
      hydrateRecovery(data);
      return true;
    }

    return false;
  };

  useEffect(() => {
    if (!recovery?.pending) return;
    if (recovery.pending.pendingEmail) {
      setActiveMethod("email");
      return;
    }
    if (recovery.pending.pendingPhone) {
      setActiveMethod("phone");
    }
  }, [recovery]);

  const isRecoveryCompleted = useMemo(() => {
    return Boolean(recovery?.pending?.completed);
  }, [recovery]);

  useEffect(() => {
    if (!isRecoveryCompleted) {
      if (completionToastShown) setCompletionToastShown(false);
      return;
    }

    if (completionToastShown) return;

    setCompletionToastShown(true);
    toast.success("Verification completed successfully. You are now signed in.");

    const timer = setTimeout(() => {
      onSuccess?.();
      window.location.reload();
    }, 900);

    return () => clearTimeout(timer);
  }, [isRecoveryCompleted, completionToastShown, onSuccess]);

  const onChange = (e) => {
    setError("");
    setForceClearOffer(null);
    setShowGoogleHint(false);
    setValues((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setForceClearOffer(null);
    setShowGoogleHint(false);
    try {
      setLoading(true);
      await axios.post("/api/admin/forecast-login", values);

      toast.success("Login successful");
      onSuccess?.();
      window.location.reload();
    } catch (err) {
      const payload = err?.response?.data;

      // Session lock recovery path: server confirmed correct credentials but
      // a DB lock from a previous (likely stranded) session is blocking us.
      // Show a "Force logout from other device" button — the password the
      // user just typed is preserved for the force-clear call, so they don't
      // re-enter it.
      if (err?.response?.status === 409 && payload?.canForceClear) {
        setForceClearOffer({
          email: payload.email || values.email,
          password: values.password,
        });
        setError(
          payload?.message ||
            "You appear to be already logged in on another device.",
        );
        return;
      }

      // Google-only account collision: this email exists in our DB but was
      // signed up via Google OAuth and has no password set. Show a clear
      // message + render the inline GoogleLogin button so the user can
      // recover in one click without retyping anything.
      if (
        err?.response?.status === 401 &&
        payload?.error_code === "USE_GOOGLE_LOGIN"
      ) {
        const msg =
          payload?.message ||
          "This email is registered with Google sign-in. Please use 'Continue with Google' to sign in.";
        setError(msg);
        setShowGoogleHint(true);
        toast.info(msg, { autoClose: 8000 });
        return;
      }

      if (
        err?.response?.status === 403 &&
        ["EMAIL_NOT_VERIFIED", "PHONE_NOT_VERIFIED", "VERIFICATION_PENDING"].includes(
          payload?.error_code,
        )
      ) {
        hydrateRecovery(payload);
        toast.info("Your account is already created. Complete verification to continue.");
        return;
      }

      if (err?.response?.status === 403 && values.email) {
        try {
          const resumed = await fetchVerificationStatus(values.email);
          if (resumed) {
            toast.info("Your account is already created. Complete verification to continue.");
            return;
          }
        } catch (statusErr) {
          console.warn("Verification status fallback warning:", statusErr);
        }
      }

      const msg =
        payload?.message ||
        payload?.error ||
        "Login failed. Please check your credentials.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForceClearAndRetry = async () => {
    if (!forceClearOffer) return;
    setForceClearLoading(true);
    setError("");
    try {
      // Step 1: server re-validates the password and clears the DB lock.
      await axios.post("/api/auth/force-clear-session", {
        email: forceClearOffer.email,
        password: forceClearOffer.password,
      });
      // Step 2: immediately retry the normal login flow with the same creds.
      await axios.post("/api/admin/forecast-login", {
        email: forceClearOffer.email,
        password: forceClearOffer.password,
      });
      toast.success("Logged in. The other device's session was cleared.");
      onSuccess?.();
      window.location.reload();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "We couldn't clear the other session. Please try again or contact support.";
      setError(msg);
      toast.error(msg);
      setForceClearOffer(null);
    } finally {
      setForceClearLoading(false);
    }
  };

  const verifyEmail = async () => {
    try {
      setBusy((prev) => ({ ...prev, verifyEmail: true }));
      setError("");
      const { data } = await axios.post("/api/auth/verify-email", {
        email: recovery?.email,
        code: emailCode,
      });

      setRecovery((prev) => ({ ...prev, pending: data?.pending || prev?.pending }));
      setEmailCode("");
      toast.success("Email verification completed successfully.");
    } catch (err) {
      const msg = err?.response?.data?.message || "Email verification failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy((prev) => ({ ...prev, verifyEmail: false }));
    }
  };

  const resendEmail = async () => {
    try {
      setBusy((prev) => ({ ...prev, resendEmail: true }));
      setError("");
      const { data } = await axios.post("/api/auth/resend-email-verification", {
        email: recovery?.email,
      });
      setCooldowns((prev) => ({
        ...prev,
        emailResendSeconds: data?.retryAfterSeconds || 0,
      }));
      toast.info("We've sent a new verification code to your email.");
    } catch (err) {
      const retryAfter = err?.response?.data?.retryAfterSeconds || 0;
      if (retryAfter > 0) {
        setCooldowns((prev) => ({ ...prev, emailResendSeconds: retryAfter }));
      }
      const msg = err?.response?.data?.message || "Unable to resend verification email.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy((prev) => ({ ...prev, resendEmail: false }));
    }
  };

  const sendFirebaseOtp = async () => {
    try {
      setBusy((prev) => ({ ...prev, resendPhone: true }));
      setError("");

      if (cooldowns.otpResendSeconds > 0) {
        return;
      }

      if (!recovery?.mobile) {
        const msg = "Mobile number is unavailable for this account.";
        setError(msg);
        toast.error(msg);
        return;
      }

      const auth = getFirebaseAuth();
      if (!auth) {
        const msg = "Firebase phone verification is not configured.";
        setError(msg);
        toast.error(msg);
        return;
      }

      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, "login-firebase-recaptcha", {
          size: "invisible",
        });
      }

      const confirmation = await signInWithPhoneNumber(
        auth,
        recovery.mobile,
        window.recaptchaVerifier,
      );

      setFirebaseConfirmation(confirmation);
      setOtpCode("");
      setCooldowns((prev) => ({
        ...prev,
        otpResendSeconds: Math.max(prev.otpResendSeconds || 0, 60),
      }));
      toast.info("We've sent a new OTP to your mobile number.");
    } catch (err) {
      const msg = getFirebaseErrorMessage(err, "Unable to send OTP.");
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy((prev) => ({ ...prev, resendPhone: false }));
    }
  };

  const verifyPhone = async () => {
    try {
      setBusy((prev) => ({ ...prev, verifyPhone: true }));
      setError("");

      if (!firebaseConfirmation) {
        const msg = "Please request OTP first.";
        setError(msg);
        toast.error(msg);
        return;
      }

      const credential = await firebaseConfirmation.confirm(otpCode);
      const idToken = await credential.user.getIdToken(true);

      const { data } = await axios.post("/api/auth/verify-phone/firebase", {
        email: recovery?.email,
        idToken,
      });

      try {
        const auth = getFirebaseAuth();
        if (auth) await signOut(auth);
      } catch (signOutErr) {
        console.warn("Firebase sign-out warning:", signOutErr);
      }

      setRecovery((prev) => ({ ...prev, pending: data?.pending || prev?.pending }));
      setOtpCode("");
      toast.success("Phone verification completed successfully.");
    } catch (err) {
      const msg = getFirebaseErrorMessage(err, "OTP verification failed.");
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy((prev) => ({ ...prev, verifyPhone: false }));
    }
  };

  if (
    recovery?.pending &&
    !recovery.pending.completed &&
    (recovery.pending.pendingEmail || recovery.pending.pendingPhone)
  ) {
    const pendingEmail = Boolean(recovery.pending.pendingEmail);
    const pendingPhone = Boolean(recovery.pending.pendingPhone);

    const helperText = pendingEmail && pendingPhone
      ? "Click here to complete verification"
      : pendingEmail
        ? "Click here to verify your email"
        : "Click here to verify your phone number";

    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="mb-4">
          <div className="text-sm font-semibold text-white">Complete Verification</div>
          <div className="mt-1 text-xs text-white/65">
            Your account is already created. Complete verification to continue.
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
            <p className="text-xs text-white/70">
              {pendingEmail && pendingPhone && "Email and phone verification are still pending."}
              {pendingEmail && !pendingPhone && "Email verification is still pending."}
              {!pendingEmail && pendingPhone && "Phone verification is still pending."}
            </p>
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
              className="mt-1 text-xs font-semibold text-[#AFC2FF] transition hover:text-white"
            >
              {helperText}
            </button>
          </div>

          {pendingEmail && (
            <div className={`rounded-xl border p-3 sm:p-4 ${activeMethod === "email" ? "border-[#4F67FF]/50 bg-[#4F67FF]/10" : "border-white/10 bg-white/5"}`}>
              <p className="mb-2 text-xs text-white/70">Email: {recovery.maskedEmail}</p>
              <CodeInput
                value={emailCode}
                onChange={(code) => {
                  setError("");
                  setEmailCode(code);
                }}
                autoFocus={activeMethod === "email"}
                disabled={busy.verifyEmail}
              />
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
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
              {/* Audit N-1: tell the user what happens after clicking Verify. */}
              <p className="mt-3 text-[11px] text-white/50 text-center">
                After verifying, you&apos;ll be signed in and taken to your account.
              </p>
            </div>
          )}

          {pendingPhone && (
            <div className={`rounded-xl border p-3 sm:p-4 ${activeMethod === "phone" ? "border-[#4F67FF]/50 bg-[#4F67FF]/10" : "border-white/10 bg-white/5"}`}>
              <div id="login-firebase-recaptcha" />
              <p className="mb-2 text-xs text-white/70">Mobile: {recovery.maskedMobile}</p>
              <CodeInput
                value={otpCode}
                onChange={(code) => {
                  setError("");
                  setOtpCode(code);
                }}
                autoFocus={activeMethod === "phone"}
                disabled={busy.verifyPhone}
              />
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
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
              <p className="mt-2 text-center text-xs text-white/55">Entered a wrong code? Try again or request a new one.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

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
          <div>{error}</div>
          {/* Session lock recovery: when the server confirms the password is
              correct but a stale DB lock from a previous session is blocking
              login, give the user a one-click escape hatch. The password they
              just typed is reused so no re-entry is required. */}
          {forceClearOffer && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-xs text-red-100/80 leading-relaxed">
                If you no longer have access to that other device (browser
                crashed, cookies cleared, etc.) you can force the previous
                session to log out and continue here.
              </p>
              <button
                type="button"
                disabled={forceClearLoading}
                onClick={handleForceClearAndRetry}
                className="self-start rounded-lg border border-red-300/40 bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-100 hover:bg-red-500/30 transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {forceClearLoading
                  ? "Clearing other session…"
                  : "Force logout from other device and continue"}
              </button>
            </div>
          )}

          {/* Google-only account recovery: render the existing GoogleLogin
              button inline so the user can sign in with Google without
              navigating away or retyping anything. */}
          {showGoogleHint && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-xs text-red-100/80 leading-relaxed">
                Click below to sign in with the Google account linked to this
                email.
              </p>
              <div className="self-start">
                <GoogleLogin />
              </div>
            </div>
          )}
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
            {/* Audit U-8: standard "Forgot password?" entry point. Routes to
                /reset-password which already exists and handles the redirect
                to raceautoindia.com. */}
            <Link
              href="/reset-password"
              className="text-[11px] text-[#7B93FF] underline decoration-dotted underline-offset-2 hover:text-[#AFC2FF] transition"
            >
              Forgot password?
            </Link>
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

        <p className="text-[11px] leading-5 text-white/65">
          By continuing, you acknowledge our{" "}
          <Link
            href="/terms-conditions"
            className="font-semibold text-[#7B93FF] underline underline-offset-2 hover:text-[#AFC2FF]"
          >
            Terms & Conditions
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy-policy"
            className="font-semibold text-[#7B93FF] underline underline-offset-2 hover:text-[#AFC2FF]"
          >
            Privacy Policy
          </Link>
          .
        </p>

        <div className="flex items-center gap-3 py-2">
          <div className="h-px flex-1 bg-white/10" />
          <div className="text-[11px] text-white/50">OR</div>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <GoogleLogin />
      </form>
    </div>
  );
}
