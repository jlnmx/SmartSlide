import React from "react";
import { Link } from "react-router-dom";
import "../styles/Dashboard.css";

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar logo">
          </div> {/* Logo is styled in CSS */}
        <nav className="menu">
          <Link to="/create" className="menu-item">Create</Link>
          <Link to="/templates" className="menu-item">Templates</Link>
          <Link to="/analytics" className="menu-item">Analytics</Link>
          <Link to="/settings" className="menu-item">Settings</Link>
        </nav>
        <button className="logout-btn">Logout</button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="dashboard-header">
          <h1>WELCOME BACK!</h1>
          <Link to="/create">
            <button className="new-presentation-btn">Create Presentation</button>
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
    </div>
  );
};

export default Dashboard;