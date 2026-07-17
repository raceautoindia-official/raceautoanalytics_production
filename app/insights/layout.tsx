import React from "react";
import NavBar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

export default function InsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavBar />
      <main className="min-h-screen bg-slate-950 text-white">{children}</main>
      <Footer />
    </>
  );
}
