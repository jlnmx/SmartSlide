import React, { useState } from "react";
import { Link, Routes, Route } from "react-router-dom";
import "../styles/Dashboard.css";

const Dashboard = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // State for sidebar collapse

  return (
    <div className={`dashboard-container`}>
      <aside className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <button
          className="collapse-btn"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        >
          {isSidebarCollapsed ? ">" : "<"}
        </button>
        {!isSidebarCollapsed && (
          <>
            <h2 className="logo">SmartSlide</h2>
            <nav className="menu">
              <Link to="/create" className="menu-item">Create</Link>
              <Link to="/templates" className="menu-item">Templates</Link>
              <Link to="/analytics" className="menu-item">Analytics</Link>
              <button className="menu-item" onClick={() => setShowSettings(true)}>Settings</button>
            </nav>
          </>
        )}
      </aside>

      <main className="main-content">
        <header className="dashboard-header">
          <h1>Welcome Back!</h1>
          <Link to="/create">
            <button className="new-presentation-btn">New Presentation</button>
          </Link>
        </header>

        <section className="recent-presentations">
          <h2>Recent Presentations</h2>
          <div className="presentation-list">
            <div className="presentation-card">Presentation 1</div>
            <div className="presentation-card">Presentation 2</div>
            <div className="presentation-card">Presentation 3</div>
          </div>
        </section>
      </main>

      {showSettings && (
        <div className="settings-modal">
          <div className="settings-content">
            <h2>Settings</h2>
            <button className="close-btn" onClick={() => setShowSettings(false)}>Close</button>
            <div className="settings-section">
              <h3>Account</h3>
              <p>Manage your account settings here.</p>
            </div>
            <div className="settings-section">
              <h3>Appearance</h3>
              <p>Customize the appearance of the application.</p>
            </div>
            <div className="settings-section">
              <h3>Other Settings</h3>
              <p>Configure additional settings for the application.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;