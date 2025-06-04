import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/UploadTemplates.css";
import config from "../config";

const UploadTemplates = () => {
  const navigate = useNavigate();
  const [templateName, setTemplateName] = useState("");
  const [templateFile, setTemplateFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [userTemplates, setUserTemplates] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.id) {
      navigate("/auth");
      return;
    }
    // Load user's custom templates
    loadUserTemplates();
  }, [navigate]);

  const loadUserTemplates = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const response = await fetch(`${config.API_BASE_URL}/user-templates/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setUserTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Error loading user templates:", error);
    }
  };

  const handleFileSelect = (file) => {
    // Validate file type
    if (!file.type.includes('png')) {
      setUploadStatus("Error: Only PNG images are allowed.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadStatus("Error: File size must be less than 5MB.");
      return;
    }

    setTemplateFile(file);
    setUploadStatus("");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!templateName.trim()) {
      setUploadStatus("Error: Please enter a template name.");
      return;
    }

    if (!templateFile) {
      setUploadStatus("Error: Please select a PNG image file.");
      return;
    }

    setIsUploading(true);
    setUploadStatus("");    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const formData = new FormData();
      formData.append("name", templateName.trim());
      formData.append("template", templateFile);
      formData.append("user_id", user.id);

      const response = await fetch(`${config.API_BASE_URL}/upload-template`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus("Success: Template uploaded successfully!");
        setTemplateName("");
        setTemplateFile(null);
        loadUserTemplates(); // Refresh the templates list
      } else {
        setUploadStatus(`Error: ${data.error || "Failed to upload template."}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("Error: Failed to upload template. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm("Are you sure you want to delete this template?")) {
      return;
    }    try {
      const response = await fetch(`${config.API_BASE_URL}/delete-template/${templateId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setUploadStatus("Template deleted successfully!");
        loadUserTemplates(); // Refresh the templates list
      } else {
        const data = await response.json();
        setUploadStatus(`Error: ${data.error || "Failed to delete template."}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      setUploadStatus("Error: Failed to delete template.");
    }
  };

  return (
    <div className="upload-templates-container">
      <div className="upload-templates-header">
        <button className="back-button" onClick={() => navigate("/dashboard")}>
          ← Back to Dashboard
        </button>
        <h1 className="upload-templates-title">Upload Custom Templates</h1>
      </div>

      <div className="upload-section">
        <div className="upload-form">
          <h2>Upload New Template</h2>
          <p className="upload-description">
            Upload your custom slide template as a PNG image. This will be available for selection when creating presentations.
          </p>

          <div className="form-group">
            <label htmlFor="templateName">Template Name:</label>
            <input
              type="text"
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Enter a name for your template"
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label>Template Image (PNG only):</label>
            <div
              className={`file-drop-area ${dragActive ? "drag-active" : ""}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".png"
                onChange={handleFileChange}
                className="file-input"
                id="templateFile"
              />
              <label htmlFor="templateFile" className="file-label">
                {templateFile ? (
                  <div className="file-selected">
                    <span>📄 {templateFile.name}</span>
                    <small>({(templateFile.size / 1024 / 1024).toFixed(2)} MB)</small>
                  </div>
                ) : (
                  <div className="file-placeholder">
                    <span className="upload-icon">📁</span>
                    <span>Drag & drop your PNG file here or click to browse</span>
                    <small>Max file size: 5MB</small>
                  </div>
                )}
              </label>
            </div>
          </div>

          {uploadStatus && (
            <div className={`status-message ${uploadStatus.startsWith("Error") ? "error" : "success"}`}>
              {uploadStatus}
            </div>
          )}

          <button
            className="upload-button"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Upload Template"}
          </button>
        </div>

        <div className="preview-section">
          {templateFile && (
            <div className="template-preview">
              <h3>Preview</h3>
              <img
                src={URL.createObjectURL(templateFile)}
                alt="Template preview"
                className="preview-image"
              />
            </div>
          )}
        </div>
      </div>

      <div className="user-templates-section">
        <h2>Your Custom Templates</h2>
        {userTemplates.length === 0 ? (
          <div className="no-templates">
            <p>You haven't uploaded any custom templates yet.</p>
          </div>
        ) : (
          <div className="templates-grid">
            {userTemplates.map((template) => (
              <div key={template.id} className="template-card">
                <img
                  src={template.imageUrl}
                  alt={template.name}
                  className="template-thumbnail"
                />
                <div className="template-info">
                  <h4>{template.name}</h4>
                  <small>Uploaded: {new Date(template.createdAt).toLocaleDateString()}</small>
                </div>
                <button
                  className="delete-template-button"
                  onClick={() => handleDeleteTemplate(template.id)}
                  title="Delete template"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadTemplates;