"use client";

// Segment-level error boundary for all /flash-reports pages. Renders inside the
// Flash Reports layout (nav stays), so a render crash in a chart/page shows a
// retry fallback instead of blanking the whole screen.
import { useEffect } from "react";

export default function FlashReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Flash Reports render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-slate-950 px-4 text-center text-white">
      <h2 className="text-xl font-semibold">
        Something went wrong loading this page
      </h2>
      <p className="mt-2 max-w-md text-sm text-white/70">
        A temporary error occurred while rendering. Your data is safe — please
        retry.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => reset()}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          Retry
        </button>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10"
        >
          Reload page
        </button>
      </div>
    </div>
  );
}
