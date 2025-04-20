import React from "react";
import { Link } from "react-router-dom";
import "../styles/Navbar.css";

const Navbar = () => {
  return (
    <div className="navbar">
      <div className="navbar-logo">
        <img src="/logo.png" alt="SmartSlide Logo" className="logo" />
        <h1 className="app-name">SmartSlide</h1>
      </div>
      <div className="navbar-links">
        <Link to="/dashboard" className="nav-link">Dashboard</Link>
        <Link to="/templates" className="nav-link">Templates</Link>
        <Link to="/analytics" className="nav-link">Analytics</Link>
        <Link to="/create" className="nav-link">Create</Link>
      </div>
    </div>
  );
};

export default Navbar;