"use client";

import React, { createContext, useContext, useState } from "react";

const AuthModalContext = createContext(null);

export const AuthModalProvider = ({ children }) => {
  const [show, setShow] = useState(false);

  const open = () => {
    document.body.style.overflow = "hidden";
    setShow(true);
  };
  const close = () => {
    document.body.style.overflow = "";
    setShow(false);
  };

  return (
    <AuthModalContext.Provider value={{ show, open, close }}>
      {children}
    </AuthModalContext.Provider>
  );
};

export const useAuthModal = () => {
  const ctx = useContext(AuthModalContext);
  if (!ctx)
    throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
};
