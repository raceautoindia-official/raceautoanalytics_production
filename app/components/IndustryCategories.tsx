// app/components/IndustryCategoriesRow.tsx
"use client";

import React from "react";
import { Car, Truck, Tractor as TractorIcon, Bike } from "lucide-react";

type Cat = {
  name: string;
  color: string; // hex
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>> | "TwoThree";
};

const CATEGORIES: Cat[] = [
  { name: "Passenger Vehicles", color: "#60A5FA", Icon: Car },
  { name: "Commercial Vehicles", color: "#34D399", Icon: Truck },
  { name: "Tractors", color: "#FBBF24", Icon: TractorIcon },
  { name: "Two & Three Wheeler", color: "#C4B5FD", Icon: "TwoThree" },
];

/** Simple autorickshaw outline */
function AutoRickshawIcon(props: React.SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      <path d="M3 9h8.5c2.2 0 4 1.8 4 4v2" />
      <path d="M4.5 9v4h6v-4z" />
      <path d="M13 11h2.5l1.8 2" />
      <path d="M4 15h12" />
      <circle cx="6.5" cy="17" r="1.8" />
      <circle cx="9.5" cy="17" r="1.8" />
      <circle cx="17" cy="17" r="1.8" />
    </svg>
  );
}

/** Combo icon for Two & Three Wheeler (Bike + AutoRickshaw) */
function TwoThreeIcon(
  props: React.SVGProps<SVGSVGElement> & { color: string },
) {
  const { color, ...rest } = props;
  return (
    <div className="relative h-6 w-6" aria-hidden>
      <Bike
        {...rest}
        className="absolute left-0 top-0 h-[18px] w-[18px]"
        strokeWidth={2.2}
        style={{ color }}
      />
      <AutoRickshawIcon
        className="absolute right-0 bottom-0 opacity-95"
        style={{ color }}
      />
    </div>
  );
}

export default function IndustryCategoriesRow() {
  // Same soft grey-blue hairline used before
  const softBorder =
    "ring-1 ring-inset ring-[#2F3949]/40 hover:ring-[#2F3949]/55";

  return (
    <section className="w-full bg-[#0b1218] text-white py-14 md:py-16">
      <div
        className="mx-auto w-[95vw] xl:w-[93vw] 2xl:w-[90vw] max-w-none px-2 sm:px-3 lg:px-4
"
      >
        {/* Title + subtitle */}
        <div className="text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Industry Categories
          </h2>
          <p className="mx-auto mt-4 max-w-4xl text-base md:text-lg leading-relaxed text-white/70">
            Comprehensive coverage across major automotive segments with
            detailed market analysis and forecasting.
          </p>
        </div>

        {/* Category cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {CATEGORIES.map(({ name, color, Icon }) => {
            const tint = `${color}1A`; // subtle tile tint
            return (
              <div
                key={name}
                className={`rounded-2xl ${softBorder} bg-white/[0.05] p-8 shadow-[0_12px_40px_rgba(0,0,0,.35)] backdrop-blur transition hover:bg-white/[0.07]`}
              >
                <div className="flex items-center">
                  {/* Left icon (fixed width) */}
                  <div className="w-16 flex justify-center">
                    <span
                      className="inline-flex h-12 w-12 items-center justify-center rounded-xl ring-1 ring-inset ring-white/10"
                      style={{ background: tint }}
                      aria-hidden
                    >
                      {Icon === "TwoThree" ? (
                        <TwoThreeIcon color={color} />
                      ) : (
                        <Icon
                          className="h-6 w-6"
                          strokeWidth={2.1}
                          style={{ color }}
                        />
                      )}
                    </span>
                  </div>

                  {/* Center label */}
                  <div className="flex-1 text-center text-lg font-semibold">
                    {name}
                  </div>

                  {/* Right spacer to keep label centered */}
                  <div className="w-16" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Next section heading */}
        {/* <div className="mt-24 text-center">
          <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight">
            OEM Performance &amp; Market Segments
          </h3>
          <p className="mx-auto mt-3 max-w-3xl text-white/70">
            Comprehensive ranking of top manufacturers and segment distribution
            analysis
          </p>
        </div> */}
      </div>
    </section>
  );
}
