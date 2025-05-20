import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const [presentations, setPresentations] = useState([]);

  useEffect(() => {
    // Get user from localStorage (set after login)
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.id) {
      navigate("/auth");
      return;
    }
    // Fetch recent presentations from backend
    axios
      .get(`http://localhost:5000/presentations/${user.id}`)
      .then((res) => {
        setPresentations(res.data.presentations || []);
      })
      .catch((err) => {
        setPresentations([]);
      });
  }, [navigate]);

  const handleHelpClick = () => {
    navigate("/help");
  };

  const handleLogoutClick = () => {
    localStorage.removeItem("user");
    navigate("/auth");
  };

  const handlePresentationClick = async (presentation) => {
    try {
      const res = await axios.get(`http://localhost:5000/presentation/${presentation.id}`);
      const slides = res.data.slides || [{ title: presentation.title, content: ["No slide content stored."] }];
      navigate("/slides-generating", {
        state: {
          slides,
          template: res.data.template || presentation.template,
          presentationType: res.data.presentationType || presentation.presentation_type || "Default",
        },
      });
    } catch (err) {
      // fallback: show placeholder if error
      navigate("/slides-generating", {
        state: {
          slides: [{ title: presentation.title, content: ["No slide content stored. This is a placeholder."] }],
          template: presentation.template,
          presentationType: presentation.presentation_type || "Default",
        },
      });
    }
  };

  const handleDeletePresentation = async (presentationId) => {
    if (!window.confirm("Are you sure you want to delete this presentation?")) return;
    try {
      await axios.delete(`http://localhost:5000/presentation/${presentationId}`);
      setPresentations((prev) => prev.filter((p) => p.id !== presentationId));
    } catch (err) {
      alert("Failed to delete presentation.");
    }
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
            {presentations.length === 0 ? (
              <div className="presentation-card empty">No recent presentations found.</div>
            ) : (
              presentations.map((p) => (
                <div className="presentation-card" key={p.id} onClick={() => handlePresentationClick(p)} style={{ cursor: "pointer" }}>
                  <div className="presentation-title">{p.title}</div>
                  <div className="presentation-meta">
                    <span>{new Date(p.created_at).toLocaleString()}</span>
                    {p.template && <span> | Template: {p.template}</span>}
                    {p.presentation_type && <span> | Type: {p.presentation_type}</span>}
                  </div>
                  <button
                    className="delete-btn"
                    onClick={e => { e.stopPropagation(); handleDeletePresentation(p.id); }}
                    style={{ marginTop: 8, background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
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