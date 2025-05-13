import React from "react";
import { Link } from "react-router-dom";
import "../styles/Navbar.css";

const Navbar = () => {
  return (
    <div className="navbar">
      <div className="navbar-logo">
        <img src="/SS_Logo_7.png" alt="SmartSlide Logo" className="logo" />
      </div>
      <div className="navbar-links">
        <Link to="/dashboard" className="nav-link">Dashboard</Link>
        <Link to="/templates" className="nav-link">Templates</Link>
        <Link to="/account" className="nav-link">Account</Link> {/* Updated className */}
        <Link to="/create" className="nav-link">Create</Link>
      </div>
    </div>
  );
};

export default Navbar;