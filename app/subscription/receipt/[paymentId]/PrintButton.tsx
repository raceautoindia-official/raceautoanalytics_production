"use client";

// Tiny client-only print trigger so the receipt page itself can stay a
// server component (which does the authenticated DB lookup).
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
      className="rounded border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100"
    >
      Print / Save as PDF
    </button>
  );
}
