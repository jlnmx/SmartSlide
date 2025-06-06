import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Dashboard.css";
import config from "../config";

const Dashboard = () => {
  const navigate = useNavigate();
  const [presentations, setPresentations] = useState([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false); // Add this line


  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.id) {
      navigate("/auth");
      return;
    }
    axios
      .get(`${config.API_BASE_URL}/presentations/${user.id}`)
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
    setShowLogoutModal(true);
  };

   const confirmLogout = () => {
    localStorage.removeItem("user");
    navigate("/auth");
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };


  const handlePresentationClick = async (presentation) => {
    try {
      const res = await axios.get(`${config.API_BASE_URL}/presentation/${presentation.id}`);
      const slides = res.data.slides || [{ title: presentation.title, content: ["No slide content stored."] }];
      navigate("/slides-generating", {
        state: {
          slides,
          template: res.data.template || presentation.template,
          presentationType: res.data.presentationType || presentation.presentation_type || "Default",
          presentationId: presentation.id, // Add presentationId to the navigation state
        },
      });
    } catch (err) {
      navigate("/slides-generating", {
        state: {
          slides: [{ title: presentation.title, content: ["No slide content stored. This is a placeholder."] }],
          template: presentation.template,
          presentationType: presentation.presentation_type || "Default",
          presentationId: presentation.id, // Add presentationId to the navigation state
        },
      });
    }
  };

  const handleDeletePresentation = async (presentationId) => {
    if (!window.confirm("Are you sure you want to delete this presentation?")) return;
    try {
      await axios.delete(`${config.API_BASE_URL}/presentation/${presentationId}`);
      setPresentations((prev) => prev.filter((p) => p.id !== presentationId));
    } catch (err) {
      alert("Failed to delete presentation.");
    }
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar logo"></div> 
        <nav className="menu">
          <Link to="/create" className="menu-item">CREATE</Link>
          <Link to="/saved-quizzes-and-scripts" className="menu-item">QUIZZES & SCRIPTS</Link>
          <Link to="/analytics" className="menu-item">ANALYTICS</Link>
          <Link to="/upload-templates" className="menu-item">UPLOAD TEMPLATES</Link>
        </nav>
        <button className="logout-btn" onClick={handleLogoutClick}>
          Logout
        </button>
      </aside>

      <main className="main-content">        
        <header className="dashboard-header">
          <h1>WELCOME BACK!</h1>
          <div className="header-actions"> 
            <Link to="/account" className="account-btn" title="Account Settings">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </Link>
          </div>
        </header>

        <section className="recent-presentations">
          <h2>RECENT PRESENTATIONS</h2>
          <div className="presentation-list">
            {presentations.length === 0 ? (
              <>
                <div className="presentation-card empty">No recent presentations found.</div>
                {/* Show backend error if present */}
                {presentations.error && (
                  <div className="presentation-card error" style={{color: 'red'}}>
                    Backend error: {presentations.error}
                  </div>
                )}
              </>
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

      <button className="need-help-btn" onClick={handleHelpClick}>
      </button>

      {/* Add the logout modal before the closing div */}
      {showLogoutModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to log out?</p>
            <div className="logout-modal-buttons">
              <button className="logout-confirm-btn" onClick={confirmLogout}>
                Proceed
              </button>
              <button className="logout-cancel-btn" onClick={cancelLogout}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;