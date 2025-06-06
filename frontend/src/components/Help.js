import React from "react";
import "../styles/Help.css";
import Navbar from "./Navbar"; 
import Chatbot from "./Chatbot";

const Help = () => {
  return (
    <div>
      <Navbar />
      <div className="help-page-container">
        <h1 className="help-title">Contact us for more information!</h1>
        <p className="help-description">
          We are the developers of SmartSlide, a presentation tool that helps you in creating Powerpoint presentations. If you have any questions or need assistance, please feel free to reach out to us. We are here to help you!
          <br />
          <br />
          <strong>💬 Try our AI Assistant!</strong> Click the chat icon in the bottom-right corner to get instant answers about SmartSlide's features and capabilities.
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
            <p>+63 9454969101</p>
            <p>+63 9157225622</p>
          </div>
          <div className="help-card">
            <i className="help-icon email-icon"></i>
            <h3>EMAIL</h3>
            <ul>ajlabre14@gmail.com</ul>
            <ul>sabandojullian@gmail.com</ul>
          </div>
        </div>
      </div>
      <Chatbot />
    </div>
  );
};

export default Help;