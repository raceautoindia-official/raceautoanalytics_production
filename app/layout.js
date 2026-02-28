import "antd/dist/reset.css";
// import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

import { Inter } from "next/font/google";
// import BootstrapClient from "./BootstrapClient";
import { AuthModalProvider } from "@/utils/AuthModalcontext";
import { Providers } from "@/components/providers/Providers";
import { Suspense } from "react"; // ⬅️ add this
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = "https://raceautoanalytics.com/"; // change
const siteName = "Race Auto Analytics"; // change
const title = "Race Auto Analytics | Automotive Sales Forecast & Market Analytics";
const description =
  "Automotive market analytics and forecasting platform with segment-wise volumes, AI forecasts, trends, and country-wise flash reports for OEMs and industry teams.";

  export const metadata= {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: `%s | ${siteName}`,
  },
  description,
  keywords: [
    "automotive forecast",
    "vehicle sales forecast",
    "auto industry analytics",
    "automotive market intelligence",
    "sales forecasting dashboard",
    "country-wise flash reports",
    "OEM market share analytics",
    "two wheeler forecast",
    "three wheeler forecast",
    "passenger vehicle forecast",
    "commercial vehicle forecast",
    "truck sales forecast",
    "bus sales forecast",
    "tractor sales forecast",
    "construction equipment forecast",
    "EV penetration analytics",
    "MoM YoY analysis",
    "market share dashboard",
    "demand forecasting",
    "automotive insights platform",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title,
    description,
    siteName,
    images: [
      {
        url: "/", // create this image in /public/og/home.png
        width: 1200,
        height: 630,
        alt: "RACE Flash Forecast - Automotive Forecast & Analytics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/images/logo.webp"],
  },
  icons: {
    icon: "/favicon.ico",

  },
}; 

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* keep body simple; no inline style strings that mix CSS vars */}
      <body className={`${inter.className} ${inter.variable} antialiased`} suppressHydrationWarning>
         {GA_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { anonymize_ip: true });
              `}
            </Script>
          </>
        ) : null}
        <Suspense fallback={null}>
          <Providers>
            {/* <BootstrapClient /> */}
            <AuthModalProvider>{children}</AuthModalProvider>
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}
