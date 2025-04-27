import React from "react";
import Navbar from "./Navbar";
import "../styles/CreatePage.css";

const CreatePage = () => {
  return (
    <div>
      <Navbar />
      <div className="create-container">
        <h1 className="title">CREATE A NEW PRESENTATION</h1>
        <p className="subtitle">
          Start with a prompt, upload a document, or create from scratch.
        </p>

        <div className="button-group">
          <button className="create-btn">GENERATE</button>
          <button className="upload-btn">UPLOAD DOCUMENT OR URL</button>
          <button className="scratch-btn">PASTE IN TEXT</button>
        </div>

        <a href="#" className="help-link">Need help?</a>
      </div>
    </div>
  );
};

export default CreatePage;