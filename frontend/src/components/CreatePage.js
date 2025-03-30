import React from "react";
import { Link } from "react-router-dom";
import "../styles/CreatePage.css";

const CreatePage = () => {
  return (
    <div className="create-container">
      <h1 className="title">Create a New Presentation</h1>
      <p className="subtitle">Start with a prompt, upload a document, or create from scratch.</p>
      
      <div className="button-group">
        <Link to="/generate">
          <button className="create-btn">Start with AI</button>
        </Link>
        <button className="upload-btn">Upload Document</button>
        <button className="scratch-btn">Create from Scratch</button>
      </div>
    </div>
  );
};

export default CreatePage;