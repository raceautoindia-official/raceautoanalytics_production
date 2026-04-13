"use client";

/**
 * ForecastSharedNoRegionsModal
 *
 * Shown to shared (inherited) plan users when the plan owner has not yet
 * assigned any Forecast region slots. This is an informational-only modal —
 * shared users cannot self-assign regions.
 *
 * The modal is dismissible; after dismissal the user can still browse
 * Forecast but the region selector will not be locked (fallback to free-user
 * behaviour until the owner assigns regions).
 */

import React, { useState } from "react";

interface Props {
  parentEmail: string | null;
}

export default function ForecastSharedNoRegionsModal({ parentEmail }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-[440px] rounded-2xl border border-white/10 bg-[#0B1228] shadow-2xl p-6">
        {/* Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <span className="text-2xl">🌐</span>
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-center text-base font-semibold text-[#EAF0FF] mb-2">
          Forecast Regions Not Yet Assigned
        </h2>

        {/* Body */}
        <p className="text-center text-sm text-[#EAF0FF]/55 leading-relaxed mb-4">
          Your shared membership does not yet have Forecast regions assigned.
          Region access is managed by your plan owner.
        </p>

        {parentEmail ? (
          <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3 mb-4 text-center">
            <div className="text-xs text-[#EAF0FF]/40 mb-0.5">
              Contact your plan owner
            </div>
            <div className="text-sm text-[#7B93FF] font-medium">
              {parentEmail}
            </div>
          </div>
        ) : (
          <p className="text-center text-xs text-[#EAF0FF]/35 mb-4">
            Please contact your plan owner to assign your Forecast region slots.
          </p>
        )}

        <button
          onClick={() => setDismissed(true)}
          className="w-full h-10 rounded-xl border border-white/15 bg-white/6 text-sm font-semibold text-white hover:bg-white/12 transition"
        >
          OK, Got It
        </button>
      </div>
    </div>
  );
}
