"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import LoginForm from "./LoginForm";
import SignupForm from "@/app/components/register/signup";

export default function AuthModal({ show, onClose }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [mode, setMode] = useState<"login" | "register">("login");

  // useEffect(() => {
  //   if (!show) return;
  //   const original = document.body.style.overflow;
  //   document.body.style.overflow = "hidden";
  //   return () => {
  //     document.body.style.overflow = original;
  //   };
  // }, [show]);



  if (!show) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl shadow-black/10">
        <div className="relative px-6 pb-6 pt-5">
          {/* Show close button only on home path (still optional) */}
          {isHome && (
            <button
              type="button"
              onClick={() => onClose()}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Close"
            >
              <span className="text-lg leading-none">&times;</span>
            </button>
          )}

          {/* Login / Signup toggle */}
          <div className="mb-5 flex justify-center">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
                  mode === "login"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-white"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`ml-1 px-4 py-1.5 text-sm font-medium rounded-md transition ${
                  mode === "register"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-white"
                }`}
              >
                Signup
              </button>
            </div>
          </div>

          {mode === "login" ? (
            <>
              <div className="mb-4 flex justify-center">
                <p className="mt-2 text-center text-xs text-gray-500">
                  Please enter your Race Auto India login credentials below
                </p>
              </div>
              <LoginForm onSuccess={onClose} />
            </>
          ) : (
            <>
              <div className="mb-4 flex justify-center">
                <p className="mt-2 text-center text-xs text-gray-500">
                  New to Race Auto India? Create an account below
                </p>
              </div>
              <SignupForm onSuccess={onClose} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// "use client";

// import React, { useState } from "react";
// import { Modal, CloseButton } from "react-bootstrap";
// import LoginForm from "./LoginForm";
// import { usePathname } from "next/navigation";
// import SignupForm from '@/app/components/register/signup'

// export default function AuthModal({ show, onClose }) {
//   const pathname = usePathname();
//   const isHome = pathname === "/";
//   const [mode, setMode] = useState("login");

//   return (
//     <Modal show={show} onHide={isHome ? onClose : undefined} centered size="sm">
//       <Modal.Body className="position-relative">
//         {/* Show close button only on home path */}
//         {isHome && (
//           <div className="position-absolute top-0 end-0 m-2">
//             <CloseButton onClick={onClose} />
//           </div>
//         )}
// {/* {
//         <CloseButton onClick={onClose} /> } */}
//         <div className="d-flex justify-content-center mb-3 ">
//           <div className="btn-group me-3" role="group" >
//             <button

//               className={`btn ${mode === 'login' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
//               onClick={() => setMode('login')}
//             >
//               Login
//             </button>
//             <button
//               className={`btn ${mode === 'register' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
//               onClick={() => setMode('register')}
//             >
//               Signup
//             </button>
//           </div>
//         </div>

//         {/* Forms */}
//         {mode === "login" ? (
//           <>
//             <div className="d-flex justify-content-center mb-3">
//               <p className="p-0 m-0 text-center text-muted mt-2">
//                 Please enter your Race Auto India login credentials below
//               </p>
//             </div>
//             <LoginForm onSuccess={onClose} />
//           </>
//         ) : (
//           <>
//             <div className="d-flex justify-content-center mb-3">
//               <p className="p-0 m-0 text-center text-muted mt-2">
//                 New to Race Auto India? Create an account below
//               </p>
//             </div>

//             <SignupForm onSuccess={onClose} />
//           </>
//         )}
//       </Modal.Body>
//     </Modal>
//   );
// }
