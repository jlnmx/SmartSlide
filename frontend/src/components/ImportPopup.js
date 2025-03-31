import React, { useState } from "react";
import "../styles/ImportPopup.css";

const ImportPopup = ({ onClose }) => {
  const [url, setUrl] = useState("");

  const handleImport = () => {
    if (url.trim() === "") return;
    console.log("Importing from URL:", url);
    onClose();
  };

  return (
    <div className="popup-overlay">
      <div className="popup-box">
        <h2>Import from URL</h2>
        <p>Paste a link to an article, document, or webpage.</p>
        <input
          type="text"
          placeholder="Enter URL here"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <div className="popup-actions">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="import-btn" onClick={handleImport}>Import</button>
        </div>
      </div>
    </div>
  );
};

const ImportButton = () => {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <div>
      <button className="import-url-btn" onClick={() => setShowPopup(true)}>
        Import URL
      </button>
      {showPopup && <ImportPopup onClose={() => setShowPopup(false)} />}
    </div>
  );
};

export default ImportButton;
