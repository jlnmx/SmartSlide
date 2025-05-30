import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import Navbar from "./Navbar"; // Import the Navbar component
import "../styles/AccountProfile.css";
import config from "../config";

const AccountProfile = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [theme, setTheme] = useState(() => {
    // Load theme from localStorage or default to Light
    return localStorage.getItem("theme") || "Light";
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const navigate = useNavigate(); // Initialize useNavigate

  // Fetch user info on mount
  React.useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.id) {
      navigate("/auth"); // Redirect to login if no user
      return;
    }
    // setLoading(true); // Set loading true before fetch
    fetch(`${config.API_BASE_URL}/user/${user.id}`)
      .then((res) => {
        if (!res.ok) {
          // If response is not OK, try to parse error message from backend if available
          return res.json().then(errData => {
            throw new Error(errData.error || 'Failed to fetch user data');
          }).catch(() => {
            // Fallback if parsing error JSON fails
            throw new Error(`Failed to fetch user data. Status: ${res.status}`);
          });
        }
        return res.json();
      })
      .then((data) => {
        if (data && typeof data.email === 'string') {
          setEmail(data.email);
        } else {
          setEmail(''); // Set to empty if not found or invalid type
          // setMessage("User email could not be retrieved in the expected format.");
          console.warn("Fetched user data does not contain a valid email string:", data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching user data:", err);
        // Use the error message from the Error object, which might include backend error
        setMessage(err.message || "Failed to load user information.");
        setLoading(false);
      });
  }, [navigate]);

  const handleSaveChanges = () => {
    setMessage("");
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.id) {
      navigate("/auth");
      return;
    }
    // Only send fields that changed
    const payload = { email };
    if (password) payload.password = password;
    fetch(`${config.API_BASE_URL}/user/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        setMessage("Changes saved successfully!");
        setPassword("");
      })
      .catch(() => {
        setMessage("Failed to save changes.");
      });
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
      <div className="account-profile-container">
        <h1 className="account-title">Account Settings</h1>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
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
              {message && <div className="save-message">{message}</div>}
            </div>

            {/* Analytics Section */}
            <div className="account-section">
              <h2 className="section-title">Analytics</h2>
              <button className="show-statistics-btn" onClick={handleShowStatistics}>
                Show Statistics
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AccountProfile;