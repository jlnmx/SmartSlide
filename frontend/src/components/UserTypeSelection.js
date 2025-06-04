import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import config from "../config";
import "../styles/UserTypeSelection.css";

const UserTypeSelection = () => {
  const [selectedType, setSelectedType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userId = location.state?.userId;

  if (!userId) {
    // Redirect to registration if no user ID is provided
    navigate("/register");
    return null;
  }

  const userTypes = [
    {
      id: "student",
      title: "Student",
      description: "For educational purposes and academic projects",
      icon: "🎓",
      bgColor: "#3B82F6"
    },
    {
      id: "professional",
      title: "Professional",
      description: "For business presentations and work projects",
      icon: "💼",
      bgColor: "#059669"
    },
    {
      id: "personal",
      title: "Personal Use",
      description: "For personal projects and hobby presentations",
      icon: "🏠",
      bgColor: "#DC2626"
    }
  ];

  const handleTypeSelection = (type) => {
    setSelectedType(type);
  };

  const handleContinue = async () => {
    if (!selectedType) {
      alert("Please select a user type to continue.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${config.API_BASE_URL}/select-user-type`, {
        user_id: userId,
        user_type: selectedType
      });

      // Update user data in localStorage
      const updatedUser = {
        id: userId,
        user_type: selectedType,
        registration_completed: true
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      alert("User type selected successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error selecting user type:", error);
      alert(error.response?.data?.error || "Failed to select user type. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="user-type-container">
      <div className="user-type-content">
        <div className="user-type-header">
          <img src="/SS_Logo_3.png" alt="SmartSlide Logo" className="logo" />
          <h1>Choose Your Purpose</h1>
          <p>Select how you plan to use SmartSlide to get the best experience</p>
        </div>

        <div className="user-type-options">
          {userTypes.map((type) => (
            <div
              key={type.id}
              className={`user-type-card ${selectedType === type.id ? 'selected' : ''}`}
              onClick={() => handleTypeSelection(type.id)}
              style={{ '--accent-color': type.bgColor }}
            >
              <div className="card-icon">{type.icon}</div>
              <h3>{type.title}</h3>
              <p>{type.description}</p>
              <div className="selection-indicator">
                {selectedType === type.id && <span className="checkmark">✓</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="user-type-actions">
          <button
            className="continue-btn"
            onClick={handleContinue}
            disabled={!selectedType || isLoading}
          >
            {isLoading ? "Setting up..." : "Continue to Dashboard"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserTypeSelection;
