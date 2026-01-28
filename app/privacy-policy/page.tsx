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
      {/* HEADER */}
     <NavBar />

      {/* PAGE CONTENT (Tailwind container-style wrapper) */}
      <main className="mx-auto w-full max-w-screen-xl bg-white px-4 py-8 md:px-6 md:py-10">
        <section className="mx-auto w-full max-w-3xl">
          <h1 className="mb-3 text-xl font-bold md:text-2xl">PRIVACY POLICY</h1>

          <p>
            This privacy policy (&quot;Policy&quot;) explains our policy regarding the
            collection, use, disclosure and transfer of your information by{" "}
            <strong>RACE ANALYTICS</strong> and/or its subsidiaries operates various
            websites, including sub-sites, platforms, applications, m-web platforms
            and other platforms (collectively referred to as &quot;Sites&quot;) for
            delivery of information, products, offerings and content via any mobile
            or internet connected device or otherwise (collectively the
            &quot;Services&quot;).
          </p>

          <h2 className="mt-6 text-lg font-semibold">
            Collection of user Personal Information
          </h2>
          <p className="mt-2">
            <strong>RACE ANALYTICS</strong> collects information i.e., email
            address, name, home/ work address and contact number.{" "}
            <strong>RACE ANALYTICS</strong> also collects anonymous demographic
            information, such as your ZIP code, age, gender, preferences, interests
            and favourites.
          </p>
          <p className="mt-2">
            Also, information about your computer hardware and software that is
            automatically collected include: your IP address, browser type, domain
            names, access times and referring website addresses. This information is
            used by <strong>RACE ANALYTICS</strong> for the operation of the service,
            to maintain quality of the service, and to provide general statistics
            regarding use of the <strong>RACE ANALYTICS</strong> site.
          </p>
          <p className="mt-2">
            Please bear in mind that if you directly disclose personally
            identifiable information or personally sensitive data through{" "}
            <strong>RACE ANALYTICS</strong> public message boards, this information
            may be collected and used by others.
          </p>
          <p className="mt-2">
            Note: <strong>RACE ANALYTICS</strong> does not read any of your private
            online communications.
          </p>
          <p className="mt-2">
            <strong>RACE ANALYTICS</strong> encourages you to review the privacy
            statements of Web sites you choose to link to from{" "}
            <strong>RACE ANALYTICS</strong> so that you can understand how those Web
            sites collect, use and share your information.{" "}
            <strong>RACE ANALYTICS</strong> is not responsible for the privacy
            statements or other content on Web sites outside of the{" "}
            <strong>RACE ANALYTICS</strong> and <strong>RACE ANALYTICS</strong>{" "}
            family of Web sites.
          </p>

          <h2 className="mt-6 text-lg font-semibold">
            Use of your Personal Information
          </h2>
          <p className="mt-2">
            <strong>RACE ANALYTICS</strong> collects and uses your personal
            information to operate the <strong>RACE ANALYTICS</strong> Web site and
            deliver the services you have requested. <strong>RACE ANALYTICS</strong>{" "}
            also uses your personally identifiable information to inform you of other
            products or services available from <strong>RACE ANALYTICS</strong> and
            its affiliates. <strong>RACE ANALYTICS</strong> may also contact you via
            surveys to conduct research about your opinion of current services or of
            potential new services that may be offered.
          </p>
          <p className="mt-2">
            <strong>RACE ANALYTICS</strong> does not sell, rent or lease its customer
            lists to third parties. <strong>RACE ANALYTICS</strong> may, from time to
            time, contact you on behalf of external business partners about a
            particular offering that may be of interest to you. In those cases, your
            unique personally identifiable information (e-mail, name, address,
            telephone number) is not transferred to the third party. In addition,{" "}
            <strong>RACE ANALYTICS</strong> may share data with trusted partners to
            help us perform statistical analysis, send you email or postal mail,
            provide customer support, or arrange for deliveries. All such third
            parties are prohibited from using your personal information except to
            provide these services to <strong>RACE ANALYTICS</strong>, and they are
            required to maintain the confidentiality of your information.
          </p>
          <p className="mt-2">
            <strong>RACE ANALYTICS</strong> does not use or disclose sensitive
            personal information, such as race, religion, or political affiliations,
            without your explicit consent.
          </p>
          <p className="mt-2">
            <strong>RACE ANALYTICS</strong> keeps track of the Web sites and pages
            our customers visit within <strong>RACE ANALYTICS</strong>, in order to
            determine what <strong>RACE ANALYTICS</strong> services are the most
            popular. This data is used to deliver customized content and advertising
            within <strong>RACE ANALYTICS</strong> to customers whose behaviour
            indicates that they are interested in a particular subject area.
          </p>
          <p className="mt-2">
            <strong>RACE ANALYTICS</strong> Web sites will disclose your personal
            information, without notice, only if required to do so by law or in the
            good faith belief that such action is necessary to: (a) conform to the
            edicts of the law or comply with legal process served on{" "}
            <strong>RACE ANALYTICS</strong> or the site; (b) protect and defend the
            rights or property of <strong>RACE ANALYTICS</strong>; and, (c) act under
            exigent circumstances to protect the personal safety of users of{" "}
            <strong>RACE ANALYTICS</strong>, or the public.
          </p>

          <h2 className="mt-6 text-lg font-semibold">Use of Cookies</h2>
          <p className="mt-2">
            The <strong>RACE ANALYTICS</strong> Web site use &quot;cookies&quot; to
            help you personalize your online experience. A cookie is a text file that
            is placed on your hard disk by a Web page server. Cookies cannot be used
            to run programs or deliver viruses to your computer. Cookies are uniquely
            assigned to you, and can only be read by a web server in the domain that
            issued the cookie to you.
          </p>
          <p className="mt-2">
            One of the primary purposes of cookies is to provide a convenience
            feature to save you time. The purpose of a cookie is to tell the Web
            server that you have returned to a specific page. For example, if you
            personalize <strong>RACE ANALYTICS</strong> pages, or register with{" "}
            <strong>RACE ANALYTICS</strong> site or services, a cookie helps{" "}
            <strong>RACE ANALYTICS</strong> to recall your specific information on
            subsequent visits. This simplifies the process of recording your personal
            information, such as billing addresses, shipping addresses, and so on.
            When you return to the same <strong>RACE ANALYTICS</strong> Web site, the
            information you previously provided can be retrieved, so you can easily
            use the <strong>RACE ANALYTICS</strong> features that you customized.
          </p>
          <p className="mt-2">
            You have the ability to accept or decline cookies. Most Web browsers
            automatically accept cookies, but you can usually modify your browser
            setting to decline cookies if you prefer. If you choose to decline
            cookies, you may not be able to fully experience the interactive features
            of the <strong>RACE ANALYTICS</strong> services or Web sites you visit.
          </p>

          <h2 className="mt-6 text-lg font-semibold">
            Security of your Personal Information
          </h2>
          <p className="mt-2">
            <strong>RACE ANALYTICS</strong> secures your personal information from
            unauthorized access, use or disclosure. <strong>RACE ANALYTICS</strong>{" "}
            secures the personally identifiable information you provide on computer
            servers in a controlled, secure environment, protected from unauthorized
            access, use or disclosure. When personal information (such as a credit
            card number) is transmitted to other Web sites, it is protected through
            the use of encryption, such as the Secure Socket Layer (SSL) protocol.
          </p>

          <h2 className="mt-6 text-lg font-semibold">Changes to this Statement</h2>
          <p className="mt-2">
            <strong>RACE ANALYTICS</strong> will occasionally update this Statement of
            Privacy to reflect company and customer feedback.{" "}
            <strong>RACE ANALYTICS</strong> encourages you to periodically review this
            Statement to be informed of how <strong>RACE ANALYTICS</strong> is
            protecting your information.
          </p>

          <h2 className="mt-6 text-lg font-semibold">Contact Information</h2>
          <p className="mt-2">
            <strong>RACE ANALYTICS</strong> welcomes your comments regarding this
            Statement of Privacy. If you believe that <strong>RACE ANALYTICS</strong>{" "}
            has not adhered to this Statement, please contact{" "}
            <strong>RACE ANALYTICS</strong> at{" "}
            <a href="mailto:info@raceinnovations.in">info@raceinnovations.in</a>. We
            will use commercially reasonable efforts to promptly determine and
            remedy the problem.
          </p>
        </section>
      </main>

      <Footer />
    </>
  );
}
