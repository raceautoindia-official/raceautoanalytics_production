"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

export default function ScrollToTopButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > 200);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      className="fixed bottom-6 right-6 z-[9999] flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-500"
    >
      <ChevronUp size={22} />
    </button>
  );
}