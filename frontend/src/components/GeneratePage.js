import React, { useState } from "react";
import "../styles/GeneratePage.css";

const GeneratePage = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResponse("");
    
    setTimeout(() => {
      setResponse(`Generating slides for: "${prompt}"`);
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="generate-container">
      <h1 className="generate-title">Generate AI-Powered Slides</h1>
      <p className="generate-subtitle">Enter a topic and let AI generate a structured presentation.</p>
      
      <div className="input-section">
        <input
          type="text"
          className="prompt-input"
          placeholder="Enter your topic..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button className="generate-btn" onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>
      
      {response && <p className="response-text">{response}</p>}
    </div>
  );
};

export default GeneratePage;
