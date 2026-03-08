"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export function SafePortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  const el = useMemo(() => {
    if (typeof document === "undefined") return null;
    return document.createElement("div");
  }, []);

  useEffect(() => {
    if (!el || typeof document === "undefined") return;

    // append
    document.body.appendChild(el);
    setMounted(true);

    // safe cleanup (prevents removeChild crash)
    return () => {
      setMounted(false);
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }, [el]);

  if (!mounted || !el) return null;
  return createPortal(children, el);
}