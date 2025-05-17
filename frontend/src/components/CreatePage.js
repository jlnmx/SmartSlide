import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import "../styles/CreatePage.css";

const CreatePage = () => {
  const navigate = useNavigate();

  const handleHelpClick = () => {
    navigate("/help");
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
          <button className="create-btn" onClick={() => navigate("/generate")}>
            GENERATE
          </button>
          <button className="upload-btn" onClick={() => navigate("/import")}>
            UPLOAD DOCUMENT
          </button>
          <button className="scratch-btn" onClick={() => navigate("/paste-and-create")}>
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