import React from 'react';
import Banner from './Banner';
import Analytics from './Analytics';
import Image from './Image';
import Chart from './Chart';
import Last from './Last';
import Navbar from './Navbar';


const Home = () => {
  return (
    <>
    <Navbar/>
      <Banner/>
      <div id="analytics">
      <Analytics/>
      </div>
      <div id="image">
      <Image/>
      </div>
      <div id="chart">
      <Chart/>
      </div>
      <div id="last">
      <Last/>
      </div>
    </>
  );
};

export default Home;
