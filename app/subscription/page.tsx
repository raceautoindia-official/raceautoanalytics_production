import type { Metadata } from "next";
import SubscriptionModal from "@/components/subscription/SubscriptionModal";
import NavBar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

export const metadata: Metadata = {
  title: "Subscription Plans - RaceAutoAnalytics",
  description: "Choose a RaceAutoAnalytics subscription plan.",
};

export default function SubscriptionPage() {
  return (
    <>
      <NavBar />
      <SubscriptionModal mode="page" />
      <Footer />
    </>
  );
}
