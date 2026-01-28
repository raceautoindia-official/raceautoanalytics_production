/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useState } from "react";
import { Formik } from "formik";
import * as Yup from "yup";
import axios from "axios";
import "./signup.css";
import { toast } from "react-toastify";
import GoogleLoginButton from "@/app/flash-reports/components/Login/GoogleLogin";

// Validation schema for form fields with strong password
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
        theme: "light",
      });

      onSuccess();
      window.location.reload();
    } catch (error) {
      if (error.response) {
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

  return (
    <div className="signup-box px-3 py-2">
      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

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
          <form noValidate onSubmit={formikSubmit}>
            {/* Username */}
            <div className="mb-3">
              <input
                type="text"
                name="username"
                value={values.username}
                onChange={handleChange}
                placeholder="Enter username"
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                  touched.username && errors.username
                    ? "border-red-500"
                    : "border-black"
                }`}
              />
              {touched.username && errors.username && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.username}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="mb-3">
              <input
                type="email"
                name="email"
                value={values.email}
                onChange={handleChange}
                placeholder="Enter email"
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                  touched.email && errors.email
                    ? "border-red-500"
                    : "border-black"
                }`}
              />
              {touched.email && errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="mb-3">
              <input
                type="password"
                name="password"
                value={values.password}
                onChange={handleChange}
                placeholder="Password"
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                  touched.password && errors.password
                    ? "border-red-500"
                    : "border-black"
                }`}
              />
              {touched.password && errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="mb-3">
              <input
                type="password"
                name="confirmPassword"
                value={values.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                  touched.confirmPassword && errors.confirmPassword
                    ? "border-red-500"
                    : "border-black"
                }`}
              />
              {touched.confirmPassword && errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Signing up..." : "Sign Up"}
            </button>

            <p className="mt-2 mb-1 text-center text-xs text-gray-500">or</p>

            <div className="mb-3 flex justify-center">
              <GoogleLoginButton />
            </div>
          </form>
        )}
      </Formik>
    </div>
  );
};

export default SignupForm;



// /* eslint-disable react/no-unescaped-entities */
// 'use client'
// import React, { useState } from "react";
// import { Form, Button, Alert } from "react-bootstrap";
// import { Formik } from "formik";
// import * as Yup from "yup";
// import axios from "axios";
// import './signup.css'

// import { toast } from "react-toastify";
// import GoogleLoginButton from "@/app/flash-reports/components/Login/GoogleLogin";

// // Validation schema for form fields with strong password
// const validationSchema = Yup.object().shape({
//   username: Yup.string().min(3, "Username must be at least 3 characters").required("Username is required"),
//   email: Yup.string().email("Invalid email address").required("Email is required"),
//   password: Yup.string()
//     .min(8, "Password must be at least 8 characters")
//     .required("Password is required"),
//   confirmPassword: Yup.string()
//     .oneOf([Yup.ref('password'), null], "Passwords must match")
//     .required("Confirm password is required"),
// });

// const SignupForm = ({ onSuccess }) => {
//   const [error, setError] = useState("");


//   const handleSubmit = async (values, { setSubmitting }) => {
//     try {
//       setError("");
//       await axios.post("https://raceautoindia.com/api/admin/forecast-auth-register", values);
//       await axios.post('/api/admin/forecast-login', values);
//       toast.info("Login success", {
//         position: "top-right",
//         autoClose: 5000,
//         hideProgressBar: false,
//         closeOnClick: true,
//         pauseOnHover: true,
//         draggable: true,
//         progress: undefined,
//         theme: "light",
//       });

//       onSuccess();
//       window.location.reload();

//     } catch (error) {
//       if (error.response) {
//         if (error.response.status === 409) {
//           setError("Account already exists.");
//         } else if (error.response.status === 400) {
//           setError("Invalid data. Please check your inputs.");
//         } else {
//           setError("An unexpected error occurred. Please try again.");
//         }
//       } else {
//         setError("Network error. Please check your internet connection.");
//       }
//     } finally {
//       setSubmitting(false);
//     }
//   };




//   return (
//     <div className="signup-box px-3 py-2">
//       {error && <Alert variant="danger">{error}</Alert>}

//       <Formik
//         initialValues={{ username: "", email: "", password: "", confirmPassword: "" }}
//         validationSchema={validationSchema}
//         onSubmit={handleSubmit}
//       >
//         {({ handleSubmit, handleChange, values, touched, errors, isSubmitting }) => (
//           <Form noValidate onSubmit={handleSubmit}>
//             <Form.Group className="mb-3" controlId="formUsername">
//               <Form.Control
//                 type="text"
//                 name="username"
//                 value={values.username}
//                 onChange={handleChange}
//                 isInvalid={touched.username && errors.username}
//                 placeholder="Enter username"
//                 style={{ border: '1px solid #000', boxShadow: 'none' }}
//               />
//               <Form.Control.Feedback type="invalid">{errors.username}</Form.Control.Feedback>
//             </Form.Group>
//             <Form.Group className="mb-3" controlId="formEmail">
//               <Form.Control
//                 type="email"
//                 name="email"
//                 value={values.email}
//                 onChange={handleChange}
//                 isInvalid={touched.email && errors.email}
//                 placeholder="Enter email"
//                 style={{ border: '1px solid #000', boxShadow: 'none' }}
//               />
//               <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
//             </Form.Group>
//             <Form.Group className="mb-3" controlId="formPassword">
//               <Form.Control
//                 type="password"
//                 name="password"
//                 value={values.password}
//                 onChange={handleChange}
//                 isInvalid={touched.password && errors.password}
//                 placeholder="Password"
//                 style={{ border: '1px solid #000', boxShadow: 'none' }}
//               />
//               <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
//             </Form.Group>
//             <Form.Group className="mb-3" controlId="formConfirmPassword">
//               <Form.Control
//                 type="password"
//                 name="confirmPassword"
//                 value={values.confirmPassword}
//                 onChange={handleChange}
//                 isInvalid={touched.confirmPassword && errors.confirmPassword}
//                 placeholder="Confirm password"
//                 style={{ border: '1px solid #000', boxShadow: 'none' }}
//               />
//               <Form.Control.Feedback type="invalid">{errors.confirmPassword}</Form.Control.Feedback>
//             </Form.Group>
//             <Button variant="dark" type="submit" disabled={isSubmitting} className="w-100">
//               {isSubmitting ? "Signing up..." : "Sign Up"}
//             </Button>
//             <p className="text-center text-muted mt-2 mb-1">or</p>
//             <div className="d-flex justify-content-center mb-3">
//               <GoogleLoginButton />
//             </div>
//           </Form>
//         )}
//       </Formik>

//     </div>
//   );
// };

// export default SignupForm;
