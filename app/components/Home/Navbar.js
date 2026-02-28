"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Search, Menu, X, ChevronDown } from "lucide-react";
import LoginNavButton from "@/app/flash-reports/components/Login/LoginAuthButton";

const Navbar = () => {
  const [tabNewsDropdown, setTabNewsDropdown] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [newsDropdown, setNewsDropdown] = useState(false);

  const linkMap = {
    NEWS: "https://raceautoindia.com/",
    "FLASH REPORT": "/flash-reports",
    "FORECAST": "/forecast",
    MAGAZINE: "https://raceautoindia.com/magazine",
    "CONTACT US": "https://raceautoindia.com/page/contact",
  };

  return (
    <>
      {/* Desktop Navbar */}
      <div className="desk-nav">
        <nav
          className="navbar navbar-expand-lg navbar-dark"
          style={{ background: "#363434" }}
        >
          <div>
            <Image
              src="/images/race analytics new logo white.png"
              alt="Race Auto India"
              width={160}
              height={60}
            />
          </div>
          <div className="container-fluid">
            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav ms-5">
                <li className="nav-item position-relative">
                  <Link
                    className="nav-link fw-bold text-white"
                    href={linkMap["NEWS"]}
                  >
                    NEWS
                  </Link>
                </li>
                {["MAGAZINE", "CONTACT US"].map((item) => (
                  <li className="nav-item mx-4" key={item}>
                    <Link
                      className="nav-link fw-bold text-white"
                      href={linkMap[item]}
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Subscribe + Flash Report + Login */}
            <div
              className="position-relative d-flex align-items-center justify-content-end gap-3"
              style={{ minWidth: "150px" }}
            >
              <Link href={linkMap["FLASH REPORT"]}>
                <button
                  className="btn fw-bold text-white flash-thunder-btn"
                  style={{
                    borderRadius: "8px",
                    padding: "6px 14px",
                    fontSize: "0.9rem",
                    border: "none",
                  }}
                >
                  ⚡ Flash Report
                </button>
              </Link>
<Link href={linkMap["FORECAST"]}>
  <button
    className="btn fw-bold text-white forecast-thunder-btn"
    style={{
      borderRadius: "8px",
      padding: "6px 14px",
      fontSize: "0.9rem",
      border: "none",
    }}
  >
    📈 Forecast
  </button>
</Link>
              <Link href="https://raceautoindia.com/subscription">
                <button
                  className="btn btn-warning fw-bold text-dark"
                  style={{
                    borderRadius: "8px",
                    padding: "6px 14px",
                    fontSize: "0.9rem",
                  }}
                >
                  Subscribe
                </button>
              </Link>

              <LoginNavButton />
            </div>
          </div>
        </nav>

        <div className="container-fluid bg-light">
          <div className="d-flex align-items-center justify-content-between"></div>
        </div>
      </div>

      {/* Mobile Navbar */}
      <div className="mobile-nav" style={{ background: "black" }}>
        <nav
          className="navbar navbar-expand-lg navbar-dark"
          style={{ background: "#363434" }}
        >
          <div className="container-fluid">
            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav">
                <li className="nav-item">
                  <Link
                    className="nav-link fw-bold text-white"
                    href={linkMap["NEWS"]}
                  >
                    NEWS
                  </Link>
                </li>
                {["FLASH REPORT", "FORECAST", "MAGAZINE", "CONTACT US"].map((item) => (
                  <li
                    className={`nav-item ${
                      item === "FLASH REPORT" ? "flash-report" : ""
                    }`}
                    key={item}
                  >
                    <Link
                      className="nav-link fw-bold text-white mx-5"
                      href={linkMap[item]}
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
        <div className="container-fluid bg-dark">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <Image
                src="/images/race analytics new logo white.png"
                alt="Logo"
                width={170}
                height={60}
              />
            </div>
            <div
              className="position-relative w-50 w-md-75 w-lg-50"
              style={{ maxWidth: "350px", minWidth: "100px" }}
            ></div>
          </div>
        </div>
        <div
          className="d-lg-none position-fixed w-100 d-flex justify-content-around align-items-center"
          style={{
            bottom: "0",
            left: "0",
            right: "0",
            backgroundColor: "#363434",
            color: "white",
            padding: "20px 0",
            textAlign: "center",
            zIndex: "1050",
          }}
        >
          <Link href="https://raceautoindia.com/subscription">
            <Image
              src="/images/crown.png"
              alt="Crown Icon"
              width={40}
              height={40}
            />
          </Link>
          <Link href="https://raceautoindia.com/page/contact">
            <Image
              src="/images/question.png"
              alt="Help Icon"
              width={40}
              height={40}
            />
          </Link>
          <Link href="https://raceautoindia.com/">
            <Image
              src="/images/race-logo.png"
              alt="Race Icon"
              width={40}
              height={40}
            />
          </Link>

          <button
            className="navbar-toggler text-white border-0"
            type="button"
            onClick={() => setIsOpen(true)}
            style={{ background: "transparent" }}
          >
            <Menu size={40} />
          </button>
        </div>
        <div
          className={`mobile-menu ${isOpen ? "open" : ""}`}
          style={{
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            backgroundColor: "white",
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
            transition: "transform 0.3s ease-in-out",
            padding: "20px",
            zIndex: "1100",
            transform: isOpen ? "translateY(0)" : "translateY(-100%)",
          }}
        >
          <button
            onClick={() => setIsOpen(false)}
            className="position-absolute"
            style={{
              top: "10px",
              right: "15px",
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
            }}
          >
            <X size={30} />
          </button>
          <ul className="list-unstyled mb-0 mt-4">
            <li className="py-2 border-bottom">
              <div
                className="d-flex justify-content-between align-items-center text-dark fw-bold"
                style={{ cursor: "pointer" }}
                onClick={() => setNewsDropdown(!newsDropdown)}
              >
                News
              </div>
            </li>
            {["FLASH REPORT", "FORECAST", "MAGAZINE", "CONTACT US"].map((item) => (
              <li
                className={`py-2 border-bottom ${
                  item === "FLASH REPORT" ? "flash-report" : ""
                }`}
                key={item}
              >
                <Link
                  href={linkMap[item]}
                  className="text-dark fw-bold"
                  style={{ textDecoration: "none" }}
                >
                  {item}
                </Link>
              </li>
            ))}
            <li>
              {" "}
              <LoginNavButton />
            </li>
          </ul>
        </div>
      </div>

      {/* Tablet Navbar */}
      <div className="tab-nav">
        <nav
          className="navbar navbar-expand-lg navbar-dark"
          style={{ background: "#363434" }}
        >
          <div className="container-fluid">
            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav">
                <li
                  className="nav-item dropdown"
                  style={{ position: "relative" }}
                  onMouseEnter={() => setTabNewsDropdown(true)}
                  onMouseLeave={() => setTabNewsDropdown(false)}
                >
                  <Link
                    className="nav-link fw-bold text-white"
                    href={linkMap["NEWS"]}
                  >
                    NEWS
                  </Link>
                </li>
                {["FLASH REPORT", "FORECAST", "MAGAZINE", "CONTACT US"].map((item) => (
                  <li
                    className={`nav-item ${
                      item === "FLASH REPORT" ? "flash-report" : ""
                    }`}
                    key={item}
                  >
                    <Link
                      className="nav-link fw-bold text-white mx-5"
                      href={linkMap[item]}
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
        <div className="container-fluid bg-dark">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <Image
                src="/images/race analytics new logo white.png"
                alt="Logo"
                width={170}
                height={60}
              />
            </div>
            <div
              className="position-relative w-50 w-md-75 w-lg-50"
              style={{ maxWidth: "350px", minWidth: "100px" }}
            ></div>
          </div>
        </div>
        <div
          className="d-lg-none position-fixed w-100 d-flex justify-content-around align-items-center"
          style={{
            bottom: "0",
            left: "0",
            right: "0",
            backgroundColor: "#363434",
            color: "white",
            padding: "20px 0",
            textAlign: "center",
            zIndex: "1050",
          }}
        >
          <Link href="https://raceautoindia.com/subscription">
            <Image
              src="/images/crown.png"
              alt="Crown Icon"
              width={40}
              height={40}
            />
          </Link>
          <Link href="https://raceautoindia.com/page/contact">
            <Image
              src="/images/question.png"
              alt="Help Icon"
              width={40}
              height={40}
            />
          </Link>
          <Link href="https://raceautoindia.com/">
            <Image
              src="/images/race-logo.png"
              alt="Race Icon"
              width={40}
              height={40}
            />
          </Link>

          <button
            className="navbar-toggler text-white border-0"
            type="button"
            onClick={() => setIsOpen(true)}
            style={{ background: "transparent" }}
          >
            <Menu size={40} />
          </button>
        </div>
        <div
          className={`mobile-menu ${isOpen ? "open" : ""}`}
          style={{
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            backgroundColor: "white",
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
            transition: "transform 0.3s ease-in-out",
            padding: "20px",
            zIndex: "1100",
            transform: isOpen ? "translateY(0)" : "translateY(-100%)",
          }}
        >
          <button
            onClick={() => setIsOpen(false)}
            className="position-absolute"
            style={{
              top: "10px",
              right: "15px",
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
            }}
          >
            <X size={30} />
          </button>
          <ul className="list-unstyled mb-0 mt-4">
            <li className="py-2 border-bottom">
              <div
                className="d-flex justify-content-between align-items-center text-dark fw-bold"
                style={{ cursor: "pointer" }}
                onClick={() => setNewsDropdown(!newsDropdown)}
              >
                News
              </div>
            </li>
            {["FLASH REPORT", "FORECAST", "MAGAZINE", "CONTACT US"].map((item) => (
              <li
                className={`py-2 border-bottom ${
                  item === "FLASH REPORT" ? "flash-report" : ""
                }`}
                key={item}
              >
                <Link
                  href={linkMap[item]}
                  className="text-dark fw-bold"
                  style={{ textDecoration: "none" }}
                >
                  {item}
                </Link>
              </li>
            ))}
            <li>
              <LoginNavButton />
            </li>
          </ul>
        </div>
      </div>

      {/* Media Queries */}
      <style>
        {`
          .rotate-180 {
            transform: rotate(180deg);
            transition: transform 0.3s ease;
          }

          @media (max-width: 767px) {
            .desk-nav { display: none !important; }
            .tab-nav { display: none !important; }
            .mobile-nav { display: block !important; }
          }

          @media (min-width: 768px) and (max-width: 1024px) {
            .desk-nav { display: none !important; }
            .mobile-nav { display: none !important; }
            .tab-nav { display: block !important; }
          }

          @media (min-width: 1025px) {
            .mobile-nav { display: none !important; }
            .tab-nav { display: none !important; }
            .desk-nav { display: block !important; }
          }
           .flash-thunder-btn {
    background: linear-gradient(135deg, #0d1b2a, #1b263b); /* night blue gradient */
    box-shadow: 0 0 8px rgba(0, 123, 255, 0.4); /* subtle blue glow */
    animation: flashThunder 3s infinite ease-in-out;
    transition: transform 0.5s;
  }

  .flash-thunder-btn:hover {
    transform: scale(1.05);
  }

  .forecast-thunder-btn {
  background: linear-gradient(135deg, #061a2b, #0b2a4a); /* deeper blue */
  box-shadow: 0 0 8px rgba(34, 211, 238, 0.35); /* cyan glow */
  animation: forecastThunder 3s infinite ease-in-out;
  transition: transform 0.5s;
}

.forecast-thunder-btn:hover {
  transform: scale(1.05);
}

@keyframes forecastThunder {
  0%   { box-shadow: 0 0 4px rgba(34, 211, 238, 0.25); }
  25%  { box-shadow: 0 0 16px rgba(56, 189, 248, 0.55); }
  50%  { box-shadow: 0 0 6px rgba(34, 211, 238, 0.18); }
  75%  { box-shadow: 0 0 20px rgba(56, 189, 248, 0.75); }
  100% { box-shadow: 0 0 10px rgba(34, 211, 238, 0.35); }
}

  @keyframes flashThunder {
    0% {
      box-shadow: 0 0 4px rgba(0, 123, 255, 0.3);
    }
    25% {
      box-shadow: 0 0 16px rgba(0, 174, 255, 0.6);
    }
    50% {
      box-shadow: 0 0 6px rgba(0, 123, 255, 0.2);
    }
    75% {
      box-shadow: 0 0 20px rgba(0, 174, 255, 0.8);
    }
    100% {
      box-shadow: 0 0 10px rgba(0, 123, 255, 0.4);
    }
  }
        `}
      </style>
    </>
  );
};

export default Navbar;
