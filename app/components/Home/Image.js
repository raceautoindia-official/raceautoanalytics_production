import React from "react";
import Image from "next/image";
import './home.css';
function ImageGrid() {
  return (
    <>
    <div className="container-fluid mt-4 desktop">
      <div className="row ">
        {/* Farm Equipment */}
        <div className="col-md-4">
          <div className="card shadow-lg border-0 rounded-4">
            <Image
              src="/images/farm.png"
              alt="Farm Equipment"
              width={400}
              height={250}
              className="card-img-top img-fluid rounded-top"
              style={{ objectFit: "cover" }}
            />
            <div className="card-body text-center">
              <h5 className="card-title fw-bold">FARM EQUIPMENT</h5>
            </div>
          </div>
        </div>

        {/* Mining Equipment */}
        <div className="col-md-4">
          <div className="card shadow-lg border-0 rounded-4">
            <Image
              src="/images/mining.png"
              alt="Mining Equipment"
              width={400}
              height={250}
              className="card-img-top img-fluid rounded-top"
              style={{ objectFit: "cover" }}
            />
            <div className="card-body text-center">
              <h5 className="fw-bold">MINING EQUIPMENT</h5>
            </div>
          </div>
        </div>

        {/* Passenger Vehicle */}
        <div className="col-md-4">
          <div className="card shadow-lg border-0 rounded-4">
            <Image
              src="/images/passenger.png"
              alt="Passenger Vehicle"
              width={400}
              height={250}
              className="card-img-top img-fluid rounded-top"
              style={{ objectFit: "cover" }}
            />
            <div className="card-body text-center">
              <h5 className="fw-bold">PASSENGER VEHICLES</h5>
            </div>
          </div>
        </div>

      </div>
      <div className="w-100 p-2 text-center text-white mt-4" style={{ background: "#001624" }}>
  <p className="d-flex justify-content-center align-items-center text-center mt-2 mx-0" style={{ fontSize: "1.3rem" }}>
    RACE Analytics delivers global sales insights and AI-powered forecasting, giving subscribers a competitive edge.
  </p>
</div>
    </div>
   
    {/* mobile */}
    <div className="container mt-4 mobile">
      <div className="row g-4">
        {/* Farm Equipment */}
        <div className="col-md-4">
          <div className="card shadow-lg border-0 rounded-4">
            <Image
              src="/images/farm.png"
              alt="Farm Equipment"
              width={400}
              height={250}
              className="card-img-top img-fluid rounded-top"
              style={{ objectFit: "cover" }}
            />
            <div className="card-body text-center">
              <h5 className="card-title fw-bold">FARM EQUIPMENT</h5>
            </div>
          </div>
        </div>

        {/* Mining Equipment */}
        <div className="col-md-4">
          <div className="card shadow-lg border-0 rounded-4">
            <Image
              src="/images/mining.png"
              alt="Mining Equipment"
              width={400}
              height={250}
              className="card-img-top img-fluid rounded-top"
              style={{ objectFit: "cover" }}
            />
            <div className="card-body text-center">
              <h5 className="fw-bold">MINING EQUIPMENT</h5>
            </div>
          </div>
        </div>

        {/* Passenger Vehicle */}
        <div className="col-md-4">
          <div className="card shadow-lg border-0 rounded-4">
            <Image
              src="/images/passenger.png"
              alt="Passenger Vehicle"
              width={400}
              height={250}
              className="card-img-top img-fluid rounded-top"
              style={{ objectFit: "cover" }}
            />
            <div className="card-body text-center">
              <h5 className="fw-bold">PASSENGER VEHICLES</h5>
            </div>
          </div>
        </div>
        <div className="container-fluid p-2 text-center text-white mt-4" style={{ background: "#001624" }}>
    <p className="d-flex w-100 justify-content-center text-center mt-2" style={{ fontSize:"1.3rem" }}>
  RACE Analytics delivers global sales insights and AI-powered forecasting, giving subscribers a competitive edge.
</p>


    </div>
      </div>
      
    </div>
   
    {/* tab */}
    <div className="container mt-4 tab">
      <div className="row g-4">
        {/* Farm Equipment */}
        <div className="col-md-12">
          <div className="card shadow-lg border-0 rounded-4">
            <Image
              src="/images/farm.png"
              alt="Farm Equipment"
              width={400}
              height={250}
              className="card-img-top img-fluid rounded-top"
              style={{ objectFit: "cover" }}
            />
            <div className="card-body text-center">
              <h5 className="card-title fw-bold">FARM EQUIPMENT</h5>
            </div>
          </div>
        </div>

        {/* Mining Equipment */}
        <div className="col-md-12">
          <div className="card shadow-lg border-0 rounded-4">
            <Image
              src="/images/mining.png"
              alt="Mining Equipment"
              width={400}
              height={250}
              className="card-img-top img-fluid rounded-top"
              style={{ objectFit: "cover" }}
            />
            <div className="card-body text-center">
              <h5 className="fw-bold">MINING EQUIPMENT</h5>
            </div>
          </div>
        </div>

        {/* Passenger Vehicle */}
        <div className="col-md-12">
          <div className="card shadow-lg border-0 rounded-4">
            <Image
              src="/images/passenger.png"
              alt="Passenger Vehicle"
              width={400}
              height={250}
              className="card-img-top img-fluid rounded-top"
              style={{ objectFit: "cover" }}
            />
            <div className="card-body text-center">
              <h5 className="fw-bold">PASSENGER VEHICLES</h5>
            </div>
          </div>
        </div>

      </div>
      <div className="container-fluid p-2 text-center text-white mt-4" style={{ background: "#001624" }}>
    <p className="d-flex w-100 justify-content-center text-center mt-2" style={{ fontSize:"1.3rem" }}>
  RACE Analytics delivers global sales insights and AI-powered forecasting, giving subscribers a competitive edge.
</p>


    </div>
    </div>
   
    </>
  );
}

export default ImageGrid;
