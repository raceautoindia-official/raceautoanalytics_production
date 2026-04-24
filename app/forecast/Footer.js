// app/forecast/Footer.js
import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-4 border-t border-white/15 py-4 text-center text-sm text-white/70">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-2 px-4 sm:flex-row sm:gap-3">
        <span>(c) Copyright 2025 Race Auto India - All Rights Reserved.</span>

        <nav className="flex flex-wrap items-center justify-center gap-2">
          <Link
            href="https://raceautoindia.com/page/terms-conditions"
            className="hover:text-[#15AFE4] hover:underline"
          >
            Terms & Conditions
          </Link>
          <span className="text-white/40">|</span>
          <Link
            href="https://raceautoindia.com/page/privacy"
            className="hover:text-[#15AFE4] hover:underline"
          >
            Privacy Policy
          </Link>
          <span className="text-white/40">|</span>
          <Link
            href="https://raceautoindia.com/page/contact"
            className="hover:text-[#15AFE4] hover:underline"
          >
            Contact Us
          </Link>
        </nav>
      </div>
      <div className="mx-auto mt-2 max-w-7xl px-4 text-center text-xs text-white/55">
        GST No. 33AAFCR6885E1Z6 | CIN. U73100TN2011PTC083486 | Powered by Race Innovations Pvt Ltd
      </div>
    </footer>
  );
}
