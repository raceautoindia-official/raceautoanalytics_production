"use client";

// Last-resort error boundary. Catches render errors that escape every other
// boundary — including the ROOT layout — so the app shows a recoverable
// fallback instead of a fully blank (black/white) screen. Must render its own
// <html>/<body> because it replaces the root layout when it fires.
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces the real cause in the console / monitoring instead of a silent blank.
    console.error("Global render error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#050B1A",
          color: "#EAF0FF",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
          Something went wrong
        </h2>
        <p style={{ marginTop: 8, maxWidth: 480, fontSize: 14, opacity: 0.7 }}>
          A temporary error occurred while rendering the page. Your data is
          safe — please retry.
        </p>
        <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
          <button
            onClick={() => reset()}
            style={{
              background: "#4F67FF",
              color: "#fff",
              borderRadius: 12,
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
              background: "transparent",
              color: "#EAF0FF",
              borderRadius: 12,
              padding: "10px 20px",
              fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.15)",
              cursor: "pointer",
            }}
          >
            Reload page
          </button>
        </div>
      </body>
    </html>
  );
}
