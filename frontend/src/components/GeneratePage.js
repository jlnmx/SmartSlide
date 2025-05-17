import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import "../styles/GeneratePage.css";

const templates = [
  {
    id: "business_template.pptx",
    title: "Business",
    preview: "/images/business_preview.png",
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
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0].id);
  const [presentationType, setPresentationType] = useState("Default");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEditInGoogleSlides = async (slides) => {
  try {
    const response = await fetch("http://localhost:5000/create-google-slides", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slides }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData || "Failed to create Google Slides presentation.");
    }

    const data = await response.json();
    const presentationUrl = data.url;

    // Open the Google Slides presentation in a new tab
    window.open(presentationUrl, "_blank");
  } catch (error) {
    console.error("Error creating Google Slides presentation:", error);
    alert(error.message || "An error occurred while creating the Google Slides presentation.");
  }
};

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
        presentationType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData || "Failed to generate slides. Please try again.");
    }

    const data = await response.json();

    // Navigate to the slides-generating page and pass the slides
    navigate("/slides-generating", {
      state: {
        slides: data.slides, // Only pass serializable data
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
    <div style={{ background: "#e3f2ff", minHeight: "100vh" }}>
      <Navbar />
      <div className="generate-container">
        <h1 className="generate-title">Generate slides using SmartSlide</h1>
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
              <option>Russian</option>
              <option>Italian</option>
              <option>Portuguese</option>
              <option>Arabic</option>
              <option>Hindi</option>
              <option>Indonesian</option>
              <option>Vietnamese</option>
              <option>Thai</option>
              <option>Turkish</option>
              <option>Persian</option>
              <option>Swedish</option>
              <option>Dutch</option>
              <option>Norwegian</option>
              <option>Finnish</option>
              <option>Polish</option>
              <option>Czech</option>
              <option>Hungarian</option>
              <option>Romanian</option>
              <option>Bulgarian</option>
              <option>Ukrainian</option>
              <option>Greek</option>
              <option>Hebrew</option>
              <option>Malay</option>
              <option>Swahili</option>
            </select>
          </div>

          <div>
            <label>Number of Slides:</label>
            <select value={numSlides} onChange={(e) => setNumSlides(e.target.value)}>
              <option>5</option>
              <option>10</option>
              <option>15</option>
              <option>20</option>
              <option>25</option>
              <option>30</option>
              <option>35</option>
              <option>40</option>
              <option>45</option>
              <option>50</option>
            </select>
          </div>

          <div>
            <label>Presentation Type:</label>
            <select
              value={presentationType}
              onChange={(e) => setPresentationType(e.target.value)}
            >
              <option value="Default">Default</option>
              <option value="Tall">Tall</option>
              <option value="Traditional">Traditional</option>
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
};

export default GeneratePage;