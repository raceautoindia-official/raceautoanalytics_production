import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import NavBar from "@/app/components/Navbar";
import React, { Suspense } from "react";

export const dynamic = "force-dynamic";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Flash Reports - RaceAutoAnalytics",
  description: "AI-powered automotive market insights and flash reports",
  viewport: "width=device-width, initial-scale=1",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} min-h-screen`}>
      <NavBar />
      <Suspense fallback={null}>
        <Providers>
          <main className="pt-5">{children}</main>
        </Providers>
      </Suspense>
    </div>
  );
}