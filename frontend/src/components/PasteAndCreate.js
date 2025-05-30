import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import "../styles/PasteAndCreate.css";
import config from "../config";


const templates = [    {
        id: "tailwind-abstract-gradient",
        name: "Abstract Gradient",
        preview: "/static/template_backgrounds/abstract_title.png"
    },
    {
        id: "tailwind-business",
        name: "Business",
        preview: "/static/template_backgrounds/business_title.png"
    },
    {
        id: "tailwind-creative",
        name: "Creative",
        preview: "/static/template_backgrounds/creative_title.png"
    },
    {
        id: "tailwind-education",
        name: "Education",
        preview: "/static/template_backgrounds/education_title.png"
    }
];

const PasteAndCreate = () => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplatePopup, setShowTemplatePopup] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (templates.length > 0) {
      setSelectedTemplate(templates[0]);
    }
  }, []); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      alert("Please paste or type some text.");
      return;
    }
    if (!selectedTemplate) {
      alert("Please select a template.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const user_id = user && user.id ? user.id : null;
      const response = await fetch(`${config.API_URL}/paste-and-create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, template: selectedTemplate.id, user_id }),
      });
      if (!response.ok) {
        setLoading(false);
        let errorMsg = "Failed to generate slides.";
        try {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
        } catch {}
        setResult(errorMsg);
        return;
      }
      const data = await response.json();
      if (data.slides) {
        navigate("/slides-generating", {
          state: {
            slides: data.slides,
            template: selectedTemplate,
            presentationType: "Default",
            isLoading: true,
          },
        });
      } else {
        setResult(data.error || "Failed to generate slides.");
      }
    } catch (error) {
      setResult(error.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-bg">
      <Navbar />
      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Generating slides... Please wait.</p>
        </div>
      )}
      <div className="page-wrapper">
        <div className="container">
          <h1 className="paste-title">Paste or Type Your Content</h1>
          <p>
            Paste your text below and SmartSlide will generate a presentation for
            you.
          </p>
          <form onSubmit={handleSubmit}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or type your content here..."
            />
            <button type="submit" disabled={loading}>
              {loading ? "Generating..." : "Generate Slides"}
            </button>
          </form>
          <div
            style={{
              margin: "1.5rem 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "18px",
            }}
          >
            <button
              type="button"
              className="generate-btn"
              onClick={() => setShowTemplatePopup(true)}
            >
              Choose Template
            </button>
            {selectedTemplate && (
              <div style={{ textAlign: "left", lineHeight: 1.2, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontWeight: "bold", color: "#000" }}>Selected:</span>
                <div style={{ color: "#222" }}>
                  {selectedTemplate.title || selectedTemplate.name}
                  <div style={{ marginTop: 4 }}>
                    <img
                      src={`/static/template_backgrounds/${selectedTemplate.id}_title.png`}
                      alt="Background preview"
                      style={{ width: 120, height: 68, objectFit: "cover", borderRadius: 8, border: "1px solid #ccc" }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          {showTemplatePopup && (
            <div
              className="template-popup-overlay"
              onClick={() => setShowTemplatePopup(false)}
            >
              <div
                className="template-popup"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 style={{ marginBottom: 16 }}>Select a Template</h2>
                <div className="template-list">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`template-box${
                        selectedTemplate && selectedTemplate.id === template.id
                          ? " selected"
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowTemplatePopup(false);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <img
                        src={template.preview || "/images/default_preview.png"}
                        alt={template.title || template.name}
                        className="template-preview"
                      />
                      <p className="template-title">
                        {template.title || template.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {result && <div className="result">{result}</div>}
        </div>
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