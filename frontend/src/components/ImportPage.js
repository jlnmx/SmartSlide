import React, { useState } from 'react';
import Navbar from "./Navbar";
import '../styles/ImportPage.css';
import '../styles/Popup.css'; 

export default function ImportPage() {
  const [popupType, setPopupType] = useState(null);

  const closePopup = () => {
    setPopupType(null);
  };

  return (
    <div>
      <Navbar />
      <div className="import-container">
        <h1 className="title">Create with SmartSlide</h1>
        <div className="card-container">
          <div className="card" onClick={() => setPopupType('topic')}>
            <h2>Start from a Topic</h2>
            <p>Generate a presentation by entering a topic.</p>
          </div>

          <div className="card" onClick={() => setPopupType('url')}>
            <h2>Paste a Link</h2>
            <p>Import content from a URL to generate slides.</p>
          </div>

          <div className="card" onClick={() => setPopupType('file')}>
            <h2>Upload a File</h2>
            <p>Upload a document to create a presentation.</p>
          </div>
        </div>

        {popupType === 'topic' && (
          <div className="popup-overlay">
            <div className="popup-box">
              <h2>Start from a Topic</h2>
              <p>Enter your topic to generate a presentation:</p>
              <input
                type="text"
                placeholder="Enter your topic"
                onChange={(e) => console.log('Topic:', e.target.value)}
              />
              <div className="popup-actions">
                <button className="cancel-btn" onClick={closePopup}>Cancel</button>
                <button className="import-btn" onClick={closePopup}>Generate</button>
              </div>
            </div>
          </div>
        )}

        {popupType === 'url' && (
          <div className="popup-overlay">
            <div className="popup-box">
              <h2>Paste a Link</h2>
              <p>Enter the URL to import content:</p>
              <input
                type="text"
                placeholder="Enter URL here"
                onChange={(e) => console.log('URL:', e.target.value)}
              />
              <div className="popup-actions">
                <button className="cancel-btn" onClick={closePopup}>Cancel</button>
                <button className="import-btn" onClick={closePopup}>Import</button>
              </div>
            </div>
          </div>
        )}

        {popupType === 'file' && (
          <div className="popup-overlay">
            <div className="popup-box">
              <h2>Upload a File</h2>
              <p>Choose a file to upload:</p>
              <input
                type="file"
                accept=".pdf,.docx,.pptx"
                onChange={(e) => console.log('File:', e.target.files[0])}
              />
              <div className="popup-actions">
                <button className="cancel-btn" onClick={closePopup}>Cancel</button>
                <button className="import-btn" onClick={closePopup}>Upload</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}