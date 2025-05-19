import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import "../styles/PasteAndCreate.css";

// Template definitions (should match backend templates_config.py)
const templates = [
  {
    id: "business_template",
    name: "Business",
    description: "A professional, clean template for business presentations.",
    preview: "/images/business_preview.png",
  },
  {
    id: "education_template",
    name: "Education",
    description: "A template designed for school or academic presentations.",
    preview: "/images/education_preview.png",
  },
  {
    id: "creative_template",
    name: "Creative",
    description: "A vibrant, visually engaging template for creative presentations.",
    preview: "/images/creative_preview.png",
  },
  {
    id: "modern_template",
    name: "Modern",
    description: "A sleek, minimal template for modern presentations.",
    preview: "/images/modern_preview.png",
  },
  {
    id: "abstract_template",
    name: "Abstract",
    description: "A template with artistic and unique color combinations.",
    preview: "/images/abstract_preview.png",
  },
  {
    id: "minimal_template",
    name: "Minimal",
    description: "A simple, elegant template for minimal presentations.",
    preview: "/images/minimal_preview.png",
  },
  {
    id: "business_plan",
    name: "Business Plan",
    description: "A template for business plans.",
    preview: "/images/business_plan_preview.png",
  },
  {
    id: "marketing_strategy",
    name: "Marketing Strategy",
    description: "A template for marketing strategies.",
    preview: "/images/marketing_strategy_preview.png",
  },
  {
    id: "sales_pitch",
    name: "Sales Pitch",
    description: "A template for sales pitches.",
    preview: "/images/sales_pitch_preview.png",
  },
  {
    id: "lesson_plan",
    name: "Lesson Plan",
    description: "A template for lesson plans.",
    preview: "/images/lesson_plan_preview.png",
  },
  {
    id: "research_presentation",
    name: "Research Presentation",
    description: "A template for research presentations.",
    preview: "/images/research_presentation_preview.png",
  },
  {
    id: "classroom_activity",
    name: "Classroom Activity",
    description: "A template for classroom activities.",
    preview: "/images/classroom_activity_preview.png",
  },
  {
    id: "portfolio_showcase",
    name: "Portfolio Showcase",
    description: "A template for showcasing portfolios.",
    preview: "/images/portfolio_showcase_preview.png",
  },
  {
    id: "storytelling",
    name: "Storytelling",
    description: "A template for storytelling presentations.",
    preview: "/images/storytelling_preview.png",
  },
  {
    id: "design_proposal",
    name: "Design Proposal",
    description: "A template for design proposals.",
    preview: "/images/design_proposal_preview.png",
  },
];

const PasteAndCreate = () => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [slides, setSlides] = useState(null);
  const [result, setResult] = useState(null);
  const [showTemplatePopup, setShowTemplatePopup] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0].id);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      alert("Please paste or type some text.");
      return;
    }
    setLoading(true);
    setResult(null);
    setSlides(null);
    try {
      const response = await fetch("http://localhost:5000/paste-and-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        throw new Error("Failed to generate slides.");
      }
      const data = await response.json();
      setSlides(data.slides || []);
      setResult(data.result || "Slides generated successfully!");
    } catch (error) {
      setResult(error.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleUseSlides = () => {
    if (slides && slides.length > 0) {
      navigate("/slides-generating", {
        state: {
          slides,
          template: selectedTemplate,
          presentationType: "Default",
        },
      });
    }
  };

  const handleOpenTemplatePopup = () => setShowTemplatePopup(true);
  const handleCloseTemplatePopup = () => setShowTemplatePopup(false);

  const handleSelectTemplate = (id) => {
    setSelectedTemplate(id);
    setShowTemplatePopup(false);
  };

  const selectedTemplateObj = templates.find(t => t.id === selectedTemplate);

  return (
    <div>
      <Navbar />
      <div className="page-wrapper">
        <div className="container">
          <h1 className="paste-title">Paste or Type Your Content</h1>
          <p>
            Paste your text below and SmartSlide will generate a presentation for you.
          </p>
          <form onSubmit={handleSubmit}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or type your content here..."
            />
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1rem" }}>
              <button type="submit" disabled={loading}>
                {loading ? "Generating..." : "Generate Slides"}
              </button>
              <button
                type="button"
                className="template-select-btn"
                onClick={handleOpenTemplatePopup}
                style={{
                  background: "#e3f2ff",
                  border: "1px solid #1976d2",
                  color: "#1976d2",
                  borderRadius: "4px",
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                }}
              >
                Choose Template
              </button>
              <span style={{ fontSize: "0.95rem" }}>
                <b>Selected:</b> {selectedTemplateObj ? selectedTemplateObj.name : ""}
              </span>
            </div>
          </form>
          {result && <div className="result">{result}</div>}
          {slides && slides.length > 0 && (
            <div className="slides-preview">
              <h2>Preview Slides</h2>
              <ol>
                {slides.map((slide, idx) => (
                  <li key={idx}>
                    <b>{slide.title}</b>
                    <div>
                      {Array.isArray(slide.content)
                        ? slide.content.join(" ")
                        : slide.content}
                    </div>
                  </li>
                ))}
              </ol>
              <button className="generate-btn" onClick={handleUseSlides}>
                Use These Slides
              </button>
            </div>
          )}
        </div>
        {/* Template Selection Popup */}
        {showTemplatePopup && (
          <div className="template-popup-overlay">
            <div className="template-popup">
              <h2>Select a Template</h2>
              <div className="template-list">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`template-box${selectedTemplate === template.id ? " selected" : ""}`}
                    onClick={() => handleSelectTemplate(template.id)}
                    style={{
                      border: selectedTemplate === template.id ? "2px solid #1976d2" : "1px solid #ccc",
                      borderRadius: "6px",
                      padding: "0.5rem",
                      margin: "0.5rem",
                      cursor: "pointer",
                      width: "160px",
                      display: "inline-block",
                      background: "#fff",
                      boxShadow: selectedTemplate === template.id ? "0 0 8px #1976d2" : "none",
                    }}
                  >
                    <img
                      src={template.preview}
                      alt={template.name}
                      style={{ width: "100%", borderRadius: "4px" }}
                    />
                    <div style={{ fontWeight: "bold", marginTop: "0.5rem" }}>{template.name}</div>
                    <div style={{ fontSize: "0.9rem", color: "#555" }}>{template.description}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleCloseTemplatePopup}
                style={{
                  marginTop: "1rem",
                  background: "#1976d2",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "0.5rem 1.5rem",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
            <div
              className="template-popup-backdrop"
              onClick={handleCloseTemplatePopup}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0,0,0,0.2)",
                zIndex: 99,
              }}
            />
          </div>
        )}
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

export default PasteAndCreate;