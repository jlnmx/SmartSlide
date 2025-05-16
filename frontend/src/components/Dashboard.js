import React from "react";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import "../styles/Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate(); // Initialize useNavigate

  const handleHelpClick = () => {
    navigate("/help"); // Navigate to the Help page
  };

  const handleLogoutClick = () => {
    // Add any logout logic here (e.g., clearing tokens, session data, etc.)
    navigate("/auth"); // Navigate to the Auth page
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar logo"></div> {/* Logo is styled in CSS */}
        <nav className="menu">
          <Link to="/create" className="menu-item">CREATE</Link>
          <Link to="/templates" className="menu-item">TEMPLATES</Link>
          <Link to="/settings" className="menu-item">SETTINGS</Link>
        </nav>
        <button className="logout-btn" onClick={handleLogoutClick}>
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="dashboard-header">
          <h1>WELCOME BACK!</h1>
          {/* Add Account Button */}
          <Link to="/account" className="account-btn">
            Account
          </Link>
        </header>

        <section className="recent-presentations">
          <h2>RECENT PRESENTATIONS</h2>
          <div className="presentation-list">
            <div className="presentation-card">Presentation 1</div>
            <div className="presentation-card">Presentation 2</div>
            <div className="presentation-card">Presentation 3</div>
          </div>
        </section>
      </main>

      {/* Need Help Button */}
      <button className="need-help-btn" onClick={handleHelpClick}>
      </button>
    </div>
  );
};

export default Dashboard;