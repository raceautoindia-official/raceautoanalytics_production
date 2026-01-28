"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { LogIn, Zap } from "lucide-react";
import Footer from "../components/Footer";
import NavBar from "../components/Navbar";

/* ---------- CTA buttons ---------- */
function GlowButton({
  href,
  children,
}: React.PropsWithChildren<{ href: string }>) {
  return (
    <Link
      href={href}
      className="group relative inline-flex h-11 items-center rounded-2xl bg-[#0B1324] px-5 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:ring-blue-400/60"
    >
      <span className="pointer-events-none absolute -inset-3 -z-10 rounded-3xl bg-blue-600/30 opacity-0 blur-2xl transition group-hover:opacity-100" />
      <Zap className="mr-2 h-4 w-4" />
      {children}
    </Link>
  );
}

function YellowButton({
  href,
  children,
}: React.PropsWithChildren<{ href: string }>) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center rounded-2xl bg-gradient-to-b from-yellow-400 to-amber-500 px-5 text-sm font-semibold text-black shadow-[0_12px_28px_rgba(245,158,11,.35)] transition hover:from-yellow-300 hover:to-amber-400"
    >
      {children}
    </Link>
  );
}

function DarkButton({
  href,
  children,
}: React.PropsWithChildren<{ href: string }>) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center rounded-2xl bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
    >
      {children}
    </Link>
  );
}

/* ---------- sticky header that measures its own height ---------- */
function StickyLikeHeader({ children }: React.PropsWithChildren) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [h, setH] = React.useState(0);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setH(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <>
      <div style={{ height: h }} aria-hidden />
      <div
        ref={ref}
        className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-gradient-to-b from-[#050B17] to-[#070D1C]"
      >
        {children}
      </div>
    </>
  );
}

