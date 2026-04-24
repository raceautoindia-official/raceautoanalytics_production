"use client";

import React, { createContext, useContext, useState } from "react";

const SubscriptionModalContext = createContext(null);

export function SubscriptionModalProvider({ children }) {
  const [show, setShow] = useState(false);

  const open = () => {
    window.location.href = "/subscription";
  };

  const close = () => {
    document.body.style.overflow = "";
    setShow(false);
  };

  return (
    <SubscriptionModalContext.Provider value={{ show, open, close }}>
      {children}
    </SubscriptionModalContext.Provider>
  );
}

export function useSubscriptionModal() {
  const ctx = useContext(SubscriptionModalContext);
  if (!ctx) {
    throw new Error("useSubscriptionModal must be used within SubscriptionModalProvider");
  }
  return ctx;
}
