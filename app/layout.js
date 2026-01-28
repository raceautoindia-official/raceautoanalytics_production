import "antd/dist/reset.css";
// import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

import { Inter } from "next/font/google";
// import BootstrapClient from "./BootstrapClient";
import { AuthModalProvider } from "@/utils/AuthModalcontext";
import { Providers } from "@/components/providers/Providers";
import { Suspense } from "react"; // ⬅️ add this

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Race Auto Analytics",
  description: "RACE Analytics",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* keep body simple; no inline style strings that mix CSS vars */}
      <body className={`${inter.className} ${inter.variable} antialiased`} suppressHydrationWarning>
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
