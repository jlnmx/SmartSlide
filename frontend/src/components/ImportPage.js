import React, { useState } from "react";
import Navbar from "./Navbar";
import "../styles/ImportPage.css";
import { useNavigate } from "react-router-dom";

export default function ImportPage() {
  const [popupType, setPopupType] = useState(null);
  const [topic, setTopic] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const navigate = useNavigate();

  const closePopup = () => {
    setPopupType(null);
    setTopic("");
    setUrl("");
    setFile(null);
  };

  // Handle Import button click for URL
  const handleImportUrl = async () => {
    if (!url) {
      alert("Please enter a URL.");
      return;
    }
    try {
      const response = await fetch("http://localhost:5000/import-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (response.ok) {
        navigate("/slides-generating", { state: { slides: data.slides } });
      } else {
        alert(data.error || "Failed to import from URL.");
      }
    } catch (error) {
      alert("Error importing from URL.");
    }
  };

  // Handle Upload button click for File
  const handleImportFile = async () => {
    if (!file) {
      alert("Please select a file.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:5000/upload-file", {
        method: "POST",
        body: formData,
      });

      // If backend returns a PowerPoint file, download it
      const contentType = response.headers.get("content-type");
      if (response.ok && contentType && contentType.includes("application/vnd.openxmlformats-officedocument.presentationml.presentation")) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "converted_presentation.pptx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        closePopup();
      } else {
        // If backend returns JSON (error or slides), handle accordingly
        const data = await response.json();
        if (data.slides) {
          navigate("/slides-generating", { state: { slides: data.slides } });
        } else {
          alert(data.error || "Failed to convert file.");
        }
      }
    } catch (error) {
      alert("Error uploading file.");
    }
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
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </>
        );
      case "url":
        return (
          <>
            <h2 className="popup-title">Import from URL</h2>
            <p className="popup-description">
              This will extract the text from the webpage, Google Doc, Google Slides, or video you enter.
            </p>
            <input
              type="text"
              className="popup-input"
              placeholder="http://www.example.com/"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
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
              accept=".pdf,.docx,.xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </>
        );
      default:
        return null;
    }
  };

  // Choose which handler to use for the Import/Generate/Upload button
  const handleImport = () => {
    if (popupType === "url") {
      handleImportUrl();
    } else if (popupType === "file") {
      handleImportFile();
    } else {
      closePopup();
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
                <button className="import-btn" onClick={handleImport}>
                  {popupType === "file"
                    ? "Upload"
                    : popupType === "url"
                    ? "Import"
                    : "Generate"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}