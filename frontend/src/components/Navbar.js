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
        <Link to="/dashboard" className="nav-link">Dashboard</Link>
        <Link to="/templates" className="nav-link">Templates</Link>
        <Link to="/account" className="nav-link">Account</Link>
        <Link to="/create" className="nav-link">Create</Link>
      </div>
    </div>
  );
};

export default Navbar;