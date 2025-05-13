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
        body: JSON.stringify({ slides: generatedSlides }), // Send slides data to the backend
      });

      if (!response.ok) {
        throw new Error("Failed to download PowerPoint file.");
      }

      // Create a blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link to download the file
      const link = document.createElement("a");
      link.href = url;
      link.download = "generated_presentation.pptx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading PowerPoint file:", error);
      alert("An error occurred while downloading the PowerPoint file.");
    }
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
                  <p>{slide.content.replace(/\\n/g, "\n")}</p> {/* Replace \n with actual newlines */}
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