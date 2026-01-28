import React from "react";
import Image from "next/image";
import './home.css';
import Link from "next/link";

function Analytics() {
  return (
    <>
    <div className="container-fluid desktop">
      <div className="row">
        <div className="col-md-5 mt-3 position-relative" style={{ height: "400px" }}>
          <Image
            src="/images/bus.png"
            alt="Globe showing world map"
            fill
            className="img-fluid rounded shadow-sm"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="col-md-7 mt-3" style={{ textAlign: "justify",fontSize:"1.1rem" }}>
          <p>
            <strong>RACE Analytics</strong> is the leading data intelligence
            platform for the global trucking, bus, trailer, and passenger
            vehicle industry. It offers comprehensive analytics on historical
            sales trends, production volumes, financial performance, and key
            industry benchmarks for the world’s top truck, bus, and trailer
            manufacturers and their subsidiaries.
          </p>

          <p>
            Powered by our cutting-edge AI-enabled forecasting tool, RACE
            Analytics helps businesses and investors predict market trends with
            precision. It leverages advanced data modeling to analyze
            macroeconomic and microeconomic factors, market restraints, and
            stakeholder inputs for data-driven decision-making.
          </p>

          <p style={{ fontFamily: "Roboto" }}>
            For seamless global comparisons, all financial data is standardized
            in USD and the original reporting currency, ensuring accurate
            insights, competitive intelligence, and strategic growth
            opportunities for OEMs, suppliers, fleet operators, and industry
            analysts.
          </p>
          <Link href='https://raceautoindia.com/subscription'><button style={{ background:"#001624" ,width:"100px",borderRadius:"7px" }} className="text-white p-2 mt-2">Subscribe</button></Link>
        </div>
      </div>
    </div>
    {/* mobile */}
    <div className="container-fluid mobile">
      <div className="row">
        <div className="col-md-5 mt-3 position-relative" style={{ height: "400px" }}>
          <Image
            src="/images/bus.png"
            alt="Globe showing world map"
            fill
            className="img-fluid rounded shadow-sm"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="col-md-7 mt-3" style={{ textAlign: "justify",fontSize:"1.1rem" }}>
          <p>
            <strong>RACE Analytics</strong> is the leading data intelligence
            platform for the global trucking, bus, trailer, and passenger
            vehicle industry. It offers comprehensive analytics on historical
            sales trends, production volumes, financial performance, and key
            industry benchmarks for the world’s top truck, bus, and trailer
            manufacturers and their subsidiaries.
          </p>

          <p>
            Powered by our cutting-edge AI-enabled forecasting tool, RACE
            Analytics helps businesses and investors predict market trends with
            precision. It leverages advanced data modeling to analyze
            macroeconomic and microeconomic factors, market restraints, and
            stakeholder inputs for data-driven decision-making.
          </p>

          <p style={{ fontFamily: "Roboto" }}>
            For seamless global comparisons, all financial data is standardized
            in USD and the original reporting currency, ensuring accurate
            insights, competitive intelligence, and strategic growth
            opportunities for OEMs, suppliers, fleet operators, and industry
            analysts.
          </p>
          <Link href='https://raceautoindia.com/subscription'><button style={{ background:"#001624",width:"100px",borderRadius:"7px" }} className="text-white p-2 mt-2">Subscribe</button></Link>
        </div>
      </div>
    </div>
    {/* tab */}
    <div className="container-fluid tab">
      <div className="row">
        <div className="col-md-12 mt-3 position-relative" style={{ height: "400px" }}>
          <Image
            src="/images/bus.png"
            alt="Globe showing world map"
            fill
            className="img-fluid rounded shadow-sm"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="col-md-12 mt-3" style={{ textAlign: "justify",fontSize:"1.1rem" }}>
          <p>
            <strong>RACE Analytics</strong> is the leading data intelligence
            platform for the global trucking, bus, trailer, and passenger
            vehicle industry. It offers comprehensive analytics on historical
            sales trends, production volumes, financial performance, and key
            industry benchmarks for the world’s top truck, bus, and trailer
            manufacturers and their subsidiaries.
          </p>

          <p>
            Powered by our cutting-edge AI-enabled forecasting tool, RACE
            Analytics helps businesses and investors predict market trends with
            precision. It leverages advanced data modeling to analyze
            macroeconomic and microeconomic factors, market restraints, and
            stakeholder inputs for data-driven decision-making.
          </p>

          <p style={{ fontFamily: "Roboto" }}>
            For seamless global comparisons, all financial data is standardized
            in USD and the original reporting currency, ensuring accurate
            insights, competitive intelligence, and strategic growth
            opportunities for OEMs, suppliers, fleet operators, and industry
            analysts.
          </p>
          <Link href='https://raceautoindia.com/subscription'><button style={{ background:"#001624",width:"100px",borderRadius:"7px" }} className="text-white p-2 mt-2 sub-but">Subscribe</button></Link>
        </div>
      </div>
    </div>
    </>
  );
}

export default Analytics;
