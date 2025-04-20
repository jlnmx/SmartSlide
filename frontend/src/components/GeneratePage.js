import React, { useState } from "react";
import Navbar from "./Navbar"; // Import Navbar
import "../styles/GeneratePage.css";

const GeneratePage = () => {
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("English");
  const [numSlides, setNumSlides] = useState(5);
  const [presentationType, setPresentationType] = useState("Default");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResponse("");

    // Simulate AI response (Replace with actual API call)
    setTimeout(() => {
      setResponse(`Generating ${numSlides} slides in ${language} (${presentationType} format) for: "${prompt}"`);
      setLoading(false);
    }, 2000);
  };

  return (
    <div>
      <Navbar /> {/* Add Navbar */}
      <div className="generate-container">
        <h1 className="generate-title">Generate Slides using SmartSlide</h1>
        <p className="generate-subtitle">Enter a topic and let AI generate a structured presentation.</p>
        
        <div className="input-section">
          <input
            type="text"
            className="prompt-input"
            placeholder="Enter your topic..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="options-section">
          <label>Language:</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option>English</option>
            <option>Filipino</option>
            <option>French</option>
            <option>German</option>
            <option>Chinese</option>
            <option>Spanish</option>
            <option>Japanese</option>
          </select>
          
          <label>Number of Slides:</label>
          <input
            type="number"
            min="1"
            max="20"
            value={numSlides}
            onChange={(e) => setNumSlides(e.target.value)}
          />
          
          <label>Presentation Type:</label>
          <select value={presentationType} onChange={(e) => setPresentationType(e.target.value)}>
            <option>Default</option>
            <option>Tall</option>
            <option>Traditional</option>
          </select>
        </div>
        
        <button className="generate-btn" onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating..." : "Generate"}
        </button>
        
        {response && <p className="response-text">{response}</p>}
      </div>
    </div>
  );
};

export default GeneratePage;