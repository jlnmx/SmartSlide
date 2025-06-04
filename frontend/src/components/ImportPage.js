import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import "../styles/ImportPage.css";
import { useNavigate, useLocation } from "react-router-dom";
import config from "../config";
import { getAllTemplates, getCurrentUserId } from "../utils/templateUtils";

export default function ImportPage() {
  const [file, setFile] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const passedTemplate = location.state && location.state.selectedTemplate;
  const [selectedTemplate, setSelectedTemplate] = useState(passedTemplate || null);
  const [showTemplatePopup, setShowTemplatePopup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

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

  const handleImportFile = async () => {
    if (!file) {
      alert("Please select a file.");
      return;
    }
    if (!selectedTemplate) {
      alert("Please select a template.");
      return;
    }
    try {
      setIsLoading(true);
      const formData = new FormData();
      const user = JSON.parse(localStorage.getItem("user"));
      const user_id = user && user.id ? user.id : null;
      if (user_id) {
        formData.append("user_id", user_id);
      }
      formData.append("file", file);
      formData.append("template", selectedTemplate.id);
      const response = await fetch(`${config.API_BASE_URL}/upload-file`, {
        method: "POST",
        body: formData,
      });
      setIsLoading(false);
      if (!response.ok) {
        let errorMsg = "Failed to upload file.";
        try {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
        } catch {}
        alert(errorMsg);
        return;
      }
      const data = await response.json();
      if (data.slides) {
        const user = JSON.parse(localStorage.getItem("user"));
        const user_id = user && user.id ? user.id : null;
        if (user_id) {
          await fetch(`${config.API_BASE_URL}/save-presentation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id,
              title: file.name,
              slides: data.slides,
              template: selectedTemplate.id, 
              presentationType: "Default",
            }),
          });
        }
        navigate("/slides-generating", {
          state: {
            slides: data.slides,
            template: selectedTemplate,
            presentationType: "Default",
            isLoading: true
          },
        });
      } else {
        alert(data.error || "Failed to convert file.");
      }
    } catch (error) {
      setIsLoading(false);
      alert(error.message || "Error uploading file.");
    }
  };

  return (
    <div>
      <Navbar />
      {isLoading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Generating slides... Please wait.</p>
        </div>
      )}
      <div className="import-paste-container">
        <div className="import-paste-box">
          <h1 className="title">Import a Document</h1>
          <p className="subtitle">
            Upload a document to create a presentation.
          </p>

          <div style={{
            margin: "1.5rem 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "18px"
          }}>
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
                  {selectedTemplate.title || selectedTemplate.name}                  <div style={{ marginTop: 4 }}>
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
            <div className="template-popup-overlay" onClick={() => setShowTemplatePopup(false)}>
              <div
                className="template-popup"
                onClick={e => e.stopPropagation()}              >
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
                        className={`template-box${selectedTemplate && selectedTemplate.id === template.id ? " selected" : ""}`}
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
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="import-paste-form">
            <input
              type="file"
              className="paste-file-input"
              accept=".pdf,.docx,.xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files[0])}
            />
            <button
              className="import-btn"
              onClick={handleImportFile}
              disabled={!file}
            >
              Upload File
            </button>
          </div>
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
}