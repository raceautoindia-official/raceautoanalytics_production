import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import NavBar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import FlashSubscriptionManager from "@/app/flash-reports/components/FlashSubscriptionManager";
import React, { Suspense } from "react";


export const dynamic = "force-dynamic";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Fallback title/description only — each segment route exports its own
// metadata, which overrides these. Kept so any future child without metadata
// still has something sensible.
export const metadata: Metadata = {
  title: "Flash Reports - RaceAutoAnalytics",
  description:
    "Monthly automotive flash reports: vehicle sales data by country, OEM segment share, and EV adoption trends.",
};

// Next 14 requires viewport as its own export; declaring it inside `metadata`
// is unsupported and logged a warning for every flash-report route.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} min-h-screen`}>
      <NavBar />
      <Suspense fallback={null}>
        <FlashSubscriptionManager>
          <main className="pt-5">{children} </main>
        </FlashSubscriptionManager>
      </Suspense>

      <Footer />
    </div>
  );
}
