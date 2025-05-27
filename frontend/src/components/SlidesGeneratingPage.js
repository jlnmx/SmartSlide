import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/SlidesGeneratingPage.css";
import Navbar from "./Navbar";


const SlidesGeneratingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();  // Prioritize slides from editor if available
  let { slides: initialSlides, template, presentationType, fromEditor, presentationId } = location.state || {};

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
  // Use initialSlides from navigation state if coming from editor, otherwise use slides from props or empty array
  const [generatedSlides, setGeneratedSlides] = useState(fromEditor ? initialSlides : (location.state?.slides || []));

  // Always load slides from localStorage if available
  useEffect(() => {
    let latestSlides = null;
    // If slides are present in navigation state (from editor), update localStorage
    if (fromEditor && initialSlides && initialSlides.length > 0) {
      localStorage.setItem('latestEditedSlides', JSON.stringify(initialSlides));
      latestSlides = initialSlides;
    } else if (location.state?.slides && location.state.slides.length > 0) {
      // If slides are present in navigation state (not from editor), update localStorage
      localStorage.setItem('latestEditedSlides', JSON.stringify(location.state.slides));
      latestSlides = location.state.slides;
    } else {
      // Try to load from localStorage
      const stored = localStorage.getItem('latestEditedSlides');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Ensure parsed data is a non-empty array before considering it valid
          if (Array.isArray(parsed) && parsed.length > 0) {
            latestSlides = parsed;
          }
        } catch (e) {
          console.error("Error parsing slides from localStorage in useEffect:", e);
        }
      }
    }

    if (latestSlides) {
      setGeneratedSlides(latestSlides);
    }
    // If no latestSlides are found, generatedSlides will retain its value from useState,
    // which should be an empty array or slides from initial nav state if applicable.
    setIsLoading(false);
  }, [fromEditor, initialSlides, location.state?.slides]);

  // Always pass the latest slides from localStorage to the editor
  const handleEditSlides = () => {
    let slidesToEdit = generatedSlides;
    const stored = localStorage.getItem('latestEditedSlides');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          slidesToEdit = parsed;
        }
      } catch {}
    }
    navigate("/slide-editor", { state: { slides: slidesToEdit, template, presentationType, presentationId } });
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

  const handleGenerateQuiz = async () => {
    try {
      const response = await fetch("http://localhost:5000/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides: generatedSlides }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate quiz.");
      }
      const data = await response.json();
      navigate("/generated-quiz", { state: { quiz: data.quiz } });
    } catch (error) {
      alert(error.message || "An error occurred while generating the quiz.");
    }
  };

  const handleGenerateScript = async () => {
    try {
      const response = await fetch("http://localhost:5000/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides: generatedSlides }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate script.");
      }
      const data = await response.json();
      navigate("/generated-script", { state: { script: data.script } });
    } catch (error) {
      alert(error.message || "An error occurred while generating the script.");
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
    if (typeof content === 'string') {
      
      return <div className="slide-desc">{content.split('\\n').map((line, i) => <div key={i}>{line || <br />}</div>)}</div>;
    }
    return null;
  };

  return (
    <div><Navbar />
    <div className="slides-preview-root">
      {getTemplateInfo()}
      <h2 className="outline-title">Outline</h2>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.2rem" }}>
        <button className="edit-google-slides-btn" onClick={handleEditSlides} style={{ fontSize: "1rem", padding: "0.4rem 1.1rem" }}>
          Edit Slides
        </button>
        <button className="generate-btn" style={{ fontSize: "0.95rem", padding: "0.35rem 0.9rem" }} onClick={handleGenerateQuiz}>
          Generate Quiz
        </button>
        <button className="generate-btn" style={{ fontSize: "0.95rem", padding: "0.35rem 0.9rem" }} onClick={handleGenerateScript}>
          Generate Script
        </button>
      </div>
      <div className="slides-outline-list">
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Generating slides... Please wait.</p>
          </div>
        ) : generatedSlides && generatedSlides.length > 0 ? (
          generatedSlides.map((slideData, index) => {
            let title, contentForRender, imageUrl;

            // Check if the slide is in editor format or original format
            if (slideData.textboxes && Array.isArray(slideData.textboxes)) {
              // Editor format
              const titleBox = slideData.textboxes.find(tb => tb.type === 'title');
              const bodyBox = slideData.textboxes.find(tb => tb.type === 'body');
              
              title = titleBox ? titleBox.text : 'Untitled';
              
              if (bodyBox) {
                if (bodyBox.bullets) {
                  contentForRender = bodyBox.text.split('\\n'); // Pass as array for bullet rendering
                } else {
                  contentForRender = bodyBox.text; // Pass as string
                }
              } else {
                contentForRender = '';
              }
              imageUrl = slideData.image ? slideData.image.src : null;
            } else {
              // Original format
              title = slideData.title;
              contentForRender = slideData.content;
              imageUrl = slideData.image_url;
            }

            return (
              <div key={index} className="slide-split-preview-card">
                <div className="slide-split-left">
                  <div className="slide-split-title">{title}</div>
                  <div className="slide-split-content">
                    {renderSlideContent(contentForRender)}
                  </div>
                  {slideData.author && ( // Assuming author might not be in editor format
                    <div className="slide-split-author">
                      <span className="slide-split-author-avatar"></span>
                      <span>
                        <b>{slideData.author}</b>
                        <br />
                        <span className="slide-split-author-edit">Last edited just now</span>
                      </span>
                    </div>
                  )}
                </div>
                <div className="slide-split-right">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Slide visual"
                      className="slide-split-image"
                    />
                  ) : (
                    <div className="slide-split-image-placeholder">No image</div>
                  )}
                </div>
              </div>
            );
          })
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
    </div>
  );
};

export default SlidesGeneratingPage;