import Link from "next/link";
import React from "react";

function Last() {
  return (
    <>
      <div className="container-fluid mt-3 desktop">
        <div className="row">
          <div
            className="col-lg-6 d-flex justify-content-center align-items-center text-center"
            style={{
              backgroundImage: "url('/images/bg-1.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              minHeight: "50vh",
            }}
          >
            <div>
              <h1 className="p-2 display-2 fw-bold text-uppercase  text-md-start text-sm-center">
                RACE
              </h1>
              <h1 className="p-2 display-3 fw-bold text-danger text-md-start text-sm-center">
                AI POWERED
              </h1>
              <h1 className="p-2 display-4 fw-bold text-uppercase  text-md-start text-sm-center">
                FORECAST TOOLS
              </h1>
            </div>
          </div>

          <div
            className="col-lg-6 d-flex flex-column justify-content-center align-items-start text-start p-4"
            style={{
              backgroundImage: "url('/images/bg-2.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              minHeight: "50vh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "start",
              gap: "20px",
            }}
          >
            <h1 className="text-white ms-5">
              Get Smarter Forecasts with Our<br></br>Data and Your Strategic
              <br></br>Insights!
            </h1>

            <Link href="https://raceautoindia.com/subscription">
              <button
                className="p-2 rounded border-0 fw-bold ms-5"
                style={{
                  fontSize: "19px",
                  width: "200px",
                }}
              >
                SUBSCRIBE
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* mobile */}
      <div className="container-fluid mt-3 mobile">
        <div className="row">
          <div
            className="col-lg-6 d-flex flex-column justify-content-center align-items-start text-start p-4"
            style={{
              backgroundImage: "url('/images/bg-2.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              minHeight: "30vh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "start",
              gap: "20px",
            }}
          >
            <h1 className="text-white ms-5 no-wrap">
              RACE AI POWERED FORECAST TOOLS
            </h1>

            <h3 className="text-white ms-5">
              Get Smarter Forecasts with Our Data and Your Strategic Insights!
            </h3>

            <Link href="https://raceautoindia.com/subscription">
              <button
                className="p-2 rounded border-0 fw-bold ms-5"
                style={{
                  fontSize: "19px",
                  width: "200px",
                }}
              >
                SUBSCRIBE
              </button>
            </Link>
          </div>
        </div>
      </div>
      {/* tab */}
      <div className="container-fluid mt-3 tab">
        <div className="row">
          <div
            className="col-lg-12 d-flex flex-column justify-content-center align-items-start text-start p-4"
            style={{
              backgroundImage: "url('/images/bg-2.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              minHeight: "30vh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "start",
              gap: "20px",
            }}
          >
            <h1 className="text-white ms-5 no-wrap">
              RACE AI POWERED FORECAST TOOLS
            </h1>

            <h3 className="text-white ms-5">
              Get Smarter Forecasts with Our Data and Your Strategic Insights!
            </h3>

            <Link href="https://raceautoindia.com/subscription">
              <button
                className="p-2 rounded border-0 fw-bold ms-5"
                style={{
                  fontSize: "19px",
                  width: "200px",
                }}
              >
                SUBSCRIBE
              </button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default Last;
