"use client";

/**
 * SharedNoCountriesModal
 *
 * Shown to shared-membership users who have no Flash Report countries assigned yet.
 * They cannot self-select countries — only the plan owner can assign them.
 */

interface Props {
  parentEmail: string | null;
  onDismiss: () => void;
}

export default function SharedNoCountriesModal({ parentEmail, onDismiss }: Props) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#050B1A]/85 backdrop-blur-[3px]" />

      {/* Modal */}
      <div className="relative w-full max-w-[480px] overflow-hidden rounded-[24px] border border-white/10 bg-[#0B1228] shadow-[0_30px_90px_rgba(0,0,0,0.85)]">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[600px] -translate-x-1/2 rounded-full bg-[#4F67FF]/15 blur-3xl" />

        <div className="relative px-7 py-6">
          {/* Close */}
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 text-[#EAF0FF]/40 hover:text-[#EAF0FF]/70 transition text-xl leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>

          <div className="text-xl font-semibold text-[#EAF0FF]">
            Countries Not Assigned Yet
          </div>

          <div className="mt-3 text-sm text-[#EAF0FF]/65 leading-relaxed">
            Your shared membership countries have not been assigned yet. Please
            contact your plan owner to assign your countries.
          </div>

          {parentEmail && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs text-[#EAF0FF]/40 mb-0.5">Plan owner</div>
              <div className="text-sm text-[#7B93FF] font-medium">{parentEmail}</div>
            </div>
          )}

          <div className="mt-5 text-xs text-[#EAF0FF]/35 leading-relaxed">
            Once your plan owner assigns countries to your membership, you will
            be able to access Flash Reports for those countries.
          </div>

          <div className="mt-6">
            <button
              onClick={onDismiss}
              className="w-full h-11 rounded-xl border border-white/10 bg-white/5 text-[#EAF0FF]/80 text-sm font-semibold hover:bg-white/10 transition"
            >
              OK, Got It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
