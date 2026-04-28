"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

/* ----------------- shared subtle border ----------------- */
const softBorder = "ring-1 ring-inset ring-[#2F3949]/40";

/* ----------------- data ----------------- */
const CATEGORIES = [
  {
    title: "Passenger Vehicles",
    img: "/images/cars-flash-report.jpeg",
    href: "flash-reports/passenger-vehicles", // ← change as needed
  },
  {
    title: "Commercial Vehicles",
    img: "/images/truck-flash-report.jpeg",
    href: "/flash-reports/commercial-vehicles",
  },
  {
    title: "Two Wheeler",
    img: "/images/2w-flash-report.png",
    href: "/flash-reports/two-wheeler",
  },
  {
    title: "Three Wheeler",
    img: "/images/3w-flash-report.png",
    href: "/flash-reports/three-wheeler",
  },
  {
    title: "Tractor",
    img: "/images/tractor-flash-report.png",
    href: "/flash-reports/tractor",
  },
  {
    title: "Overall Industry",
    img: "/images/overall-flash-report.png",
    href: "/flash-reports/overall-automotive-industry",
  },
];

export default function ExploreVehicleCategories() {
  return (
    <>
      {/* ---------- Explore Vehicle Categories ---------- */}
       <div
        className="mx-auto w-[95vw] xl:w-[93vw] 2xl:w-[90vw] max-w-none px-2 sm:px-3 lg:px-4
"
      >
      <header className="mb-6">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
          Explore Vehicle Categories
        </h2>
        <p className="mt-2 max-w-3xl text-white/70">
          Dive into detailed analytics for each automotive segment
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {CATEGORIES.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className={`group relative block h-56 overflow-hidden rounded-2xl ${softBorder} bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] focus:outline-none focus:ring-2 focus:ring-blue-500/60`}
            aria-label={`Open ${c.title}`}
            prefetch={false}
          >
            <Image
              src={c.img}
              alt={c.title}
              fill
              priority
              className="object-cover transition duration-500 group-hover:scale-[1.03] group-hover:brightness-[.9]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4">
              <h3 className="text-lg font-semibold drop-shadow">{c.title}</h3>
            </div>
            <span className="sr-only">{`Go to ${c.title}`}</span>
          </Link>
        ))}
      </div>
      </div>
    </>
  );
}