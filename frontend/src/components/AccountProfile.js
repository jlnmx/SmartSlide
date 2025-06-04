import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import Navbar from "./Navbar"; // Import the Navbar component
import "../styles/AccountProfile.css";
import config from "../config";

const AccountProfile = () => {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [contactNumber, setContactNumber] = useState("");  const [userType, setUserType] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      })      .then((data) => {
        if (data && typeof data.email === 'string') {
          setEmail(data.email || '');
          setFullName(data.full_name || '');
          setBirthday(data.birthday || '');
          setContactNumber(data.contact_number || '');
          setUserType(data.user_type || '');
        } else {
          setEmail(''); // Set to empty if not found or invalid type
          console.warn("Fetched user data does not contain valid user information:", data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching user data:", err);
        // Use the error message from the Error object, which might include backend error
        setMessage(err.message || "Failed to load user information.");
        setLoading(false);
      });
  }, [navigate]);  const handleSaveChanges = () => {
    setMessage("");
    
    // Validate password confirmation if password is being changed
    if (password && password !== confirmPassword) {
      setMessage("Passwords do not match!");
      return;
    }
    
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.id) {
      navigate("/auth");
      return;
    }
    // Only send fields that changed
    const payload = { 
      email,
      full_name: fullName,
      birthday,
      contact_number: contactNumber
    };
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
        setConfirmPassword("");
        // Update localStorage with new user data if available
        if (data.user) {
          const updatedUser = { ...user, ...data.user };
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
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
          <>            {/* Edit Information Section */}
            <div className="account-section">
              <h2 className="section-title">Edit Information</h2>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Birthday</label>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Contact Number</label>
                <input
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="Enter your contact number"
                />
              </div>
              <div className="form-group">
                <label>User Type</label>
                <input
                  type="text"
                  value={userType}
                  readOnly
                  disabled
                  style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                  placeholder="User type (read-only)"
                />
                <small style={{ color: '#666', fontSize: '12px' }}>
                  Your user type cannot be changed after registration
                </small>
              </div>              <div className="form-group">
                <label>New Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Leave blank to keep current password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={!password}
                  style={{ 
                    backgroundColor: !password ? '#f8f9fa' : '',
                    cursor: !password ? 'not-allowed' : ''
                  }}
                />
                {password && confirmPassword && password !== confirmPassword && (
                  <small style={{ color: '#dc3545', fontSize: '12px' }}>
                    Passwords do not match
                  </small>
                )}
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