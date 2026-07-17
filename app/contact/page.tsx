import type { Metadata } from "next";
import NavBar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Mail, Phone, MapPin } from "lucide-react";
import { SITE_URL } from "@/lib/seoRoutes";
import ContactForm from "./ContactForm";

const TITLE = "Contact | Race Auto Analytics";
const DESCRIPTION =
  "Get in touch with Race Auto Analytics for subscriptions, sample reports, data questions or partnerships. Automotive market intelligence for OEM, dealer and mobility teams.";

const EMAIL = "info@raceautoanalytics.com";
const PHONE = "+91 8072098352";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/contact" },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/contact`,
    type: "website",
    siteName: "RACE Auto Analytics",
  },
};

export default function ContactPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: TITLE,
    url: `${SITE_URL}/contact`,
    mainEntity: {
      "@type": "Organization",
      name: "Race Auto Analytics",
      email: EMAIL,
      telephone: PHONE,
      url: SITE_URL,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Chennai",
        addressRegion: "Tamil Nadu",
        addressCountry: "IN",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NavBar />
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="border-b border-white/10">
          <div className="mx-auto w-[95vw] max-w-none px-2 pt-14 pb-8 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/80">
              Contact
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight md:text-4xl">
              Talk to the Race Auto Analytics team
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 md:text-base">
              Subscriptions, sample reports, data questions, custom coverage or
              partnerships — send us a note and we&apos;ll get back to you.
            </p>
          </div>
        </section>

        <section className="pb-20 pt-10">
          <div className="mx-auto grid w-[95vw] max-w-none grid-cols-1 gap-8 px-2 sm:px-3 lg:grid-cols-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw]">
            {/* Details */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6">
                <h2 className="text-lg font-bold tracking-tight">Reach us</h2>
                <ul className="mt-5 space-y-4 text-sm text-white/75">
                  <li className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 text-blue-300" />
                    <a href={`mailto:${EMAIL}`} className="hover:text-white">
                      {EMAIL}
                    </a>
                  </li>
                  <li className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 text-blue-300" />
                    <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="hover:text-white">
                      {PHONE}
                    </a>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-blue-300" />
                    <span>Chennai, Tamil Nadu, India</span>
                  </li>
                </ul>
                <div className="mt-6 border-t border-white/10 pt-5 text-xs leading-6 text-white/45">
                  <p>Operated by Race Innovations Pvt Ltd.</p>
                  <p>GST 33AAFCR6885E1Z6</p>
                  <p>CIN U73100TN2011PTC083486</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-white/10 bg-[#0b141f]/70 p-6 md:p-8">
                <ContactForm />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
