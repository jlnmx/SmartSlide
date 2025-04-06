import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import "../styles/CreatePage.css";

const CreatePage = () => {
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const navigate = useNavigate(); // Initialize useNavigate

  const togglePopup = () => {
    setIsPopupVisible(!isPopupVisible);
  };

  const handleStartWithAI = () => {
    navigate("/generate"); // Navigate to the GeneratePage
  };

  const handleUploadDocument = () => {
    navigate("/import"); // Navigate to the ImportPage
  };

  const handlePasteAndCreate = () => {
    navigate("/paste-and-create"); // Navigate to the PasteAndCreate page
  };

  return (
    <div className="create-container">
      <h1 className="title">Create a New Presentation</h1>
      <p className="subtitle">Start with a prompt, upload a document, or create from scratch.</p>
      
      <div className="button-group">
        <button className="create-btn" onClick={handleStartWithAI}>Generate</button>
        <button className="upload-btn" onClick={handleUploadDocument}>Upload Document and URL</button>
        <button className="scratch-btn" onClick={handlePasteAndCreate}>Paste in Text</button>
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