import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import "../styles/CreatePage.css";
import "../styles/ImportPopup.css"; // Import the popup styles

const CreatePage = () => {
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const navigate = useNavigate(); // Initialize useNavigate

  const togglePopup = () => {
    setIsPopupVisible(!isPopupVisible);
  };

  const handleStartWithAI = () => {
    navigate("/generate"); // Navigate to the GeneratePage
  };

  return (
    <div className="create-container">
      <h1 className="title">Create a New Presentation</h1>
      <p className="subtitle">Start with a prompt, upload a document, or create from scratch.</p>
      
      <div className="button-group">
        <button className="create-btn" onClick={handleStartWithAI}>Start with AI</button>
        <button className="upload-btn">Upload Document</button>
        <button className="scratch-btn" onClick={togglePopup}>Import URL</button>
      </div>

      {/* Popup */}
      {isPopupVisible && (
        <div className="popup-overlay">
          <div className="popup-box">
            <h2>Import Presentation from URL</h2>
            <p>Enter the URL of the presentation you want to import:</p>
            <input type="text" placeholder="Enter URL here..." />
            <div className="popup-actions">
              <button className="cancel-btn" onClick={togglePopup}>Cancel</button>
              <button className="import-btn">Import</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePage;