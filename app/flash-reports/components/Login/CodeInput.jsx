"use client";

import React, { useMemo, useRef } from "react";

export default function CodeInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = false,
}) {
  const refs = useRef([]);

  const digits = useMemo(() => {
    const clean = String(value || "").replace(/\D/g, "").slice(0, length);
    return Array.from({ length }, (_, i) => clean[i] || "");
  }, [value, length]);

  const setDigit = (index, digit) => {
    const next = [...digits];
    next[index] = digit;
    onChange(next.join(""));
  };

  const focusIndex = (index) => {
    const el = refs.current[index];
    if (el) el.focus();
  };

  const handleChange = (index, e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setDigit(index, "");
      return;
    }

    if (raw.length > 1) {
      const next = [...digits];
      for (let i = index; i < length && i - index < raw.length; i += 1) {
        next[i] = raw[i - index];
      }
      onChange(next.join(""));
      const nextIndex = Math.min(index + raw.length, length - 1);
      focusIndex(nextIndex);
      return;
    }

    setDigit(index, raw);
    if (index < length - 1) {
      focusIndex(index + 1);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        setDigit(index, "");
        return;
      }
      if (index > 0) {
        e.preventDefault();
        focusIndex(index - 1);
      }
      return;
    }

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusIndex(index - 1);
    }

    if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      focusIndex(index + 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);

    const nextIndex = Math.min(pasted.length, length) - 1;
    if (nextIndex >= 0) focusIndex(nextIndex);
  };

  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-1.5 sm:gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          autoFocus={autoFocus && index === 0}
          disabled={disabled}
          className="h-10 w-9 rounded-xl border border-white/15 bg-black/35 text-center text-base font-semibold text-white outline-none transition focus:border-[#4F67FF]/70 focus:ring-2 focus:ring-[#4F67FF]/35 disabled:opacity-60 sm:h-11 sm:w-10 sm:text-lg md:w-11"
        />
      ))}
    </div>
  );
}
