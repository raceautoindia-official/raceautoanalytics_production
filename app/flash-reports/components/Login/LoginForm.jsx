/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useState } from "react";
import { Formik } from "formik";
import * as Yup from "yup";
import axios from "axios";
import { toast } from "react-toastify";
import { PiEyeFill, PiEyeSlashFill } from "react-icons/pi";
import "./login.css";
import GoogleLoginButton from "./GoogleLogin";

// Validation Schema
const validationSchema = Yup.object({
  email: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string().min(6, "Min 6 chars").required("Required"),
});

const LoginForm = ({ onSuccess }) => {
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setError("");

      await axios.post(
        "https://raceautoindia.com/api/admin/forecast-auth",
        values
      );
      await axios.post("/api/admin/forecast-login", values);

      toast.success("Login successful!", {
        position: "top-right",
        autoClose: 3000,
      });
      onSuccess();
      window.location.reload();
    } catch (err) {
      if (err.response?.status === 409) {
        setError("Account already exists.");
      } else if (err.response?.status === 404) {
        setError("No account found.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-box px-4 py-4">
      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Formik
        initialValues={{ email: "", password: "" }}
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
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              formikSubmit();
            }}
          >
            {/* Email */}
            <div className="mb-3">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={values.email}
                onChange={handleChange}
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                  touched.email && errors.email
                    ? "border-red-500"
                    : "border-black"
                }`}
              />
              {touched.email && errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="mb-3">
              <div className="flex">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={values.password}
                  onChange={handleChange}
                  className={`w-full rounded-l-md border px-3 py-2 text-sm outline-none focus:z-10 focus:ring-2 focus:ring-blue-500 ${
                    touched.password && errors.password
                      ? "border-red-500"
                      : "border-black"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="flex items-center justify-center rounded-r-md border border-l-0 border-black bg-gray-100 px-3 text-gray-700 text-lg"
                >
                  {showPassword ? <PiEyeSlashFill /> : <PiEyeFill />}
                </button>
              </div>
              {touched.password && errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </button>

            <p className="mt-2 mb-1 text-center text-xs text-gray-500">or</p>

            {/* Google login */}
            <div className="mb-3 flex justify-center">
              <GoogleLoginButton />
            </div>
          </form>
        )}
      </Formik>
    </div>
  );
};

export default LoginForm;



// /* eslint-disable react/no-unescaped-entities */
// 'use client';
// import React, { useState } from 'react';
// import { Form, Button, Alert, InputGroup } from 'react-bootstrap';
// import { Formik } from 'formik';
// import * as Yup from 'yup';
// import axios from 'axios';
// import { toast } from 'react-toastify';
// import { PiEyeFill, PiEyeSlashFill } from 'react-icons/pi';
// import './login.css';
// import GoogleLoginButton from './GoogleLogin'

// // Validation Schema
// const validationSchema = Yup.object({
//   email: Yup.string().email('Invalid email').required('Required'),
//   password: Yup.string().min(6, 'Min 6 chars').required('Required'),
// });

// const LoginForm = ({ onSuccess }) => {
//   const [error, setError] = useState('');
//   const [showPassword, setShowPassword] = useState(false);

//   const handleSubmit = async (values, { setSubmitting }) => {
//     try {
//       setError('');

//       await axios.post('https://raceautoindia.com/api/admin/forecast-auth', values);
//       await axios.post('/api/admin/forecast-login', values);

//       toast.success('Login successful!', { position: 'top-right', autoClose: 3000 });
//       onSuccess();
//       window.location.reload();
//     } catch (err) {
//       if (err.response?.status === 409) {
//         setError('Account already exists.');
//       } else if (err.response?.status === 404) {
//         setError('No account found.');
//       } else {
//         setError('Login failed. Please try again.');
//       }
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div className="login-box px-3 py-3">
//       {error && (
//         <Alert variant="danger" className="mb-3 small">
//           {error}
//         </Alert>
//       )}

//       {/* <p className="text-center text-muted small mb-3">
//         Don't have an account?{' '}
//         <a
//           href="https://raceautoindia.com"
//           target="_blank"
//           rel="noopener noreferrer"
//           style={{
//             color: '#0d6efd',
//             textDecoration: 'underline',
//             fontWeight: 500,
//           }}
//         >
//           Register at RaceAutoIndia.com
//         </a>
//       </p> */}

//       <Formik
//         initialValues={{ email: '', password: '' }}
//         validationSchema={validationSchema}
//         onSubmit={handleSubmit}
//       >
//         {({ handleSubmit, handleChange, values, touched, errors, isSubmitting }) => (
//           <Form noValidate onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
//             <Form.Group className="mb-3" controlId="formEmail">
//               <Form.Control
//                 type="email"
//                 name="email"
//                 placeholder="Email"
//                 value={values.email}
//                 onChange={handleChange}
//                 isInvalid={touched.email && !!errors.email}
//                 style={{ border: '1px solid #000', boxShadow: 'none' }}
//               />
//               <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
//             </Form.Group>

//             <Form.Group className="mb-3" controlId="formPassword">
//               <InputGroup>
//                 <Form.Control
//                   type={showPassword ? 'text' : 'password'}
//                   name="password"
//                   placeholder="Password"
//                   value={values.password}
//                   onChange={handleChange}
//                   isInvalid={touched.password && !!errors.password}
//                   style={{ border: '1px solid #000', boxShadow: 'none' }}
//                 />
//                 <InputGroup.Text
//                   onClick={() => setShowPassword((s) => !s)}
//                   style={{
//                     cursor: 'pointer',
//                     background: '#f8f9fa',
//                     border: '1px solid #000',
//                     borderLeft: 'none',
//                     borderRadius: '0px 5px 5px 0px',
//                   }}
//                 >
//                   {showPassword ? <PiEyeSlashFill /> : <PiEyeFill />}
//                 </InputGroup.Text>
//                 <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
//               </InputGroup>
//             </Form.Group>

//             <Button variant="dark" type="submit" className="w-100" disabled={isSubmitting}>
//               {isSubmitting ? 'Logging in...' : 'Login'}
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

// export default LoginForm;
