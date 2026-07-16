"use client";

// Segment-level error boundary for all /admin pages (incl. the CMS). A render
// crash shows a retry fallback instead of a blank screen.
import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin/CMS render error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        background: "#fff",
        color: "#111",
      }}
    >
      <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
        Something went wrong
      </h2>
      <p style={{ marginTop: 8, maxWidth: 480, color: "#666", fontSize: 14 }}>
        A temporary error occurred while rendering this CMS page. Please retry.
      </p>
      <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
        <button
          onClick={() => reset()}
          style={{
            background: "#2563eb",
            color: "#fff",
            borderRadius: 8,
            padding: "10px 20px",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: "#fff",
            color: "#111",
            borderRadius: 8,
            padding: "10px 20px",
            fontWeight: 600,
            border: "1px solid #ddd",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </div>
    </div>
  );
}
