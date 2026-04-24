"use client";

type Props = {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

export default function CountryAccessInfoModal({
  open,
  title,
  message,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close country access notice"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/95 p-5 shadow-2xl shadow-black/50 ring-1 ring-white/10">
        <div className="text-lg font-semibold text-white">{title}</div>
        <p className="mt-3 text-sm leading-relaxed text-white/75">{message}</p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

