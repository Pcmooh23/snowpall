import React from "react";
import CarService from './CarService';
import DrivewayService from './DrivewayService';
import CheckoutForm from './CheckoutForm';
import LawnService from './LawnService';
import StreetService from './StreetService';
import OtherService from './OtherService';
import MainHeader from "./MainHeader";

function Homepage() {

  return (
    <>
     <MainHeader/>
      <div className="homepage-container">
        <div className="services-container">
          <CarService/>
          <DrivewayService/>
          <LawnService/>
          <StreetService/>
          <OtherService/>
        </div>
        <CheckoutForm/>
      </div>
    </>
  );
}

export default Homepage;