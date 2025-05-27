import React from "react";
import { Link } from "react-router-dom";
import "../styles/Navbar.css";

const Navbar = () => {
  return (
    <div className="navbar">
      <div className="navbar-logo">
        {/* Make the logo clickable and navigate to the App.js page */}
        <Link to="/dashboard">
          <img src="/SS_Logo_7.png" alt="SmartSlide Logo" className="logo" />
        </Link>
      </div>
      <div className="navbar-links">
        <Link to="/dashboard" className="nav-link">DASHBOARD</Link>
        <Link to="/create" className="nav-link">CREATE</Link>
        <Link to="/saved-quizzes-and-scripts" className="nav-link">QUIZZES & SCRIPTS</Link>
        <Link to="/account" className="nav-link">ACCOUNT</Link>
      </div>
    </div>
  );
};

export default Navbar;