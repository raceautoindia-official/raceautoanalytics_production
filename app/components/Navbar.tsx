"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Hexagon, Menu, X } from "lucide-react";
import LoginNavButton from "@/app/flash-reports/components/Login/LoginAuthButton";

/* ---------- Fixed header with static spacer ---------- */
function StickyLikeHeader({ children }: React.PropsWithChildren) {
  return (
    <>
      {/* Spacer that reserves room for the fixed header.
          Keep in sync with the navbar top-row height */}
      <div className="h-14 sm:h-16 md:h-20" aria-hidden />

      <div
        className="
          fixed inset-x-0 top-0 z-50
          border-b border-white/10 
          bg-black/50 
          backdrop-blur-md
        "
      >
        {children}
      </div>
    </>
  );
}

/* ---------- CTA buttons ---------- */
function FlashOutlineButton({
  href,
  children,
}: React.PropsWithChildren<{ href: string }>) {
  return (
    <Link
      id="flash-report-btn"
      href={href}
      className="relative inline-flex h-11 items-center gap-2 rounded-2xl bg-[#0b1324] px-5 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)] transition hover:ring-white/40"
      style={{ color: "#fff" }}
    >
      <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 to-transparent opacity-20" />
      <Hexagon className="h-4 w-4 text-amber-300" />
      {children}
    </Link>
  );
}

function YellowButton({
  href,
  children,
}: React.PropsWithChildren<{ href: string }>) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center rounded-2xl bg-gradient-to-b from-yellow-400 to-amber-500 px-5 text-sm font-semibold text-slate-900 shadow-[0_16px_40px_rgba(245,158,11,.35)] transition hover:from-yellow-300 hover:to-amber-400"
    >
      {children}
    </Link>
  );
}

/* ---------- NavBar ---------- */
export default function NavBar() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <>
      <StickyLikeHeader>
        <div className="mx-auto w-[95vw] xl:w-[93vw] 2xl:w-[90vw] max-w-none px-2 sm:px-3 lg:px-4">
          {/* Top row */}
          <div className="flex h-14 items-center justify-between gap-2 sm:h-16 md:h-20">
            {/* Logo (clickable → home) */}
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/logo.webp"
                alt="RACE Analytics"
                width={360}
                height={88}
                className="h-10 w-auto shrink-0 sm:h-14 lg:h-20"
                priority
              />
            </Link>

            {/* Center nav – desktop only */}
            <nav id="site-nav" className="hidden items-center gap-16 md:flex">
              <Link
                className="text-sm font-extrabold tracking-wide text-white hover:text-white"
                href="https://raceautoindia.com/"
              >
                NEWS
              </Link>
              <Link
                className="text-sm font-extrabold tracking-wide text-white hover:text-white"
                href="https://raceautoindia.com/magazine"
              >
                MAGAZINE
              </Link>
              <Link
                className="text-sm font-extrabold tracking-wide text-white hover:text-white"
                href="https://raceautoindia.com/page/contact"
              >
                CONTACT&nbsp;US
              </Link>
            </nav>

            {/* CTAs + mobile menu toggle */}
            <div className="flex items-center gap-2">
              {/* Desktop CTAs */}
              <div className="hidden items-center gap-3 md:flex">
                <FlashOutlineButton href="/flash-reports">
                  Flash Report
                </FlashOutlineButton>
                <YellowButton href="https://raceautoindia.com/subscription">
                  Subscribe
                </YellowButton>
                <LoginNavButton />
              </div>

              {/* Mobile actions */}
              <div className="flex items-center gap-2 md:hidden">
                {/* Login on mobile */}
                <LoginNavButton />

                {/* Compact Flash CTA on mobile */}
                <Link
                  href="/flash-reports"
                  className="inline-flex items-center rounded-full border border-white/40 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur-sm"
                >
                  <Hexagon className="mr-1 h-3 w-3 text-amber-300" />
                  Flash Report
                </Link>

                {/* Hamburger menu */}
                <button
                  type="button"
                  onClick={() => setMobileOpen((open) => !open)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white shadow-sm backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  aria-label="Toggle navigation menu"
                  aria-expanded={mobileOpen}
                >
                  {mobileOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu (overlays content under the bar) */}
          {mobileOpen && (
            <div className="md:hidden border-t border-white/10 pb-3 pt-2">
              <nav className="flex flex-col gap-2 text-sm font-semibold text-white">
                <Link
                  href="https://raceautoindia.com/"
                  className="rounded-lg px-2 py-1.5 hover:bg-white/10"
                  onClick={() => setMobileOpen(false)}
                >
                  NEWS
                </Link>
                <Link
                  href="https://raceautoindia.com/magazine"
                  className="rounded-lg px-2 py-1.5 hover:bg-white/10"
                  onClick={() => setMobileOpen(false)}
                >
                  MAGAZINE
                </Link>
                <Link
                  href="https://raceautoindia.com/page/contact"
                  className="rounded-lg px-2 py-1.5 hover:bg-white/10"
                  onClick={() => setMobileOpen(false)}
                >
                  CONTACT&nbsp;US
                </Link>
                <YellowButton href="https://raceautoindia.com/subscription">
                  Subscribe
                </YellowButton>
              </nav>
            </div>
          )}
        </div>
      </StickyLikeHeader>

      {/* Force white for nav + Flash Report label (beats any global dimming) */}
      <style jsx global>{`
        #site-nav,
        #site-nav * {
          color: #ffffff !important;
          opacity: 1 !important;
          filter: none !important;
          mix-blend-mode: normal !important;
        }
        #site-nav a::before,
        #site-nav a:before,
        #site-nav a + a::before,
        #site-nav li::before {
          content: none !important;
          display: none !important;
        }
        #site-nav ul,
        #site-nav li {
          list-style: none !important;
        }
        #flash-report-btn,
        #flash-report-btn * {
          color: #ffffff !important;
          opacity: 1 !important;
          filter: none !important;
          mix-blend-mode: normal !important;
        }
      `}</style>
    </>
  );
}
