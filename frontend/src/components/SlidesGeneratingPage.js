import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "../styles/SlidesGeneratingPage.css";

const SlidesGeneratingPage = () => {
  const location = useLocation();
  const { slides } = location.state || {}; // Get slides from state
  const [isLoading, setIsLoading] = useState(true); // Loading state
  const [generatedSlides, setGeneratedSlides] = useState([]); // Store slides

  useEffect(() => {
    console.log("Slides data:", slides); // Debugging: Log slides data
    if (!slides || slides.length === 0) {
      console.error("No slides data found.");
      setIsLoading(false); // Stop loading if no slides are found
      return;
    }

    // Simulate loading for slide generation
    const timer = setTimeout(() => {
      setGeneratedSlides(slides); // Set slides after loading
      console.log("Generated slides:", slides); // Debugging: Log generated slides
      setIsLoading(false); // Stop loading
    }, 2000); // Simulate a 2-second delay

    return () => clearTimeout(timer); // Cleanup timeout
  }, [slides]);

  const handleDownload = async () => {
  try {
    const response = await fetch("http://localhost:5000/download-pptx", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slides: generatedSlides }),
    });

    // Check if the response is JSON (error) or a blob (file)
    const contentType = response.headers.get("content-type");
    if (!response.ok) {
      let errorMsg = "Failed to download PowerPoint file.";
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      }
      throw new Error(errorMsg);
    }

    if (contentType && contentType.includes("application/json")) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to download PowerPoint file.");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "generated_presentation.pptx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error downloading PowerPoint file:", error);
    alert(error.message || "An error occurred while downloading the PowerPoint file.");
  }
};

  // Helper to render slide content robustly
  const renderSlideContent = (content) => {
    if (Array.isArray(content)) {
      return content.join("\n");
    }
    if (typeof content === "string") {
      return content.replace(/\\n/g, "\n");
    }
    return "";
  };

  return (
    <div className="slides-generating-container">
      {isLoading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Generating slides... Please wait.</p>
        </div>
      ) : (
        <>
          <h1>Generated Slides</h1>
          {generatedSlides && generatedSlides.length > 0 ? (
            <>
              {generatedSlides.map((slide, index) => (
                <div key={index} className="slide">
                  <h2>{slide.title}</h2>
                  <p>{renderSlideContent(slide.content)}</p>
                </div>
              ))}
              <button className="download-btn" onClick={handleDownload}>
                Download as PowerPoint
              </button>
            </>
          ) : (
            <p>No slides available. Please try again.</p>
          )}
        </>
      )}
    </div>
  );
};

export default SlidesGeneratingPage;