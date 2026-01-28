import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="app-footer">
      <span className="copyright">
        © Copyright 2025 Race Auto India – All Rights Reserved.
      </span>
      <nav className="links">
        <Link href="/terms" legacyBehavior>
          <a className="footer-link">Terms & Conditions</a>
        </Link>
        <span className="separator">•</span>
        <Link href="/privacy" legacyBehavior>
          <a className="footer-link">Privacy Policy</a>
        </Link>
        <span className="separator">•</span>
        <Link href="/contact" legacyBehavior>
          <a className="footer-link">
            Contact Us
          </a>
        </Link>
      </nav>

      <style jsx>{`
        .app-footer {
          margin-top: 1rem;
          padding: 1rem 0;
          border-top: 1px solid rgba(255,255,255,0.2);
          background: var(--bg);
          color: rgba(255,255,255,0.7);
          font-size: 0.875rem;

          /* Mobile-first: column layout */
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          text-align: center;
        }

        .links {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
        }

        .separator {
          color: rgba(255,255,255,0.5);
        }

        .footer-link {
          color: inherit;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          transition: color 200ms ease, transform 200ms ease;
        }
        .footer-link:hover {
          color: var(--accent);
          transform: translateY(-0.125rem);
        }
        .footer-icon {
          font-size: 1rem;
        }

        /* Tablet and up (>=640px) */
        @media (min-width: 40rem) {
          .app-footer {
            flex-direction: row;
            justify-content: center;
            text-align: left;
            gap: 1rem;
            padding: 1rem 2rem;
          }
          .links {
            gap: 0.75rem;
          }
        }

        /* Desktop and up (>=1024px) */
        @media (min-width: 64rem) {
          .app-footer {
            margin-top: 1.5rem;
            padding: 1.25rem 0;
            gap: 1rem;
          }
          .links {
            gap: 1rem;
          }
        }
      `}</style>
    </footer>
  );
}

