// app/not-found.tsx
// Audit F-04: branded 404 that keeps the site header/nav and gives users a
// clear way back (home + key destinations) instead of a bare unstyled
// dead-end. Only renders for unknown routes; existing routes are unaffected.
import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "./components/Navbar";
import Footer from "@/app/components/Footer";

export const metadata: Metadata = {
  title: "Page not found",
  description:
    "The page you were looking for could not be found on Race Auto Analytics.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <>
      <NavBar />
      <main className="min-h-[60vh] bg-slate-950 text-white">
        <div className="mx-auto flex w-[95vw] max-w-3xl flex-col items-center px-4 py-20 text-center sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">
            Error 404
          </p>
          <h1 className="mt-4 text-5xl font-extrabold tracking-tight sm:text-6xl">
            Page not found
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 md:text-base">
            The page you&apos;re looking for doesn&apos;t exist or may have been
            moved. Let&apos;s get you back to the analytics.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Back to home
            </Link>
            <Link
              href="/flash-reports/overview"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              Flash reports
            </Link>
            <Link
              href="/forecast/overview"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              Forecast
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
