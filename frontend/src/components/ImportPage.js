import React, { useState } from "react";
import Navbar from "./Navbar";
import "../styles/ImportPage.css";

export default function ImportPage() {
  const [popupType, setPopupType] = useState(null);

  const closePopup = () => {
    setPopupType(null);
  };

  const renderPopupContent = () => {
    switch (popupType) {
      case "topic":
        return (
          <>
            <h2 className="popup-title">Start from a Topic</h2>
            <p className="popup-description">
              Enter your topic to generate a presentation.
            </p>
            <input
              type="text"
              className="popup-input"
              placeholder="Enter your topic"
              onChange={(e) => console.log("Topic:", e.target.value)}
            />
          </>
        );
      case "url":
        return (
          <>
            <h2 className="popup-title">Import from URL</h2>
            <p className="popup-description">
              This will extract the text from the webpage you enter.
            </p>
            <input
              type="text"
              className="popup-input"
              placeholder="http://www.example.com/"
              onChange={(e) => console.log("URL:", e.target.value)}
            />
          </>
        );
      case "file":
        return (
          <>
            <h2 className="popup-title">Upload a File</h2>
            <p className="popup-description">
              Choose a file to upload and generate a presentation.
            </p>
            <input
              type="file"
              className="popup-input"
              accept=".pdf,.docx,.pptx"
              onChange={(e) => console.log("File:", e.target.files[0])}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <Navbar />
      <div className="import-container">
        <div className="import-box">
          <h1 className="title">Create with SmartSlide</h1>
          <div className="card-container">
            <div className="card" onClick={() => setPopupType("topic")}>
              <h2>START FROM A TOPIC</h2>
              <p>Generate a presentation by entering a topic.</p>
              <button className="card-btn">TYPE TOPIC</button>
            </div>

            <div className="card" onClick={() => setPopupType("url")}>
              <h2>PASTE A LINK</h2>
              <p>Import content from a URL to generate slides.</p>
              <button className="card-btn">PASTE LINK</button>
            </div>

            <div className="card" onClick={() => setPopupType("file")}>
              <h2>UPLOAD A FILE</h2>
              <p>Upload a document to create a presentation.</p>
              <button className="card-btn">UPLOAD FILE</button>
            </div>
          </div>
          <a href="#" className="help-link">Need help?</a>
        </div>

        {popupType && (
          <div className="popup-overlay">
            <div className="popup-box">
              {renderPopupContent()}
              <div className="popup-actions">
                <button className="cancel-btn" onClick={closePopup}>
                  Cancel
                </button>
                <button className="import-btn" onClick={closePopup}>
                  {popupType === "file" ? "Upload" : popupType === "url" ? "Import" : "Generate"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}