"use client";
import Link from "next/link";
import React from "react";

function Banner() {
  return (
    <>
      <div
        className="container-fluid d-flex flex-column justify-content-between desktop"
        style={{
          backgroundImage: "url('/images/home-banner.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          minHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          padding: "2rem",
        }}
      >
        <h1 className="text-white text-center" style={{ fontSize: "3rem" }}>
          RACE ANALYTICS
        </h1>
        <div className="col-lg-auto col-12 d-flex justify-content-end">
          <div className="justify-content-center text-white">
            <h5>Commercial Vehicles</h5>
            <h5>Passenger Vehicles</h5>
            <h5>CME/Farm Equipment</h5>
            <h5>Buses & Coaches</h5>
            <h5>Trucks</h5>
            <h5>And more...</h5>
            <Link href="/forecast" style={{ textDecoration: "none" }}>
              <h2 style={{ color: "#21F2D7" }}>To Forecast</h2>
            </Link>
          </div>
        </div>
        <h1 className="text-white  mt-auto">
          The Ultimate AI-Driven Market Intelligence Platform for the<br></br>{" "}
          Truck, Bus, and Trailer Industry
        </h1>
      </div>
      {/* mobile */}
      <div
        className="container-fluid d-flex flex-column justify-content-between mobile"
        style={{
          backgroundImage: "url('/images/home-banner.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          minHeight: "40vh",
          display: "flex",
          flexDirection: "column",
          padding: "2rem",
        }}
      >
        <h1 className="text-white text-center" style={{ fontSize: "3rem" }}>
          RACE ANALYTICS
        </h1>
        <div className="col-lg-auto col-12 d-flex justify-content-end">
          <div className="justify-content-center mt-5 text-white">
            <h5>Commercial Vehicles</h5>
            <h5>Passenger Vehicles</h5>
            <h5>CME/Farm Equipment</h5>
            <h5>Buses & Coaches</h5>
            <h5>Trucks</h5>
            <h5>And more...</h5>
            <Link href="/forecast" style={{ textDecoration: "none" }}>
              <h2 style={{ color: "#21F2D7", textDecoration: "none" }}>
                Forecast
              </h2>
            </Link>
            <Link href="/flash-reports" style={{ textDecoration: "none" }}>
              <h2 style={{ color: "#21F2D7", textDecoration: "none" }}>
                Flash Report
              </h2>
            </Link>
          </div>
        </div>
      </div>
      {/* tab */}
      <div
        className="container-fluid d-flex flex-column justify-content-between tab"
        style={{
          backgroundImage: "url('/images/home-banner.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          minHeight: "40vh",
          display: "flex",
          flexDirection: "column",
          padding: "2rem",
        }}
      >
        <h1 className="text-white text-center" style={{ fontSize: "3rem" }}>
          RACE ANALYTICS
        </h1>
        <div className="col-lg-auto col-12 d-flex justify-content-end">
          <div className="justify-content-center mt-5 text-white">
            <h5>Commercial Vehicles</h5>
            <h5>Passenger Vehicles</h5>
            <h5>CME/Farm Equipment</h5>
            <h5>Buses & Coaches</h5>
            <h5>Trucks</h5>
            <h5>And more...</h5>
            <Link href="/forecast" style={{ textDecoration: "none" }}>
              <h2 style={{ color: "#21F2D7", textDecoration: "none" }}>
                Forecast
              </h2>
            </Link>
            <Link href="/flash-reports" style={{ textDecoration: "none" }}>
              <h2 style={{ color: "#21F2D7", textDecoration: "none" }}>
                Flash Report
              </h2>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default Banner;
