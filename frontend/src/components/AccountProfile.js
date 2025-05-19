import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import Navbar from "./Navbar"; // Import the Navbar component
import "../styles/AccountProfile.css";

const AccountProfile = () => {
  const [email, setEmail] = useState("user@example.com");
  const [password, setPassword] = useState("");
  const [theme, setTheme] = useState(() => {
    // Load theme from localStorage or default to Light
    return localStorage.getItem("theme") || "Light";
  });

  const navigate = useNavigate(); // Initialize useNavigate

  const handleSaveChanges = () => {
    alert("Changes saved successfully!");
    // Add logic to save changes (e.g., API call)
  };

  const handleThemeChange = (selectedTheme) => {
    setTheme(selectedTheme);
    localStorage.setItem("theme", selectedTheme);
    // Optionally, update a CSS class on body for global theming
    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add(selectedTheme === "Dark" ? "theme-dark" : "theme-light");
  };

  React.useEffect(() => {
    document.body.classList.add(theme === "Dark" ? "theme-dark" : "theme-light");
    return () => {
      document.body.classList.remove("theme-light", "theme-dark");
    };
  }, [theme]);

  const handleShowStatistics = () => {
    navigate("/analytics"); 
  };

  return (
    <div>
      {/* Add the Navbar at the top */}
      <Navbar />

      {/* Account Profile Container */}
      <div className="account-profile-container">
        <h1 className="account-title">Account Settings</h1>

        {/* Edit Information Section */}
        <div className="account-section">
          <h2 className="section-title">Edit Information</h2>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>New Password (Optional)</label>
            <input
              type="password"
              placeholder="Leave blank to keep current password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="save-changes-btn" onClick={handleSaveChanges}>
            Save Changes
          </button>
        </div>

        {/* Display Settings Section */}
        <div className="account-section">
          <h2 className="section-title">Display Settings</h2>
          <div className="theme-options">
            <button
              className={`theme-btn ${theme === "Light" ? "active" : ""}`}
              onClick={() => handleThemeChange("Light")}
            >
              Light
            </button>
            <button
              className={`theme-btn ${theme === "Dark" ? "active" : ""}`}
              onClick={() => handleThemeChange("Dark")}
            >
              Dark
            </button>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="account-section">
          <h2 className="section-title">Analytics</h2>
          <button className="show-statistics-btn" onClick={handleShowStatistics}>
            Show Statistics
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountProfile;