import React from "react";
import "../styles/Help.css";
import Navbar from "./Navbar"; 
const Help = () => {
  return (
    <div><Navbar />
    <div className="help-page-container">
      <h1 className="help-title">Contact us for more information!</h1>
      <p className="help-description">
        We are the developers of SmartSlide, a presentation tool that helps you in creating Powerpoint presentations. If you have any questions or need assistance, please feel free to reach out to us. We are here to help you!
        <br />
      </p>
      <div className="help-cards">
        <div className="help-card">
          <i className="help-icon location-icon"></i>
          <h3>LOCATION</h3>``
          <p>Polytechnic University of the Philippines - Binan Campus</p>
          <p>College of Information Technology and Engineering</p>
        </div>
        <div className="help-card">
          <i className="help-icon phone-icon"></i>
          <h3>PHONE NUMBER</h3>
          <p>(insert phone number)</p>
          <p>(insert phone number)</p>
        </div>
        <div className="help-card">
          <i className="help-icon email-icon"></i>
          <h3>EMAIL</h3>
          <ul>ajlabre14@gmail.com</ul>
          <ul>sabandojullian@gmail.com</ul>
        </div>
      </div>
    </div>
    </div>
  );
};

export default Help;