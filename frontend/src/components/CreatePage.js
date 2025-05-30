import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import "../styles/CreatePage.css";


const CreatePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedTemplate = location.state && location.state.selectedTemplate;

  const handleHelpClick = () => {
    navigate("/help");
  };

  const handleGenerate = () => {
    navigate("/generate", { state: { selectedTemplate } });
  };
  const handleUpload = () => {
    navigate("/import", { state: { selectedTemplate } });
  };
  const handlePaste = () => {
    navigate("/paste-and-create", { state: { selectedTemplate } });
  };

  return (
    <div>
      <Navbar />
      <div className="create-container">
        <h1 className="title">CREATE A NEW PRESENTATION</h1>
        <p className="subtitle">
          Start with a prompt, upload a document, or create from scratch.
        </p>

        <div className="button-group">
          <button className="create-btn" onClick={handleGenerate}>
            GENERATE
          </button>
          <button className="upload-btn" onClick={handleUpload}>
            UPLOAD DOCUMENT
          </button>
          <button className="scratch-btn" onClick={handlePaste}>
            PASTE IN TEXT
          </button>
        </div>
      </div>
      {/* Help button with Message icon at bottom right */}
      <button
        className="need-help-btn"
        onClick={handleHelpClick}
        title="Need Help?"
        aria-label="Need Help"
      />
    </div>
  );
};

export default CreatePage;