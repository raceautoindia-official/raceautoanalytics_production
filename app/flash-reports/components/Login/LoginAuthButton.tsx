"use client";

import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import AuthModal from "./LoginModal";
import { useAuthModal } from "@/utils/AuthModalcontext";
import { useRouter } from "next/navigation";

const LoginNavButton = () => {
  const [token, setToken] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const { show, open, close } = useAuthModal();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    const cookieToken = Cookies.get("authToken") || null;
    setToken(cookieToken);

    if (!cookieToken) {
      open(); // auto open modal if not logged in
    }
  }, []);

  if (!isMounted) return null;

  const handleLogout = () => {
    Cookies.remove("authToken");
    setToken(null);
    router.refresh();
  };

  const baseBtnClasses =
    "ml-auto inline-flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl border text-sm font-semibold tracking-tight backdrop-blur-md transition " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent " +
    "active:translate-y-0";

  const loginBtnClasses =
    baseBtnClasses +
    " border-white/20 bg-white/10 text-white/90 " +
    "shadow-[inset_0_0_0_1px_rgba(47,57,73,0.40),0_12px_30px_rgba(17,24,39,0.35)] " +
    "hover:bg-white/15 hover:border-white/30 hover:text-white " +
    "hover:shadow-[inset_0_0_0_1px_rgba(47,57,73,0.48),0_18px_40px_rgba(30,64,175,0.35)] " +
    "active:shadow-[inset_0_0_0_1px_rgba(47,57,73,0.50),0_8px_18px_rgba(0,0,0,0.35)]";

  const logoutBtnClasses =
    baseBtnClasses +
    " border-white/20 bg-red-600 text-white " +
    "shadow-[inset_0_0_0_1px_rgba(47,57,73,0.35),0_14px_34px_rgba(220,38,38,0.35)] " +
    "hover:bg-red-500 hover:shadow-[inset_0_0_0_1px_rgba(47,57,73,0.45),0_20px_44px_rgba(220,38,38,0.45)]";

  return (
    <>
      {!token ? (
        <>
          <button className={loginBtnClasses} onClick={open}>
            Login
          </button>
          {show && <AuthModal show={show} onClose={close} />}
        </>
      ) : (
        <button className={logoutBtnClasses} onClick={handleLogout}>
          Logout
        </button>
      )}
    </>
  );
};

export default LoginNavButton;


// "use client";

// import React, { useEffect, useState } from "react";
// import Cookies from "js-cookie";
// import AuthModal from "./LoginModal";
// import { useAuthModal } from "@/utils/AuthModalcontext";
// import { useRouter } from "next/navigation"; // ✅ Import useRouter

// const LoginNavButton = () => {
//   const [token, setToken] = useState(null);
//   const [isMounted, setIsMounted] = useState(false);
//   const { show, open, close } = useAuthModal();
//   const router = useRouter(); // ✅ Initialize router

//   useEffect(() => {
//     setIsMounted(true);
//     const cookieToken = Cookies.get("authToken") || null;
//     setToken(cookieToken);

//     if (!cookieToken) {
//       open(); // auto open modal if not logged in
//     }
//   }, []);

//   if (!isMounted) return null;

//   const handleLogout = () => {
//     Cookies.remove("authToken");
//     setToken(null);
//     router.refresh(); // ✅ Refresh the current path
//   };

//   return (
//     <>
//       {!token ? (
//         <>
//           <button
//             className="nav-btn ms-auto"
//             onClick={open}
//             style={{ cursor: "pointer" }}
//           >
//             Login
//           </button>
//           {show && <AuthModal show={show} onClose={close} />}
//         </>
//       ) : (
//         <button
//           className="nav-btn ms-auto"
//           onClick={handleLogout}
//           // keep inline color if you want the red look for logout
//           style={{ cursor: "pointer", backgroundColor: "#cc2936", color: "#fff" }}
//         >
//           Logout
//         </button>
//       )}

//       {/* --- Updated styles (matches your Dark/Glow button aesthetic) --- */}
//       <style>
//         {`
//         .nav-btn {
//           --btn-bg: rgba(255,255,255,0.08);
//           --btn-border: rgba(255,255,255,0.12);
//           --btn-text: rgba(255,255,255,0.92);
//           --btn-hover-bg: rgba(255,255,255,0.12);
//           --btn-hover-border: rgba(255,255,255,0.20);

//           display: inline-flex;
//           align-items: center;
//           gap: 8px;
//           padding: 10px 16px;
//           border-radius: 12px;
//           border: 1px solid var(--btn-border);
//           background: var(--btn-bg);
//           color: var(--btn-text);
//           font-size: 14px;
//           font-weight: 600;
//           letter-spacing: 0.01em;
//           backdrop-filter: blur(6px);

//           /* Subtle hairline + depth (like your ring effect) */
//           box-shadow:
//             inset 0 0 0 1px rgba(47,57,73,0.40),
//             0 12px 30px rgba(17,24,39,0.35);

//           transition:
//             background 200ms ease,
//             border-color 200ms ease,
//             color 200ms ease,
//             box-shadow 200ms ease,
//             transform 150ms ease;
//         }

//         .nav-btn:hover {
//           background: var(--btn-hover-bg);
//           border-color: var(--btn-hover-border);
//           color: #fff;
//           transform: translateY(-1px);
//           box-shadow:
//             inset 0 0 0 1px rgba(47,57,73,0.48),
//             0 18px 40px rgba(30,64,175,0.35);
//         }

//         .nav-btn:focus-visible {
//           outline: none;
//           /* focus ring to match your theme */
//           box-shadow:
//             0 0 0 2px rgba(59,130,246,0.60),
//             inset 0 0 0 1px rgba(255,255,255,0.15);
//         }

//         .nav-btn:active {
//           transform: translateY(0);
//           box-shadow:
//             inset 0 0 0 1px rgba(47,57,73,0.50),
//             0 8px 18px rgba(0,0,0,0.35);
//         }

//         /* Optional: if you decide to remove the inline style on Logout,
//            add class="nav-btn nav-btn--danger" and use this look instead. */
//         .nav-btn--danger {
//           background: #cc2936;
//           color: #fff;
//           border-color: rgba(255,255,255,0.12);
//           box-shadow:
//             inset 0 0 0 1px rgba(47,57,73,0.35),
//             0 14px 34px rgba(204,41,54,0.35);
//         }
//         .nav-btn--danger:hover {
//           background: #d63542;
//           box-shadow:
//             inset 0 0 0 1px rgba(47,57,73,0.45),
//             0 20px 44px rgba(204,41,54,0.45);
//         }
//         `}
//       </style>
//     </>
//   );
// };

// export default LoginNavButton;
