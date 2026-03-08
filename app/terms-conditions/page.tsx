"use client";

import React from "react";
import NavBar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Page() {
  return (
    <>
      <NavBar />

      <main className="min-h-screen bg-black text-white">
        <section className="mx-auto w-full max-w-screen-xl px-4 py-10 md:px-6 md:py-14">
          <div className="mx-auto max-w-3xl">
            <header className="border-b border-white/10 pb-6">
              <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
                TERMS OF USE
              </h1>
              <p className="mt-3 text-sm text-white/70">
                Effective Date:{" "}
                <span className="text-white/85">[DD Month YYYY]</span>
              </p>
            </header>

            {/* Intro */}
            <div className="mt-6 space-y-4 text-white/80 leading-relaxed">
              <p>
                Welcome to{" "}
                <span className="font-semibold text-white">RACE ANALYTICS</span>{" "}
                (the “Site”), a portal operated by{" "}
                <span className="font-semibold text-white">
                  RACE EDITORIALE LLP
                </span>{" "}
                (the “Company”, “we”, “us”, “our”). These Terms of Use (“Terms”)
                govern your access to and use of the Site and related services,
                content, reports, dashboards, charts, downloads, newsletters,
                and insights (collectively, the “Services”).
              </p>

              <p>
                By accessing or using the Site/Services, you confirm that you
                have read, understood, and agree to be bound by these Terms. If
                you do not agree, you must not access or use the Site/Services.
              </p>
            </div>

            {/* Acceptance */}
            <h2 className="mt-10 text-lg font-bold text-white md:text-xl">
              1) ACCEPTANCE, CHANGES & AVAILABILITY
            </h2>
            <div className="mt-3 space-y-3 text-white/80 leading-relaxed">
              <p>
                We may update these Terms from time to time by posting the
                revised Terms on the Site. Your continued use after changes are
                posted constitutes acceptance of the updated Terms.
              </p>
              <p>
                We may modify, suspend, or discontinue any part of the
                Site/Services at any time without prior notice.
              </p>
            </div>

            {/* Country variation + planning only */}
            <h2 className="mt-10 text-lg font-bold text-white md:text-xl">
              2) COUNTRY VARIATION & INFORMATIONAL PURPOSE ONLY
            </h2>
            <div className="mt-3 space-y-3 text-white/80 leading-relaxed">
              <p>
                Data coverage, vehicle categories, methodology, definitions,
                schedules, availability of reports, and feature access may vary
                by country/region. Some markets may have partial coverage or may
                be launched later.
              </p>
              <p>
                The information provided through the Site/Services is intended
                for{" "}
                <span className="font-semibold text-white">
                  planning and reference
                </span>{" "}
                purposes only. For real strategy execution and business
                decisions, you should consult qualified market experts and your
                internal advisory team.
              </p>
            </div>

            {/* No advice */}
            <h2 className="mt-10 text-lg font-bold text-white md:text-xl">
              3) NO PROFESSIONAL ADVICE
            </h2>
            <div className="mt-3 space-y-3 text-white/80 leading-relaxed">
              <p>
                The Site/Services do not provide legal, financial, investment,
                tax, or other professional advice. You are solely responsible
                for how you use the information and any decisions taken based on
                it.
              </p>
            </div>

            {/* License + copyright restrictions */}
            <h2 className="mt-10 text-lg font-bold text-white md:text-xl">
              4) PERMITTED USE, SHARING & COPYRIGHT
            </h2>
            <div className="mt-3 space-y-3 text-white/80 leading-relaxed">
              <p>
                Subject to these Terms, we grant you a limited, non-exclusive,
                non-transferable, revocable license to access and use the
                Site/Services for your personal or internal reference purposes.
              </p>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-white/85 font-semibold">You may:</p>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-white/75">
                  <li>
                    Read and view the content for reference and internal
                    planning.
                  </li>
                  <li>
                    Share limited excerpts or screenshots for discussion
                    purposes, only if such sharing does not violate your
                    subscription plan or any applicable license terms, and
                    includes proper attribution where required.
                  </li>
                </ul>

                <p className="mt-4 text-white/85 font-semibold">You may not:</p>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-white/75">
                  <li>
                    Reproduce, sell, resell, publish, distribute, sublicense, or
                    commercially exploit any content, dataset, report, chart,
                    design, or downloadable file from the Site/Services without
                    our prior written permission.
                  </li>
                  <li>
                    Use our content as your own product/service, or include it
                    in paid reports, client deliverables, or commercial
                    presentations without permission.
                  </li>
                  <li>
                    Remove copyright notices, watermarks, branding, source
                    labels, or access controls from any content.
                  </li>
                </ul>
              </div>

              <p>
                Unauthorized use may lead to infringement claims and/or
                termination of access. Some content may include third-party
                materials (logos, references, datasets, sources) that remain the
                property of their respective owners and may be subject to
                additional restrictions.
              </p>
            </div>

            {/* Prohibited conduct */}
            <h2 className="mt-10 text-lg font-bold text-white md:text-xl">
              5) PROHIBITED ACTIVITIES
            </h2>
            <div className="mt-3 text-white/80 leading-relaxed">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Scraping, crawling, or automated extraction of data/content.
                </li>
                <li>
                  Attempting to bypass paywalls, authentication, or access
                  controls.
                </li>
                <li>
                  Sharing login credentials or allowing multiple users to use
                  one account.
                </li>
                <li>
                  Reverse engineering, copying UI/UX, or cloning platform
                  functionality.
                </li>
                <li>
                  Uploading malware, interfering with service performance, or
                  abusing APIs.
                </li>
                <li>
                  Using the Site/Services for unlawful, defamatory, or harmful
                  purposes.
                </li>
              </ul>
            </div>

            {/* Accounts */}
            <h2 className="mt-10 text-lg font-bold text-white md:text-xl">
              6) REGISTRATION, ACCOUNT SECURITY & ACCESS
            </h2>
            <div className="mt-3 space-y-3 text-white/80 leading-relaxed">
              <p>
                You may be required to create an account. You are responsible
                for keeping your login credentials confidential and for all
                activities under your account.
              </p>
              <p>
                If we reasonably believe your account is being misused
                (including credential sharing or unusual access patterns), we
                may suspend or terminate access without notice.
              </p>
            </div>

            {/* Data accuracy */}
            <h2 className="mt-10 text-lg font-bold text-white md:text-xl">
              7) DATA SOURCES, ACCURACY & “AS IS” DISCLAIMER
            </h2>
            <div className="mt-3 space-y-3 text-white/80 leading-relaxed">
              <p>
                We use internal methods and may use external/public sources.
                Market data may include delays, revisions, estimation, or
                modeling assumptions. We do not guarantee completeness,
                accuracy, or fitness for a particular purpose.
              </p>
              <p>
                The Site/Services are provided on an{" "}
                <span className="font-semibold text-white">“AS IS”</span> and{" "}
                <span className="font-semibold text-white">“AS AVAILABLE”</span>{" "}
                basis.
              </p>
            </div>

            {/* Liability */}
            <h2 className="mt-10 text-lg font-bold text-white md:text-xl">
              8) LIMITATION OF LIABILITY
            </h2>
            <div className="mt-3 space-y-3 text-white/80 leading-relaxed">
              <p>
                To the maximum extent permitted by law, we will not be liable
                for any indirect, incidental, special, consequential, or
                punitive damages, or any loss of profits, revenue, data,
                business, goodwill, or opportunity arising from your use of (or
                inability to use) the Site/Services.
              </p>
              <p>
                You assume full responsibility for your decisions and outcomes
                based on the Site/Services.
              </p>
            </div>

            {/* Indemnity */}
            <h2 className="mt-10 text-lg font-bold text-white md:text-xl">
              9) INDEMNITY
            </h2>
            <div className="mt-3 space-y-3 text-white/80 leading-relaxed">
              <p>
                You agree to indemnify and hold harmless the Company and its
                affiliates, directors, employees, and partners from any claims,
                losses, liabilities, damages, and expenses arising out of your
                misuse of the Site/Services, violation of these Terms, or
                infringement of any rights of a third party.
              </p>
            </div>

            {/* Termination */}
            <h2 className="mt-10 text-lg font-bold text-white md:text-xl">
              10) TERMINATION
            </h2>
            <div className="mt-3 space-y-3 text-white/80 leading-relaxed">
              <p>
                We may suspend or terminate your access at any time if we
                believe you have violated these Terms or applicable laws. Upon
                termination, your license to use the Site/Services ends
                immediately.
              </p>
            </div>

            {/* Governing law */}
            <h2 className="mt-10 text-lg font-bold text-white md:text-xl">
              11) GOVERNING LAW & DISPUTE RESOLUTION
            </h2>
            <div className="mt-3 space-y-3 text-white/80 leading-relaxed">
              <p>
                These Terms are governed by the laws of India. Courts/tribunals
                having jurisdiction over{" "}
                <span className="font-semibold text-white">
                  Chennai, Tamil Nadu
                </span>{" "}
                shall have exclusive jurisdiction, unless otherwise required by
                applicable law.
              </p>
            </div>

            {/* Contact */}
            <h2 className="mt-10 text-lg font-bold text-white md:text-xl">
              12) CONTACT
            </h2>
            <div className="mt-3 space-y-3 text-white/80 leading-relaxed">
              <p>For questions about these Terms, please contact:</p>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/80">
                <p className="font-semibold text-white">RACE EDITORIALE LLP</p>
                <p>
                  Email:{" "}
                  <span className="text-white/90">
                    [support@yourdomain.com]
                  </span>
                </p>
                <p>
                  Address: <span className="text-white/90">[Your Address]</span>
                </p>
              </div>
            </div>

            <div className="mt-12 border-t border-white/10 pt-6 text-sm text-white/60">
              <p>
                Note: This Terms of Use draft is intended to reflect your
                product disclaimers and platform usage rules. Please review with
                your legal counsel before publishing.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
