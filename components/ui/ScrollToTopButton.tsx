"use client";

import { ChevronUp } from "lucide-react";

export default function ScrollToTopButton() {
  const handleClick = () => {
    if (typeof window === "undefined") return;

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    if (document.documentElement) {
      document.documentElement.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }

    if (document.body) {
      document.body.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      title="Scroll to top"
      onClick={handleClick}
      className={[
        "group fixed bottom-5 right-5 md:bottom-6 md:right-6",
        "z-[9999] flex h-12 w-12 items-center justify-center rounded-2xl",
        "border border-[#C7D7FF] bg-[#F4F8FF] text-[#214CFF] backdrop-blur-md",
        "shadow-[0_12px_30px_rgba(15,23,42,0.12),0_6px_14px_rgba(49,91,255,0.10)]",
        "ring-1 ring-white/70",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:scale-[1.03] hover:bg-[#F8FAFF] hover:border-[#AFC4FF]",
        "hover:text-[#1F4BFF] hover:shadow-[0_18px_38px_rgba(15,23,42,0.16),0_10px_22px_rgba(49,91,255,0.16)]",
        "active:translate-y-0 active:scale-[0.98]",
        "focus:outline-none focus:ring-2 focus:ring-[#4F67FF]/35 focus:ring-offset-2 focus:ring-offset-white",
      ].join(" ")}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <ChevronUp size={22} strokeWidth={2.5} />
    </button>
  );
}