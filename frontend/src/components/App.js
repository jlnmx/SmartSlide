import React from "react";
import { Link } from "react-router-dom";
import "../styles/App.css";

function App() {
  return (
    <div className="welcome-container">
      {/* Background Logo */}
      <div className="background-logo"></div>

      {/* Gradient Bar */}
      <div className="gradient-bar">
        <h1 className="welcome-title">SMARTSLIDE</h1>
        <p className="welcome-subtitle">
          CREATE STUNNING PRESENTATIONS EFFORTLESSLY WITH AI.
        </p>
      </div>

      {/* Get Started Button */}
      <Link to="/auth">
        <button className="welcome-btn">GET STARTED</button>
      </Link>
    </div>
  );
}

export default App;