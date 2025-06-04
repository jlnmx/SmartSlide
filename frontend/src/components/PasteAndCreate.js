import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import "../styles/PasteAndCreate.css";
import config from "../config";
import { getAllTemplates, getCurrentUserId } from "../utils/templateUtils";

const PasteAndCreate = () => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplatePopup, setShowTemplatePopup] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadTemplates = async () => {
      setTemplatesLoading(true);
      try {
        const userId = getCurrentUserId();
        const allTemplates = await getAllTemplates(userId);
        setTemplates(allTemplates);
        
        // Set default template if none selected
        if (!selectedTemplate && allTemplates.length > 0) {
          setSelectedTemplate(allTemplates[0]);
        }
      } catch (error) {
        console.error('Error loading templates:', error);
      } finally {
        setTemplatesLoading(false);
      }
    };

    loadTemplates();
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
      const user = JSON.parse(localStorage.getItem("user"));
      const user_id = user && user.id ? user.id : null;
      const response = await fetch(`${config.API_BASE_URL}/paste-and-create`, {
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
            {selectedTemplate && (            <div style={{ textAlign: "left", lineHeight: 1.2, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontWeight: "bold", color: "#000" }}>Selected:</span>
                <div style={{ color: "#222" }}>
                  {selectedTemplate.title || selectedTemplate.name}
                  <div style={{ marginTop: 4 }}>
                    <img
                      src={selectedTemplate.type === 'custom' 
                        ? selectedTemplate.preview 
                        : `/static/template_backgrounds/${selectedTemplate.id}_title.png`}
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
            >              <div
                className="template-popup"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 style={{ marginBottom: 16 }}>Select a Template</h2>
                {templatesLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #f3f3f3', borderTop: '2px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ marginTop: '10px' }}>Loading templates...</p>
                  </div>
                ) : (
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
                          src={template.type === 'custom' 
                            ? template.preview 
                            : (template.preview || "/images/default_preview.png")}
                          alt={template.title || template.name}
                          className="template-preview"
                        />
                        <p className="template-title">
                          {template.title || template.name}
                          {template.type === 'custom' && (
                            <span style={{ 
                              fontSize: '0.7em', 
                              color: '#666', 
                              display: 'block', 
                              fontWeight: 'normal' 
                            }}>
                              Custom
                            </span>
                          )}                        </p>
                      </div>
                    ))}
                  </div>
                )}
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