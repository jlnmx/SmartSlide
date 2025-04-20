import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import "../styles/CreatePage.css";

const CreatePage = () => {
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const navigate = useNavigate();

  const togglePopup = () => {
    setIsPopupVisible(!isPopupVisible);
  };

  const handleStartWithAI = () => {
    navigate("/generate");
  };

  const handleUploadDocument = () => {
    navigate("/import");
  };

  const handlePasteAndCreate = () => {
    navigate("/paste-and-create");
  };

  return (
    <div>
      <Navbar />
      <div className="create-container">
        <h1 className="title">Create a New Presentation</h1>
        <p className="subtitle">Start with a prompt, upload a document, or create from scratch.</p>
        
        <div className="button-group">
          <button className="create-btn" onClick={handleStartWithAI}>Generate</button>
          <button className="upload-btn" onClick={handleUploadDocument}>Upload Document and URL</button>
          <button className="scratch-btn" onClick={handlePasteAndCreate}>Paste in Text</button>
        </div>

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
    </div>
  );
};

export default CreatePage;