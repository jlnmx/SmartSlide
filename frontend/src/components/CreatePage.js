import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import "../styles/CreatePage.css";

const CreatePage = () => {
  const navigate = useNavigate();

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
            UPLOAD DOCUMENT OR URL
          </button>
          <button className="scratch-btn" onClick={() => navigate("/paste-and-create")}>
            PASTE IN TEXT
          </button>
        </div>

        <a href="#" className="help-link">Need help?</a>
      </div>
    </div>
  );
};

export default CreatePage;