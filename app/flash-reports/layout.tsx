// import './globals.css';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import NavBar from "@/app/components/Navbar";
import React, { Suspense } from "react"; // ⬅️ add Suspense

// ⬇️ Add this line near the top (but after imports)
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen">
        <NavBar />
        <Suspense fallback={null}>
          <Providers>
            <main className="pt-5">{children}</main>
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}
