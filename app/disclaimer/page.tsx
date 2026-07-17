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
                DISCLAIMER
              </h1>
            </header>

            {/* Intro */}
            <div className="mt-6 space-y-4 text-white/80 leading-relaxed">
              <p>
                The reports, data, forecasts, dashboards, charts, and insights
                made available through{" "}
                <span className="font-semibold text-white">
                  Race Auto Analytics
                </span>{" "}
                (the “Platform”), operated by{" "}
                <span className="font-semibold text-white">
                  RACE EDITORIALE LLP
                </span>{" "}
                (the “Company”, “we”, “us”, “our”), have been prepared using
                information, data, estimates, and insights obtained from sources
                believed to be reliable and credible.
              </p>
              <p>
                Every reasonable effort has been made to verify the accuracy of
                the information presented and to ensure that the analysis
                reflects relevant market conditions, policy developments, and
                industry trends as accurately as possible at the time of
                release. However, due to the dynamic nature of the industry and
                the possibility of reporting delays, revisions, or human error,
                the Company does not guarantee that all information contained in
                its reports is entirely free from inaccuracies or omissions.
              </p>
            </div>

            {/* Informational purpose */}
            <h2 className="mt-10 text-lg font-bold text-white md:text-xl">
              1) INFORMATIONAL PURPOSE ONLY
            </h2>
            <div className="mt-3 space-y-3 text-white/80 leading-relaxed">
              <p>
                This Platform and its content are intended solely for
                informational, research, and reference purposes. The content,
                including market data, forecasts, opinions, interpretations, and
                analysis, should not be construed as financial, legal,
                investment, or business advice.
              </p>
              <p>
                Readers and users are advised to exercise their own judgment and
                undertake independent verification before making any strategic,
                commercial, financial, or operational decisions based on the
                information provided.
              </p>
            </div>

            {/* Liability */}
            <h2 className="mt-10 text-lg font-bold text-white md:text-xl">
              2) LIMITATION OF LIABILITY
            </h2>
            <div className="mt-3 space-y-3 text-white/80 leading-relaxed">
              <p>
                RACE EDITORIALE LLP shall not be held liable for any direct,
                indirect, incidental, or consequential loss, damage, cost, or
                outcome arising from the use of, reliance on, or interpretation
                of the information contained in its reports or on this Platform.
              </p>
              <p>
                Any action taken based on this content is strictly at the
                reader’s own risk and responsibility.
              </p>
            </div>

            {/* IP & copyright */}
            <h2 className="mt-10 text-lg font-bold text-white md:text-xl">
              3) INTELLECTUAL PROPERTY & COPYRIGHT
            </h2>
            <div className="mt-3 space-y-3 text-white/80 leading-relaxed">
              <p>
                All content on this Platform, including text, data presentation,
                analysis, charts, graphics, and images, is protected by
                copyright and intellectual property laws.
              </p>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/80">
                <p>
                  © RACE EDITORIALE LLP 2026. All rights reserved. No part of
                  this Platform or its reports may be reproduced, stored,
                  distributed, transmitted, republished, or used in any form or
                  by any means without prior written permission from RACE
                  EDITORIALE LLP. Permission shall be considered valid only when
                  expressly granted in writing.
                </p>
              </div>
              <p>
                Unless otherwise agreed in writing, RACE EDITORIALE LLP retains
                all rights to the content, editorial material, design elements,
                and visual assets included in its reports and on this Platform.
              </p>
            </div>

            {/* Errors & corrections */}
            <h2 className="mt-10 text-lg font-bold text-white md:text-xl">
              4) ERRORS & CORRECTIONS
            </h2>
            <div className="mt-3 space-y-3 text-white/80 leading-relaxed">
              <p>
                While every effort has been made to ensure the accuracy,
                reliability, and completeness of the information presented, RACE
                EDITORIALE LLP acknowledges that inadvertent errors or omissions
                may occur. If any stakeholder identifies discrepancies related
                to data, facts, or analysis, we welcome the opportunity to
                review and address such concerns promptly. Please contact us
                with supporting details, and we will investigate and take
                appropriate corrective action where necessary.
              </p>
            </div>

            {/* Contact */}
            <h2 className="mt-10 text-lg font-bold text-white md:text-xl">
              5) CONTACT
            </h2>
            <div className="mt-3 space-y-3 text-white/80 leading-relaxed">
              <p>
                For any discrepancies, permission requests, or questions
                regarding this disclaimer, please contact:
              </p>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/80">
                <p className="font-semibold text-white">RACE EDITORIALE LLP</p>
                <p>
                  Email:{" "}
                  <span className="text-white/90">info@raceautoanalytics.com</span>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
