import React from "react";
import "../styles/Help.css"; // Import the HelpPage styles

const Help = () => {
  return (
    <div className="help-page-container">
      <h1 className="help-title">How can we help you?</h1>
      <p className="help-description">
        Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
      </p>
      <div className="help-cards">
        <div className="help-card">
          <i className="help-icon location-icon"></i>
          <h3>OUR MAIN OFFICE</h3>
          <p>SoHo 94 Broadway St New York, NY 1001</p>
        </div>
        <div className="help-card">
          <i className="help-icon phone-icon"></i>
          <h3>PHONE NUMBER</h3>
          <p>234-9876-5400</p>
          <p>888-0123-4567 (Toll Free)</p>
        </div>
        <div className="help-card">
          <i className="help-icon fax-icon"></i>
          <h3>FAX</h3>
          <p>1-234-567-8900</p>
        </div>
        <div className="help-card">
          <i className="help-icon email-icon"></i>
          <h3>EMAIL</h3>
          <p>hello@theme.com</p>
        </div>
      </div>
    </div>
  );
};

export default Help;