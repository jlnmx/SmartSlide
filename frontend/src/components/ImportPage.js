import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import "../styles/ImportPage.css";
import { useNavigate, useLocation } from "react-router-dom";

export default function ImportPage() {
  const [file, setFile] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const passedTemplate = location.state && location.state.selectedTemplate;
  const [selectedTemplate, setSelectedTemplate] = useState(passedTemplate || null);
  const [templates, setTemplates] = useState([]);

  // Fetch templates from backend if not passed
  useEffect(() => {
    if (!passedTemplate) {
      fetch("http://localhost:5000/templates-list")
        .then((res) => res.json())
        .then((data) => {
          setTemplates(data.templates || []);
          if (data.templates && data.templates.length > 0) {
            setSelectedTemplate(data.templates[0]);
          }
        });
    }
  }, [passedTemplate]);

  // Handle Upload button click for File
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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("template", selectedTemplate.id);
      // Always expect slides, never download pptx directly
      const response = await fetch("http://localhost:5000/upload-file", {
        method: "POST",
        body: formData,
      });
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
        // Save imported presentation to backend if user is logged in
        const user = JSON.parse(localStorage.getItem("user"));
        const user_id = user && user.id ? user.id : null;
        if (user_id) {
          await fetch("http://localhost:5000/save-presentation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id,
              title: file.name,
              slides: data.slides,
              template: selectedTemplate.id, // send only the id
              presentationType: "Default",
            }),
          });
        }
        // Navigate to SlidesGeneratingPage with slides, template, and presentationType
        navigate("/slides-generating", {
          state: {
            slides: data.slides,
            template: selectedTemplate,
            presentationType: "Default",
          },
        });
      } else {
        alert(data.error || "Failed to convert file.");
      }
    } catch (error) {
      alert(error.message || "Error uploading file.");
    }
  };

  return (
    <div>
      <Navbar />
      <div className="import-paste-container">
        <div className="import-paste-box">
          <h1 className="title">Import a Document</h1>
          <p className="subtitle">
            Upload a document to create a presentation.
          </p>
          {/* Template selection UI if not passed */}
          {!passedTemplate && templates.length > 0 && (
            <div style={{ margin: "1.5rem 0", textAlign: "center" }}>
              <h3 style={{ marginBottom: 8 }}>Select a Template</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className={`template-box${selectedTemplate && selectedTemplate.id === tpl.id ? " selected" : ""}`}
                    style={{
                      border: selectedTemplate && selectedTemplate.id === tpl.id ? "2px solid #007bff" : "1px solid #ccc",
                      borderRadius: 8,
                      padding: 8,
                      cursor: "pointer",
                      width: 140,
                      background: "#fff",
                    }}
                    onClick={() => setSelectedTemplate(tpl)}
                  >
                    <img
                      src={tpl.preview || "/images/default_preview.png"}
                      alt={tpl.name}
                      style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 6, marginBottom: 6 }}
                    />
                    <div style={{ fontWeight: "bold", fontSize: 15 }}>{tpl.name}</div>
                    <div style={{ color: "#555", fontSize: 13 }}>{tpl.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Show only the selected template if passed from Templates.js or selected */}
          {selectedTemplate && (
            <div
              className="selected-template-info"
              style={{ margin: "1.5rem 0", textAlign: "center" }}
            >
              <img
                src={selectedTemplate.preview || "/images/default_preview.png"}
                alt={selectedTemplate.title || selectedTemplate.name}
                style={{ width: 180, borderRadius: 8, marginBottom: 8 }}
              />
              <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
                {selectedTemplate.title || selectedTemplate.name}
              </div>
              <div style={{ color: "#555" }}>
                {selectedTemplate.description}
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
}