import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import "../styles/PasteAndCreate.css";

const PasteAndCreate = () => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplatePopup, setShowTemplatePopup] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5000/templates-list")
      .then((res) => res.json())
      .then((data) => {
        const allowed = ["abstract", "creative", "business", "education"];
        const filtered = (data.templates || []).filter(
          (t) => allowed.includes((t.title || t.name || "").toLowerCase())
        );
        setTemplates(filtered);
        if (filtered.length > 0 && !selectedTemplate) {
          setSelectedTemplate(filtered[0]);
        }
      });
  }, [selectedTemplate]);

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
      const response = await fetch("http://localhost:5000/paste-and-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, template: selectedTemplate.id }),
      });
      if (!response.ok) {
        throw new Error("Failed to generate slides.");
      }
      const data = await response.json();
      setResult(data.result || "Slides generated successfully!");
    } catch (error) {
      setResult(error.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-bg">
      <Navbar />
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
          {/* Template selection button and popup */}
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
              <div style={{ textAlign: "left", lineHeight: 1.2 }}>
                <span style={{ fontWeight: "bold", color: "#000" }}>
                  Selected:
                </span>
                <div style={{ color: "#222" }}>
                  {selectedTemplate.title || selectedTemplate.name}
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