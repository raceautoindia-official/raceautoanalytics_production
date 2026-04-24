"use client";

import Link from "next/link";
import { Mail, Phone, Facebook, Instagram, Linkedin, Youtube, Twitter } from "lucide-react";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-[#191a1c] text-white">
      {/* Top row */}
      <div className="mx-auto w-[95vw] xl:w-[93vw] 2xl:w-[90vw] max-w-none px-2 sm:px-3 lg:px-4 py-8 md:py-9">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-8 items-start">
          {/* Brand + tagline */}
          <div className="md:col-span-5">
            {/* keep logo + tagline on ONE line so the column top aligns with others */}
            <div className="flex items-center gap-4">
              <Image
                src="/images/logo.webp"
                alt="RACE Analytics"
                width={360}
                height={88}
                sizes="(min-width: 1024px) 360px, 280px"
                className="h-14 w-auto lg:h-16 shrink-0"
                priority
              />
              <div className="text-[11px] leading-4 text-white/60">
                Analytics for the automotive &amp; industrial equipment industry
              </div>
            </div>

            {/* keep the description below with the same spacing as other columns' content */}
            <p className="mt-4 max-w-xl text-[13px] leading-5 text-white/75">
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
            <ul className="mt-4 space-y-1.5 text-[13px] text-white/80">
              <li>
                <Link
                  href="/flash-reports/overview"
                  className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded"
                >
                  Flash Reports
                </Link>
              </li>
              <li>
                <Link
                  href="/forecast/overview"
                  className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded"
                >
                   Forecast 
                </Link>
              </li>
              <li className="pt-2">
                <h4 className="text-xs font-semibold tracking-wide text-white/85">Follow Us</h4>
                <div className="mt-2 flex items-center gap-2 text-white/80">
                  <a
                    href="https://www.facebook.com/raceautoindia/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Race Auto India on Facebook"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                  <a
                    href="https://x.com/raceautoindia"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Race Auto India on X"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"
                  >
                    <Twitter className="h-4 w-4" />
                  </a>
                  <a
                    href="https://www.instagram.com/race.auto.india/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Race Auto India on Instagram"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                  <a
                    href="https://www.linkedin.com/company/race-auto-india/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Race Auto India on LinkedIn"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                  <a
                    href="https://www.youtube.com/@RaceAutoIndia"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Race Auto India on YouTube"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"
                  >
                    <Youtube className="h-4 w-4" />
                  </a>
                </div>
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
          <div className="md:col-span-4">
            <h3 className="text-sm font-semibold tracking-wide text-white/90">
              Contact
            </h3>
            <ul className="mt-4 space-y-1.5 text-[13px] text-white/80">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-white/60" />
                <a
                  href="mailto:info@raceautoindia.com"
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
                 +91 8072098352
                </a>
              </li>
              <li className="pt-1 text-white/70">GST No. 33AAFCR6885E1Z6</li>
              <li className="text-white/70">CIN. U73100TN2011PTC083486</li>
              <Link href='https://raceinnovations.in/'><li className="pt-1.5 flex items-center gap-2 text-white/80">
                <span>Powered by Race Innovations Pvt Ltd Co.</span>
                <Image
                  src="/images/Ri-Logo-Graph-White.webp"
                  alt="Race Innovations"
                  width={44}
                  height={44}
                  className="h-10 w-auto"
                />
              </li></Link>
            </ul>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-white/10" />

      {/* Bottom bar */}
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex flex-col gap-2 text-[12px] text-white/60 md:flex-row md:items-center md:justify-between">
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
