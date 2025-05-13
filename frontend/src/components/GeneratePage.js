import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import "../styles/GeneratePage.css";

const templates = [
  {
    id: "business_template.pptx",
    title: "Business",
    preview: "/images/business_preview.png", // Replace with actual preview image paths
  },
  {
    id: "education_template.pptx",
    title: "Education",
    preview: "/images/education_preview.png",
  },
  {
    id: "creative_template.pptx",
    title: "Creative",
    preview: "/images/creative_preview.png",
  },
  {
    id: "modern_template.pptx",
    title: "Modern",
    preview: "/images/modern_preview.png",
  },
  {
    id: "abstract_template.pptx",
    title: "Abstract",
    preview: "/images/abstract_preview.png",
  },
  {
    id: "minimal_template.pptx",
    title: "Minimal",
    preview: "/images/minimal_preview.png",
  },
];

const GeneratePage = () => {
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("English");
  const [numSlides, setNumSlides] = useState("5");
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0].id); // Default to the first template
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert("Please enter a topic.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/generate-slides", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          language,
          numSlides: parseInt(numSlides),
          template: selectedTemplate, // Include the selected template
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate slides. Please try again.");
      }

      const data = await response.json();

      navigate("/slides-generating", {
        state: {
          slides: data.slides,
          template: selectedTemplate, // Pass the selected template to the next page
        },
      });
    } catch (error) {
      console.error("Error generating slides:", error);
      alert(error.message || "An error occurred while generating slides.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="generate-container">
        <h1 className="generate-title">GENERATE SLIDES USING SMARTSLIDE</h1>
        <p className="generate-subtitle">
          Enter a topic and select a template to generate a structured presentation.
        </p>

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
          <div>
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
          </div>

          <div>
            <label>Number of Slides:</label>
            <select value={numSlides} onChange={(e) => setNumSlides(e.target.value)}>
              <option>5</option>
              <option>10</option>
              <option>15</option>
              <option>20</option>
            </select>
          </div>
        </div>

        <h2 className="template-selection-title">Select a Template</h2>
        <div className="template-selection">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`template-box ${
                selectedTemplate === template.id ? "selected" : ""
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <img
                src={template.preview}
                alt={`${template.title} Template`}
                className="template-preview"
              />
              <p className="template-title">{template.title}</p>
            </div>
          ))}
        </div>

        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate"}
        </button>

        <a href="#" className="help-link">
          Need help?
        </a>
      </div>
    </div>
  );
};

export default GeneratePage;