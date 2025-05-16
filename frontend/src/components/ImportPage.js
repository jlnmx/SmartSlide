import React, { useState } from "react";
import Navbar from "./Navbar";
import "../styles/ImportPage.css";
import { useNavigate } from "react-router-dom";

export default function ImportPage() {
  const [file, setFile] = useState(null);
  const navigate = useNavigate();

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
      if (
        response.ok &&
        contentType &&
        contentType.includes(
          "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )
      ) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "converted_presentation.pptx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setFile(null);
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

  return (
    <div>
      <Navbar />
      <div className="import-paste-container">
        <div className="import-paste-box">
          <h1 className="title">Import a Document</h1>
          <p className="subtitle">
            Upload a document to create a presentation.
          </p>
          <div className="import-paste-form">
            <input
              type="file"
              className="paste-file-input"
              accept=".pdf,.docx,.xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files[0])}
            />
            <button
              className="import-btn"
              onClick={handleImportFile}
              disabled={!file}
            >
              Upload File
            </button>
          </div>
        </div>
        {/* Help button with Message icon at bottom right */}
        <button
          className="need-help-btn"
          onClick={() => navigate("/help")}
          title="Need Help?"
          aria-label="Need Help"
        />
      </div>
    </div>
  );
}