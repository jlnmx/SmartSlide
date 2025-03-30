import React from "react";
import { Link } from "react-router-dom";
import "../styles/Dashboard.css";

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <h2 className="logo">SmartSlide</h2>
        <nav className="menu">
          <Link to="/create" className="menu-item">Create</Link>
          <Link to="/presentations" className="menu-item">My Presentations</Link>
          <Link to="/analytics" className="menu-item">Analytics</Link>
          <Link to="/settings" className="menu-item">Settings</Link>
        </nav>
      </aside>
      
      <main className="main-content">
        <header className="dashboard-header">
          <h1>Welcome Back!</h1>
          <button className="new-presentation-btn">New Presentation</button>
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
    </div>
  );
};

export default Dashboard;