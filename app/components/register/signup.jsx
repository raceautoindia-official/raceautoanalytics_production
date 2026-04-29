/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Formik } from "formik";
import * as Yup from "yup";
import axios from "axios";
import Link from "next/link";
import { toast } from "react-toastify";
import { RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import CodeInput from "@/app/flash-reports/components/Login/CodeInput";
import GoogleLoginButton from "@/app/flash-reports/components/Login/GoogleLogin";

const VALID_MODES = ["email", "phone", "both"];

const normalizeMobile = (input) => {
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

const validationSchema = Yup.object().shape({
  username: Yup.string().required("Username is required"),
  email: Yup.string().email("Invalid email address").required("Email is required"),
  password: Yup.string().min(8, "Password must be at least 8 characters").required("Password is required"),
  verificationMode: Yup.string()
    .oneOf(VALID_MODES, "Select a verification mode")
    .required("Verification preference is required"),
  mobile: Yup.string().when("verificationMode", {
    is: (mode) => mode === "phone" || mode === "both",
    then: (schema) =>
      schema
        .required("Mobile number is required")
        .test("safe-mobile", "Enter a valid mobile number", (value) => Boolean(normalizeMobile(value || ""))),
    otherwise: (schema) => schema.notRequired(),
  }),
});

const maskEmail = (email) => {
  if (!email) return "";
  const [name, domain] = email.split("@");
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

const SignupForm = ({ onSuccess, onSwitchToLogin }) => {
  const [error, setError] = useState("");
  const [verificationState, setVerificationState] = useState(null);
  // Audit N-2: track whether the user is mid-verification when the modal
  // closes, so we can fire a "you can finish this later" toast instead of
  // letting them silently disappear into the homepage with no idea what
  // happened to their half-created account. Stored in a ref so the unmount
  // cleanup sees the latest value (state in cleanups suffers stale-closure).
  const verificationPendingRef = useRef(false);
  const [verificationSource, setVerificationSource] = useState(null);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredMobile, setRegisteredMobile] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [firebaseConfirmation, setFirebaseConfirmation] = useState(null);
  const [activeMethod, setActiveMethod] = useState("email");
  const [completionToastShown, setCompletionToastShown] = useState(false);
  const [cooldowns, setCooldowns] = useState({
    emailResendSeconds: 0,
    otpResendSeconds: 0,
  });
  const hasActiveCooldown =
    (cooldowns.emailResendSeconds || 0) > 0 ||
    (cooldowns.otpResendSeconds || 0) > 0;
  const [busy, setBusy] = useState({
    verifyEmail: false,
    resendEmail: false,
    verifyPhone: false,
    resendPhone: false,
  });

  // Audit N-2: keep the ref in sync with the live verification state so the
  // unmount cleanup can read it. Cleared by handleVerificationComplete-like
  // paths that set verificationState back to null.
  useEffect(() => {
    verificationPendingRef.current = Boolean(
      verificationState?.pendingEmail || verificationState?.pendingPhone,
    );
  }, [verificationState]);

  // Audit N-2: when the modal closes mid-verification (user clicks X or
  // Escape after the OTP screen showed up), surface a toast so the user
  // knows their account exists and they can resume by signing in. Without
  // this, the modal silently vanishes and the user is left thinking nothing
  // happened. Toast lib (react-toastify) is already imported above.
  useEffect(() => {
    return () => {
      if (verificationPendingRef.current) {
        try {
          toast.info(
            "Your account is created but not yet verified. Sign in anytime to complete verification.",
            { autoClose: 6000 },
          );
        } catch {
          // toast lib unavailable in some unmount paths — ignore
        }
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

  const hydratePendingVerification = (payload) => {
    const pending = payload?.pending || null;
    if (!pending?.pendingEmail && !pending?.pendingPhone) return;
    setRegisteredEmail(payload?.email || "");
    setRegisteredMobile(payload?.mobile || "");
    setVerificationState(pending);
    setVerificationSource("recovery");
    setCooldowns((prev) => ({
      emailResendSeconds: payload?.cooldowns?.emailResendSeconds ?? prev.emailResendSeconds,
      otpResendSeconds: payload?.cooldowns?.otpResendSeconds ?? prev.otpResendSeconds,
    }));
  };

  const checkVerificationStatus = async (inputEmail) => {
    const { data } = await axios.post("/api/auth/verification-status", {
      email: inputEmail || registeredEmail,
    });

    if (data?.exists && data?.verificationRequired) {
      hydratePendingVerification({
        email: data.email,
        mobile: data.mobile,
        pending: data.pending,
      });
      return true;
    }

    return false;
  };

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
    toast.success("Verification completed successfully. You are now signed in.");

    const timer = setTimeout(() => {
      onSuccess?.();
      window.location.reload();
    }, 900);
    return () => clearTimeout(timer);
  }, [isVerified, completionToastShown, onSuccess]);

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setError("");

      const payload = {
        username: values.username,
        email: values.email,
        password: values.password,
        confirmPassword: values.password,
        verificationMode: values.verificationMode,
        mobile: normalizeMobile(values.mobile || "") || values.mobile,
      };

      const { data } = await axios.post("/api/auth/register", payload);

      setRegisteredEmail(data?.email || values.email.toLowerCase().trim());
      setRegisteredMobile(data?.mobile || normalizeMobile(values.mobile || ""));
      setVerificationState(data?.pending || null);
      setVerificationSource("newSignup");
      setFirebaseConfirmation(null);
      setOtpCode("");
      setEmailCode("");
      setCooldowns({
        emailResendSeconds: data?.cooldowns?.emailResendSeconds || 0,
        otpResendSeconds: data?.cooldowns?.otpResendSeconds || 0,
      });

      toast.success("Signup successful. Complete verification to continue.");
    } catch (err) {
      const payload = err?.response?.data;
      if (payload?.error_code === "VERIFICATION_PENDING" && payload?.pending) {
        hydratePendingVerification(payload);
        setError("");
        toast.info("Your account is already created. Complete verification to continue.");
        return;
      }

      if (err?.response?.status === 409 && values?.email) {
        try {
          const resumed = await checkVerificationStatus(values.email.toLowerCase().trim());
          if (resumed) {
            setError("");
            toast.info("Your account is already created. Complete verification to continue.");
            return;
          }
        } catch (statusErr) {
          console.warn("Verification status lookup warning:", statusErr);
        }

        // Audit PO-3: 409 + no pending verification = fully verified user
        // already exists. Previously they got a generic "Account already
        // exists." toast and no path forward. Now: surface an inline message
        // with a "Log in instead" link that switches the modal to login mode.
        setError("ACCOUNT_EXISTS_VERIFIED");
        toast.info(
          "An account with this email already exists. Please log in instead.",
          { autoClose: 6000 },
        );
        return;
      }

      const serverMsg = payload?.message || payload?.error || "Unable to complete signup right now.";
      setError(serverMsg);
      toast.error(serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const verifyEmail = async () => {
    try {
      setBusy((prev) => ({ ...prev, verifyEmail: true }));
      setError("");
      const { data } = await axios.post("/api/auth/verify-email", {
        email: registeredEmail,
        code: emailCode,
      });
      setVerificationState(data?.pending || null);
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
        email: registeredEmail,
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
      toast.success("Phone verification completed successfully.");
    } catch (err) {
      const msg = getFirebaseErrorMessage(err, "OTP verification failed.");
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy((prev) => ({ ...prev, verifyPhone: false }));
    }
  };

  const sendFirebaseOtp = async () => {
    try {
      setBusy((prev) => ({ ...prev, resendPhone: true }));
      setError("");
      if (cooldowns.otpResendSeconds > 0) {
        return;
      }

      const auth = getFirebaseAuth();
      if (!auth) {
        const msg = "Firebase phone verification is not configured.";
        setError(msg);
        toast.error(msg);
        return;
      }

      if (!registeredMobile) {
        const msg = "Mobile number is missing for this account.";
        setError(msg);
        toast.error(msg);
        return;
      }

      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, "firebase-recaptcha-container", {
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
      toast.info("We've sent a new OTP to your mobile number.");
    } catch (err) {
      const msg = getFirebaseErrorMessage(err, "Unable to send OTP.");
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy((prev) => ({ ...prev, resendPhone: false }));
    }
  };

  const labelCls = "mb-1 block text-xs font-medium text-[#EAF0FF]/75";
  const modeCardBase =
    "w-full rounded-xl border px-2.5 py-2 text-left text-xs transition focus:outline-none focus:ring-2 focus:ring-[#4F67FF]/35";
  const inputBase =
    "h-10 w-full rounded-xl px-3 text-sm outline-none transition " +
    "bg-white/5 border text-[#EAF0FF] placeholder:text-[#EAF0FF]/45 " +
    "focus:ring-2 focus:ring-[#4F67FF]/35 focus:border-white/20";
  const inputOk = "border-white/10";
  const inputErr = "border-red-500";

  if (
    verificationState &&
    !isVerified &&
    (verificationState.pendingEmail || verificationState.pendingPhone)
  ) {
    const pendingEmail = Boolean(verificationState.pendingEmail);
    const pendingPhone = Boolean(verificationState.pendingPhone);
    const isRecoveryState = verificationSource === "recovery";

    const helperText = pendingEmail && pendingPhone
      ? "Click here to complete verification"
      : pendingEmail
        ? "Click here to verify your email"
        : "Click here to verify your phone number";

    return (
      <div className="space-y-3 sm:space-y-4">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {isRecoveryState && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-[#EAF0FF]/80 sm:p-4">
            <p className="mb-1 text-sm text-[#EAF0FF]">
              Your account is already created. Complete verification to continue.
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
        )}

        {pendingEmail && (
          <div className={`space-y-2 rounded-xl border p-3 sm:p-4 ${activeMethod === "email" ? "border-[#4F67FF]/50 bg-[#4F67FF]/10" : "border-white/10 bg-white/5"}`}>
            <p className="text-xs text-[#EAF0FF]/65">
              Email: {maskEmail(registeredEmail)}
            </p>
            <p className="text-xs text-[#EAF0FF]/70">Enter the 6-digit email verification code.</p>
            <CodeInput
              value={emailCode}
              onChange={(code) => {
                setError("");
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
            {/* Audit N-1: tell the user what happens after clicking Verify
                so the action doesn't feel like a black box. */}
            <p className="mt-3 text-[11px] text-white/50 text-center">
              After verifying, you&apos;ll be signed in and taken to your account.
            </p>
          </div>
        )}

        {pendingPhone && (
          <div className={`space-y-2 rounded-xl border p-3 sm:p-4 ${activeMethod === "phone" ? "border-[#4F67FF]/50 bg-[#4F67FF]/10" : "border-white/10 bg-white/5"}`}>
            <div id="firebase-recaptcha-container" />
            <p className="text-xs text-[#EAF0FF]/65">
              Mobile: {maskMobile(registeredMobile)}
            </p>
            <p className="text-xs text-[#EAF0FF]/70">Enter the 6-digit OTP.</p>
            <CodeInput
              value={otpCode}
              onChange={(code) => {
                setError("");
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
            <p className="text-center text-xs text-[#EAF0FF]/55">
              Entered a wrong code? Try again or request a new one.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (verificationState && isVerified) {
    return (
      <div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-200">
          Verification completed successfully. You are now signed in.
        </div>
        <button
          type="button"
          className="mt-3 h-11 w-full rounded-xl bg-[#4F67FF] text-white font-semibold shadow-[0_12px_30px_rgba(79,103,255,0.25)] hover:bg-[#3B55FF] transition"
          onClick={() => {
            onSuccess?.();
            window.location.reload();
          }}
        >
          Continue
        </button>
      </div>
    );
  }

  return (
      <div>
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {/* Audit PO-3: when the server reports the email already has a
              fully verified account, show a friendly "Log in instead" CTA
              that switches the modal to login mode (no nav, no reload). */}
          {error === "ACCOUNT_EXISTS_VERIFIED" ? (
            <div className="flex flex-col gap-2">
              <span>An account with this email already exists.</span>
              {onSwitchToLogin && (
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    onSwitchToLogin();
                  }}
                  className="self-start rounded-lg border border-red-300/40 bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-100 hover:bg-red-500/30 transition"
                >
                  Log in instead →
                </button>
              )}
            </div>
          ) : (
            error
          )}
        </div>
      )}

      <Formik
        initialValues={{
          username: "",
          email: "",
          password: "",
          mobile: "",
          verificationMode: "email",
        }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({
          handleSubmit: formikSubmit,
          handleChange,
          values,
          touched,
          errors,
          validateForm,
          setTouched,
          setFieldValue,
          setFieldTouched,
          isSubmitting,
        }) => {
          const handleInputChange = (e) => {
            setError("");
            handleChange(e);
          };

          const submitWithValidationToast = async (e) => {
            e.preventDefault();
            const validationErrors = await validateForm();
            if (Object.keys(validationErrors).length > 0) {
              setTouched(
                Object.keys(validationErrors).reduce((acc, key) => {
                  acc[key] = true;
                  return acc;
                }, {}),
                true,
              );
              const firstMessage = Object.values(validationErrors)[0];
              if (typeof firstMessage === "string") {
                toast.error(firstMessage);
              } else {
                toast.error("Please check the signup form fields.");
              }
              return;
            }
            formikSubmit();
          };

          return (
            <form noValidate onSubmit={submitWithValidationToast} className="space-y-2.5">
              <div>
                <label className={labelCls}>Username</label>
                <input
                  type="text"
                  name="username"
                  value={values.username}
                  onChange={handleInputChange}
                  placeholder="Enter username"
                  className={`${inputBase} ${touched.username && errors.username ? inputErr : inputOk}`}
                />
                {touched.username && errors.username && (
                  <p className="mt-1 text-xs text-red-300">{errors.username}</p>
                )}
              </div>

              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={values.email}
                  onChange={handleInputChange}
                  placeholder="Enter email"
                  className={`${inputBase} ${touched.email && errors.email ? inputErr : inputOk}`}
                />
                {touched.email && errors.email && (
                  <p className="mt-1 text-xs text-red-300">{errors.email}</p>
                )}
              </div>

              <div>
                <label className={labelCls}>Verification Preference</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {[
                    { value: "email", label: "Email verification" },
                    { value: "phone", label: "Phone verification" },
                    { value: "both", label: "Both verification" },
                  ].map((option) => {
                    const selected = values.verificationMode === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setError("");
                          setFieldValue("verificationMode", option.value);
                          setFieldTouched("verificationMode", true, false);
                        }}
                        className={[
                          modeCardBase,
                          selected
                            ? "border-[#4F67FF]/70 bg-[#4F67FF]/15 text-[#EAF0FF]"
                            : "border-white/10 bg-white/5 text-[#EAF0FF]/80 hover:bg-white/10",
                        ].join(" ")}
                        aria-pressed={selected}
                      >
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                          <span
                            className={[
                              "inline-flex h-4 w-4 items-center justify-center rounded border text-[10px]",
                              selected
                                ? "border-[#7B93FF] bg-[#4F67FF] text-white"
                                : "border-white/30 text-transparent",
                            ].join(" ")}
                          >
                            ✓
                          </span>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {touched.verificationMode && errors.verificationMode && (
                  <p className="mt-1 text-xs text-red-300">{errors.verificationMode}</p>
                )}
              </div>

              <div>
                <label className={labelCls}>Mobile Number</label>
                <input
                  type="tel"
                  name="mobile"
                  value={values.mobile}
                  onChange={handleInputChange}
                  placeholder="Enter mobile number"
                  className={`${inputBase} ${
                    values.verificationMode === "phone" || values.verificationMode === "both"
                      ? "border-[#4F67FF]/50"
                      : ""
                  } ${touched.mobile && errors.mobile ? inputErr : inputOk}`}
                />
                {touched.mobile && errors.mobile && (
                  <p className="mt-1 text-xs text-red-300">{errors.mobile}</p>
                )}
              </div>

              <div>
                <label className={labelCls}>Password</label>
                <input
                  type="password"
                  name="password"
                  value={values.password}
                  onChange={handleInputChange}
                  placeholder="Password"
                  className={`${inputBase} ${touched.password && errors.password ? inputErr : inputOk}`}
                />
                {touched.password && errors.password && (
                  <p className="mt-1 text-xs text-red-300">{errors.password}</p>
                )}
              </div>

              <p className="text-[11px] leading-5 text-[#EAF0FF]/65">
                By creating an account, you agree to our{" "}
                <Link
                  href="/terms-conditions"
                  className="font-semibold text-[#7B93FF] underline underline-offset-2 hover:text-[#AFC2FF]"
                >
                  Terms & Conditions
                </Link>{" "}
                and acknowledge our{" "}
                <Link
                  href="/privacy-policy"
                  className="font-semibold text-[#7B93FF] underline underline-offset-2 hover:text-[#AFC2FF]"
                >
                  Privacy Policy
                </Link>
                .
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 h-11 w-full rounded-xl bg-[#4F67FF] text-white font-semibold shadow-[0_12px_30px_rgba(79,103,255,0.25)] hover:bg-[#3B55FF] transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Signing up..." : "Sign Up"}
              </button>

              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-white/10" />
                <div className="text-[11px] text-[#EAF0FF]/55">OR</div>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="flex justify-start">
                <GoogleLoginButton />
              </div>
            </form>
          );
        }}
      </Formik>
    </div>
  );
};

export default SignupForm;
