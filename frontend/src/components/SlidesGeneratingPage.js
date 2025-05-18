import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "../styles/SlidesGeneratingPage.css";

const SlidesGeneratingPage = () => {
  const location = useLocation();
  let { slides, template, presentationType } = location.state || {};

  // Fallback: Load template and presentationType from localStorage if missing (for refresh/direct nav)
  if (!template) {
    try {
      template = JSON.parse(localStorage.getItem("selectedTemplate"));
    } catch {
      template = null;
    }
  }
  if (!presentationType) {
    presentationType = localStorage.getItem("presentationType") || "Default";
  }

  const [isLoading, setIsLoading] = useState(true);
  const [generatedSlides, setGeneratedSlides] = useState([]);

  useEffect(() => {
    if (!slides || slides.length === 0) {
      setIsLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      setGeneratedSlides(slides);
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [slides]);

  const handleEditInGoogleSlides = async () => {
    if (!template) {
      alert("Template information is missing. Please go back and select a template.");
      return;
    }
    try {
      const response = await fetch("http://localhost:5000/create-google-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides: generatedSlides,
          template: typeof template === "object" ? template.id : template,
          presentationType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create Google Slides presentation.");
      }

      const data = await response.json();
      const presentationUrl = data.url;

      window.open(presentationUrl, "_blank");
    } catch (error) {
      alert(error.message || "An error occurred while creating the Google Slides presentation.");
    }
  };

  const handleDownload = async () => {
    if (!template) {
      alert("Template information is missing. Please go back and select a template.");
      return;
    }
    try {
      const response = await fetch("http://localhost:5000/generate-presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides: generatedSlides,
          template: typeof template === "object" ? template.id : template,
          presentationType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate the presentation.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "generated_presentation.pptx";
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message || "An error occurred while generating the presentation.");
    }
  };

  const getTemplateInfo = () => {
    if (!template) return null;
    if (typeof template === "object") {
      return (
        <div className="selected-template-info">
          <span className="selected-template-label">Selected Template:</span>
          <b>{template.name || template.title}</b>
          {template.description && (
            <span className="selected-template-desc">{template.description}</span>
          )}
        </div>
      );
    }
    return (
      <div className="selected-template-info">
        <span className="selected-template-label">Selected Template:</span>
        <b>{template}</b>
      </div>
    );
  };

  const renderSlideContent = (content) => {
    if (Array.isArray(content)) {
      return (
        <ul className="slide-bullets">
          {content.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      );
    }
    if (typeof content === "string") {
      return <div className="slide-desc">{content}</div>;
    }
    return null;
  };

  return (
    <div className="slides-preview-root">
      {getTemplateInfo()}
      <h2 className="outline-title">Outline</h2>
      <button className="edit-google-slides-btn" onClick={handleEditInGoogleSlides}>
        Edit in Google Slides
      </button>
      <div className="slides-outline-list">
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Generating slides... Please wait.</p>
          </div>
        ) : generatedSlides && generatedSlides.length > 0 ? (
          generatedSlides.map((slide, index) => (
            <div key={index} className="slide-split-preview-card">
              <div className="slide-split-left">
                <div className="slide-split-title">{slide.title}</div>
                <div className="slide-split-content">
                  {renderSlideContent(slide.content)}
                </div>
                {slide.author && (
                  <div className="slide-split-author">
                    <span className="slide-split-author-avatar"></span>
                    <span>
                      <b>{slide.author}</b>
                      <br />
                      <span className="slide-split-author-edit">Last edited just now</span>
                    </span>
                  </div>
                )}
              </div>
              <div className="slide-split-right">
                {slide.image_url ? (
                  <img
                    src={slide.image_url}
                    alt="Slide visual"
                    className="slide-split-image"
                  />
                ) : (
                  <div className="slide-split-image-placeholder">No image</div>
                )}
              </div>
            </div>
          ))
        ) : (
          <p>No slides available. Please try again.</p>
        )}
      </div>
      <div className="slides-preview-footer">
        <span className="slides-count">{generatedSlides.length} cards total</span>
        <button className="generate-btn" onClick={handleDownload}>
          Download as PowerPoint
        </button>
      </div>
    </div>
  );
};

export default SlidesGeneratingPage;