export default function Page() {
  return (
    <>
      {/* HEADER (matches your screenshot) */}
    <NavBar />

      {/* PAGE CONTENT (same container look as your privacy page) */}
      <main className="mx-auto w-full max-w-screen-xl bg-white px-4 py-8 md:px-6 md:py-10">
        <section className="mx-auto w-full max-w-3xl">
          <h1 className="text-xl font-bold md:text-2xl">TERMS OF USE</h1>

          <p className="mt-3">
            Welcome to <strong>RACE ANALYTICS</strong> (the &quot;Site&quot;), a
            portal operated by <strong>RACE EDITORIALE LLP</strong> (hereinafter
            referred to as the &quot;Company&quot;).
          </p>

          <h2 className="mt-6 text-lg font-semibold">ACCEPTANCE OF TERMS OF USE</h2>
          <p className="mt-2">
            Please read the following terms and conditions as these terms of use
            (&quot;Terms&quot;) constitute a legally binding agreement between you
            and the Company regarding your use of the Site and/or the services
            provided by the Company which include but not limited to aggregation of
            important news, newsletters, analysis focusing on IT industry or
            availability of various types of content through the Site or any mobile
            or internet connected device or otherwise (the “Services”).
          </p>
          <p className="mt-2">
            You also represent that you are an individual and not a corporation.
          </p>
          <p className="mt-2">
            The Company reserves the right, at its discretion, to change, modify,
            add, or remove portions of these Terms at any time by posting the
            amended Terms. Please check these Terms periodically for changes. Your
            continued use of the Site or Services after the posting of changes
            constitutes your binding acceptance of such changes. In addition, when
            using any services, you may be subject to any posted guidelines, rules,
            product requirements or sometimes additional terms applicable to such
            services. All such guidelines, rules, product requirements or sometimes
            additional terms are hereby incorporated by reference into the Terms.
          </p>
          <p className="mt-2">
            Further, Company reserves the right to suspend / cancel, or discontinue
            any or all channels, products or service at any time without notice,
            make modifications and alterations in any or all of the content,
            products and services contained on the Site without prior notice.
          </p>
          <p className="mt-2">
            YOUR ACCESS OR USE OF THE SITE OR SERVICE SHALL MEAN THAT YOU HAVE READ,
            UNDERSTAND AND AGREE TO BE BOUND BY THE TERMS. By accessing or using any
            Website or Services you also represent that you have the legal authority
            as per applicable law (including but not limited to age requirement) to
            accept the Terms on behalf of yourself and/or any other person you
            represent in connection with your use of the Site or Services. If you do
            not agree to the Terms, you are not authorized to use the Site or
            Services.
          </p>

          <h2 className="mt-6 text-lg font-semibold">
            THE SERVICE: REGISTRATION AND ACCESS TO USE
          </h2>

          <h3 className="mt-4 font-semibold">Registration</h3>
          <p className="mt-2">
            To register for the Services, you may be required to open an account by
            completing the registration process (i.e. by providing us with current,
            complete and accurate information as prompted by the applicable
            registration form). You will also choose a password and a user name. You
            are entirely responsible for maintaining the confidentiality of your
            password and account. In particular, as a parent or legal guardian, you
            acknowledge and assume sole responsibility to ensure that content which
            is meant for mature audiences (i.e, above the age of majority) is not
            accessed by children. Hence, you may not share your log in credentials
            with your children. You expressly agree to absolve the Company of any
            responsibility / liability in this regard.
          </p>
          <p className="mt-2">
            TIL shall retain your registration information after cancellation or
            withdrawal of your registration (if applicable) as required under
            applicable law(s).
          </p>

          <h3 className="mt-4 font-semibold">Facebook Connect</h3>
          <p className="mt-2">
            You may also register for the Services by using your Facebook username
            and password. If, however, you are under 18 years of age, you may log in
            to the Services using Facebook Connect and utilize the Services only
            under the supervision of your parent or legal guardian. Using Facebook
            Connect allows us to personalize and enhance your experience while using
            the Services, based on your personal information, profile, likes, and
            other relevant information. When you use this feature, you expressly
            consent to information about your activity on the Services (i.e. what
            you have read, what you have liked, ratings given by you, etc.) being
            continuously released and automatically posted on your Facebook account
            (which has been used to log in) and made available to your friends on
            Facebook. You may control the information being shared through Facebook
            Connect by changing your account / privacy settings. You shall be solely
            responsible for using this feature and any related compliances including
            with the terms of your Facebook account. By registering through
            Facebook, you agree to the Terms stated herein and in addition to any
            other specific terms which shall be posted at an appropriate location of
            the Site. Each registration is for a single individual user only.
          </p>

          <h3 className="mt-4 font-semibold">Subscription</h3>
          <p className="mt-2">
            Your subscription to the Services in a particular geographical territory
            shall be valid for that territory only and shall not automatically
            entitle you to access your account from a different geographical
            territory, unless specifically permitted by the Company.
          </p>

          <h3 className="mt-4 font-semibold">Geographic Limitation</h3>
          <p className="mt-2">
            The Site and/or the Services are controlled and offered by Company from
            its facilities in the territory of India. Company makes no
            representations that the Site or Services are appropriate or available
            for use in other locations. If you are accessing or using the Site or
            Services from other jurisdictions, you do so at your own risk and you
            are responsible for compliance with local law. Notwithstanding the
            foregoing, the Site or Services may contain or provide links to content
            hosted on website located outside of India.
          </p>

          <h3 className="mt-4 font-semibold">Access to Use</h3>
          <p className="mt-2">
            To access the Services, you will be asked to enter your individual user
            name and password, as chosen by you during your registration. Therefore,
            the Company does not permit any of the following:
          </p>
          <ul className="mt-2 list-disc pl-6">
            <li>Any other person sharing your account and Password.</li>
            <li>
              Any part of the Site being cached in proxy servers and accessed by
              individuals who have not registered with the Company as users of the
              Site; or
            </li>
            <li>
              Access through a single account and Password being made available to
              multiple users on a network.
            </li>
          </ul>
          <p className="mt-2">
            If the Company reasonably believes that an account and password is being
            used / misused in any manner, the Company shall reserve the right to
            cancel access rights immediately without notice, and block access to all
            users from that IP address. Company reserves the right to reject any
            username selected by you and/or revoke your right to any previously
            selected user name and give such user name to any other person or entity
            in Company&apos;s sole discretion and without any liability to you.
            Furthermore, you shall be entirely responsible for any and all
            activities that occur under your account. You agree to notify the
            Company immediately of any unauthorized use of your account or any other
            breach of security. The Company will not be liable for any loss that you
            may incur as a result of someone else using your password or account,
            however, you could be held liable for losses incurred by the Company or
            another party due to someone else using your account or password. If
            messages sent to an email address provided by you and associated with
            your account are returned as undeliverable or wrong address; Company
            reserves the right to terminate your account immediately with or without
            notice to you and without any liability to you or any third party.
          </p>

          <h3 className="mt-4 font-semibold">Availability</h3>
          <p className="mt-2">
            The availability of content through the Services may change from time to
            time. You are responsible for all Internet access charges. Please check
            with your Internet provider for information on possible Internet data
            usage charges.
          </p>
        </section>
      </main>

      <Footer />
    </>
  );
}
