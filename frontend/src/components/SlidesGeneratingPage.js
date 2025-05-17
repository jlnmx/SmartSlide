import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "../styles/SlidesGeneratingPage.css";

const SlidesGeneratingPage = () => {
  const location = useLocation();
  const { slides } = location.state || {};
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
  try {
    const response = await fetch("http://localhost:5000/create-google-slides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slides: generatedSlides,
        presentationType: "default", // Pass the presentation type (default, tall, traditional)
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
    try {
      const response = await fetch("http://localhost:5000/generate-presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides: generatedSlides }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate the presentation.");
      }

      // Create a blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link element
      const link = document.createElement("a");
      link.href = url;
      link.download = "generated_presentation.pptx"; // This sets the filename in the Downloads folder
      document.body.appendChild(link);
      link.click();

      // Clean up the temporary link
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url); // Free up memory
    } catch (error) {
      alert(error.message || "An error occurred while generating the presentation.");
    }
  };

  // Helper to render slide content as bullet points or sections
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
              {/* Left: Text */}
              <div className="slide-split-left">
                <div className="slide-split-title">{slide.title}</div>
                <div className="slide-split-content">
                  {renderSlideContent(slide.content)}
                </div>
                {/* Optional: author/subtitle */}
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
              {/* Right: Image */}
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