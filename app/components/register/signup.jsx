/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useState } from "react";
import { Formik } from "formik";
import * as Yup from "yup";
import axios from "axios";
import { toast } from "react-toastify";
import GoogleLoginButton from "@/app/flash-reports/components/Login/GoogleLogin";

// ❌ remove old css import
// import "./signup.css";

// Validation schema (UNCHANGED)
const validationSchema = Yup.object().shape({
  username: Yup.string()
    .min(3, "Username must be at least 3 characters")
    .required("Username is required"),
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password"), null], "Passwords must match")
    .required("Confirm password is required"),
});

const SignupForm = ({ onSuccess }) => {
  const [error, setError] = useState("");

  // Submit handler (UNCHANGED logic)
  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setError("");

      await axios.post(
        "https://raceautoindia.com/api/admin/forecast-auth-register",
        values
      );
      await axios.post("/api/admin/forecast-login", values);

      toast.info("Login success", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light", // keep exactly as before
      });

      onSuccess?.();
      window.location.reload();
    } catch (error) {
      if (error?.response) {
        if (error.response.status === 409) {
          setError("Account already exists.");
        } else if (error.response.status === 400) {
          setError("Invalid data. Please check your inputs.");
        } else {
          setError("An unexpected error occurred. Please try again.");
        }
      } else {
        setError("Network error. Please check your internet connection.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Premium dark-blue theme classes (matches your attachment)
  const labelCls = "mb-1 block text-xs font-medium text-[#EAF0FF]/75";
  const inputBase =
    "h-11 w-full rounded-xl px-3 text-sm outline-none transition " +
    "bg-white/5 border text-[#EAF0FF] placeholder:text-[#EAF0FF]/45 " +
    "focus:ring-2 focus:ring-[#4F67FF]/35 focus:border-white/20";
  const inputOk = "border-white/10";
  const inputErr = "border-red-500";

  return (
    <div className="px-1">
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* <div className="mb-4">
        <div className="text-sm font-semibold text-[#EAF0FF]">
          New to Race Auto India?
        </div>
        <div className="mt-1 text-xs text-[#EAF0FF]/70">
          Create an account below.
        </div>
      </div> */}

      <Formik
        initialValues={{
          username: "",
          email: "",
          password: "",
          confirmPassword: "",
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
          isSubmitting,
        }) => (
          <form noValidate onSubmit={formikSubmit} className="space-y-3">
            {/* Username */}
            <div>
              <label className={labelCls}>Username</label>
              <input
                type="text"
                name="username"
                value={values.username}
                onChange={handleChange}
                placeholder="Enter username"
                className={`${inputBase} ${
                  touched.username && errors.username ? inputErr : inputOk
                }`}
              />
              {touched.username && errors.username && (
                <p className="mt-1 text-xs text-red-300">{errors.username}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                name="email"
                value={values.email}
                onChange={handleChange}
                placeholder="Enter email"
                className={`${inputBase} ${
                  touched.email && errors.email ? inputErr : inputOk
                }`}
              />
              {touched.email && errors.email && (
                <p className="mt-1 text-xs text-red-300">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className={labelCls}>Password</label>
              <input
                type="password"
                name="password"
                value={values.password}
                onChange={handleChange}
                placeholder="Password"
                className={`${inputBase} ${
                  touched.password && errors.password ? inputErr : inputOk
                }`}
              />
              {touched.password && errors.password && (
                <p className="mt-1 text-xs text-red-300">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className={labelCls}>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={values.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                className={`${inputBase} ${
                  touched.confirmPassword && errors.confirmPassword
                    ? inputErr
                    : inputOk
                }`}
              />
              {touched.confirmPassword && errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-300">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 h-11 w-full rounded-xl bg-[#4F67FF] text-white font-semibold shadow-[0_12px_30px_rgba(79,103,255,0.25)] hover:bg-[#3B55FF] transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Signing up..." : "Sign Up"}
            </button>

            {/* OR divider */}
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-white/10" />
              <div className="text-[11px] text-[#EAF0FF]/55">OR</div>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Google Login (keep logic in component; only style it there if needed) */}
            <div className="flex justify-start">
              <GoogleLoginButton />
            </div>
          </form>
        )}
      </Formik>
    </div>
  );
};

export default SignupForm;