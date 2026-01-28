"use client";

import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-[#191a1c] text-white">
      {/* Top row */}
      <div className="mx-auto w-[95vw] xl:w-[93vw] 2xl:w-[90vw] max-w-none px-2 sm:px-3 lg:px-4
 py-10 md:py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-12 items-start">
          {/* Brand + tagline */}
          <div className="md:col-span-6">
            {/* keep logo + tagline on ONE line so the column top aligns with others */}
            <div className="flex items-center gap-4">
              <Image
                src="/images/logo.webp"
                alt="RACE Analytics"
                width={360}
                height={88}
                sizes="(min-width: 1024px) 360px, 280px"
                className="h-16 w-auto lg:h-20 shrink-0"
                priority
              />
              <div className="text-[12px] leading-4 text-white/60">
                Analytics for the automotive &amp; industrial equipment industry
              </div>
            </div>

            {/* keep the description below with the same spacing as other columns' content */}
            <p className="mt-6 max-w-xl text-[13px] leading-6 text-white/75">
              The leading AI-driven market intelligence platform providing
              comprehensive analytics across automotive, commercial vehicles,
              industrial equipment, and related sectors.
            </p>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3">
            <h3 className="text-sm font-semibold tracking-wide text-white/90">
              Quick Links
            </h3>
            <ul className="mt-6 space-y-2 text-[13px] text-white/80">
              <li>
                <Link
                  href="flash-reports"
                  className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded"
                >
                  Flash Reports
                </Link>
              </li>
              <li>
                <Link
                  href="/forecast"
                  className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded"
                >
                   Forecast 
                </Link>
              </li>
              {/* <li>
                <Link
                  href="#"
                  className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded"
                >
                  Market Analytics
                </Link>
              </li> */}
            </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-3">
            <h3 className="text-sm font-semibold tracking-wide text-white/90">
              Contact
            </h3>
            <ul className="mt-6 space-y-2 text-[13px] text-white/80">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-white/60" />
                <a
                  href="mailto:info@raceanalytics.com"
                  className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded"
                >
                 info@raceautoindia.com

                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-white/60" />
                <a
                  href="tel:+15551234567"
                  className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded"
                >
                 +91 8072098352, +91 9962110101
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-white/10" />

      {/* Bottom bar */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex flex-col gap-3 text-[12px] text-white/60 md:flex-row md:items-center md:justify-between">
          <div>© Copyright 2025 RACE EDITORIALE LLP – All Rights Reserved.</div>

          <nav aria-label="Footer links" className="flex flex-wrap items-center">
            <Link href="/terms-conditions" className="hover:text-white">
              Terms &amp; Conditions
            </Link>
            <span className="mx-2 select-none text-white/35">•</span>
            <Link href="privacy-policy" className="hover:text-white">
              Privacy Policy
            </Link>
            <span className="mx-2 select-none text-white/35">•</span>
            <Link href="https://raceautoindia.com/page/contact" className="hover:text-white">
              Contact Us
            </Link>
            {/* <span className="mx-2 select-none text-white/35">•</span>
            <Link href="#" className="hover:text-white">
              Disclaimer
            </Link> */}
          </nav>
        </div>
      </div>
    </footer>
  );
}
