import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/SlidesGeneratingPage.css";
import Navbar from "./Navbar";
import config from "../config";

const SlidesGeneratingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  let { slides: initialSlides, template, presentationType, fromEditor, presentationId, language: navLanguage } = location.state || {};

  if (!template) {
    try {
      template = JSON.parse(localStorage.getItem("selectedTemplate"));
    } catch {
      template = null;
    }
  }
  if (! presentationType) {
    presentationType = localStorage.getItem("presentationType") || "Default";
  }

  // --- NEW: Language and Quiz Question Count State ---
  const [language, setLanguage] = useState(
    navLanguage || localStorage.getItem("selectedLanguage") || "English"
  );
  const [numQuestions, setNumQuestions] = useState(5);

  const [isLoading, setIsLoading] = useState(true);
  // Use initialSlides from navigation state if coming from editor, otherwise use slides from props or empty array
  const [generatedSlides, setGeneratedSlides] = useState(fromEditor ?  initialSlides : (location.state?.slides || []));

  // --- NEW: Persist language to localStorage when it changes ---
  useEffect(() => {
    if (language) { // Ensure language has a value
      localStorage.setItem("selectedLanguage", language);
    }
  }, [language]); // Re-run this effect if the language state changes

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
      latestSlides = location.state. slides;
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

  // ✅ NEW: Convert slides for editor with proper image handling
  const convertSlidesForEditor = (backendSlides) => {
    return backendSlides.map((slide, index) => {
      const editorSlide = {
        ...slide,
        images: slide.images || []
      };
      
      // If slide has AI-generated image_url, add it to images array
      if (slide.image_url && ! editorSlide.images.some(img => img.src === slide.image_url)) {
        editorSlide.images.push({
          id: `ai-image-${index}`,
          src: slide.image_url,
          x: 480,      // Right side: 50% of 960px slide width
          y: 50,       // Small top margin
          width: 450,  // Takes up most of right half
          height: 440, // Maintains good aspect ratio
          zIndex: 101  // Above background
        });
        
        // Adjust textboxes to left side if they exist
        if (editorSlide.textboxes && Array.isArray(editorSlide.textboxes)) {
          editorSlide.textboxes = editorSlide.textboxes.map(tb => ({
            ...tb,
            x: tb.x || 40,
            width: Math.min(tb.width || 400, 400), // Constrain to left side
          }));
        }
      }
      
      return editorSlide;
    });
  };

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
    
    // ✅ Convert slides with image support before passing to editor
    const convertedSlides = convertSlidesForEditor(slidesToEdit);
    
    // Ensure language is passed, it's already part of the component's state
    navigate("/slide-editor", { 
      state: { 
        slides: convertedSlides, 
        template, 
        presentationType, 
        presentationId, 
        language 
      } 
    });
  };

  const handleDownload = async () => {
    if (!template) {
      alert("Template information is missing. Please go back and select a template.");
      return;
    }
    try {
      const response = await fetch(`${config.API_BASE_URL}/generate-presentation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides: generatedSlides,
          template: typeof template === "object" ? template.id : template,
          presentationType,
          language,
        }),
      });

      if (!response.ok) {
        const errorData = await response. json();
        throw new Error(errorData.error || "Failed to generate the presentation.");
      }

      const blob = await response.blob();
      const url = window. URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "generated_presentation.pptx";
      document.body. appendChild(link);
      link.click();

      document.body. removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message || "An error occurred while generating the presentation.");
    }
  };

  // --- UPDATED: Pass language and numQuestions to quiz/script generation ---
  const handleGenerateQuiz = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides: generatedSlides, language, numQuestions }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData. error || "Failed to generate quiz.");
      }
      const data = await response.json();
      navigate("/generated-quiz", { state:  { quiz: data.quiz, language } });
    } catch (error) {
      alert(error. message || "An error occurred while generating the quiz.");
    }
  };

  const handleGenerateScript = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/generate-script`, {
        method: "POST",
        headers: { "Content-Type":  "application/json" },
        body: JSON.stringify({ slides: generatedSlides, language }),
      });
      if (!response. ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate script.");
      }
      const data = await response.json();
      navigate("/generated-script", { state: { script: data.script, language } });
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
    if (Array. isArray(content)) {
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
    <div>
      <Navbar />
      <div className="slides-preview-outer-center">
        <div className="slides-preview-root">
          {getTemplateInfo()}
          <h2 className="outline-title">Outline</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.2rem", flexWrap: "wrap" }}>
            <button className="edit-google-slides-btn" onClick={handleEditSlides} style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem", width: "auto", flex: "0 0 auto" }}>
              Edit Slides
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <label htmlFor="quiz-language-display" style={{ fontSize: "0.85rem", margin: 0, whiteSpace: "nowrap" }}>Language:</label>
              <span
                id="quiz-language-display"
                style={{ padding: "0.35rem 0.5rem", fontSize: "0.85rem", fontWeight: "bold", border: "1px solid #ced4da", borderRadius: "0.25rem", backgroundColor: "#e9ecef", color: "#495057", whiteSpace: "nowrap" }}
              >
                {language}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <label htmlFor="num-questions-select" style={{ fontSize: "0.85rem", margin: 0, whiteSpace: "nowrap" }}>Quiz Questions:</label>
              <select
                id="num-questions-select"
                value={numQuestions}
                onChange={e => setNumQuestions(Number(e.target.value))}
                style={{ padding: "0.35rem 0.5rem", fontSize: "0.85rem", borderRadius: "0.25rem", border: "1px solid #ced4da", width: "auto" }}
              >
                {[3, 5, 7, 10, 15, 20].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <button className="generate-btn" style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem", width: "auto", flex: "0 0 auto" }} onClick={handleGenerateQuiz}>
              Generate Quiz
            </button>
            <button className="generate-btn" style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem", width: "auto", flex: "0 0 auto" }} onClick={handleGenerateScript}>
              Generate Script
            </button>
          </div>
          <div className="slides-outline-list">
            {isLoading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Generating slides... Please wait.</p>
              </div>
            ) : generatedSlides && generatedSlides.length > 0 ?  (
              generatedSlides. map((slideData, index) => {
                let title, contentForRender, imageUrl;

                if (slideData.textboxes && Array.isArray(slideData.textboxes)) {
                  const titleBox = slideData. textboxes.find(tb => tb.type === 'title');
                  const bodyBox = slideData.textboxes.find(tb => tb.type === 'body');
                  
                  title = titleBox ? titleBox. text : 'Untitled';
                  
                  if (bodyBox) {
                    if (bodyBox.bullets) {
                      contentForRender = bodyBox.text.split('\\n');   
                    } else {
                      contentForRender = bodyBox.text; 
                    }
                  } else {
                    contentForRender = '';
                  }
                  // ✅ Check for image in multiple formats
                  imageUrl = slideData.image_url || (slideData.image ? slideData. image.src : null);
                } else {
                  title = slideData.title;
                  contentForRender = slideData. content;
                  // ✅ Get AI-generated image URL
                  imageUrl = slideData.image_url;
                }

                return (
                  <div key={index} className="slide-full-preview-card">
                    <div className="slide-preview-header">
                      <h3 className="slide-number">
                        Slide {index + 1}
                        {/* ✅ Show image indicator */}
                        {imageUrl && (
                          <span style={{ 
                            marginLeft: '8px', 
                            fontSize: '0.8em', 
                            color: '#667eea',
                            fontWeight: 'normal'
                          }}>
                            🎨 AI Image
                          </span>
                        )}
                      </h3>
                      {slideData.author && (
                        <div className="slide-author-info">
                          <span className="slide-author-avatar"></span>
                          <span>
                            <b>{slideData.author}</b>
                            <span className="slide-author-edit">Last edited just now</span>
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="slide-preview-container">
                      <div className="slide-preview-content">
                        {/* Simple gradient background */}
                        <div style={{
                          position:  'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          zIndex: 0
                        }}></div>

                        {/* Content overlay */}
                        <div className="slide-content-overlay" style={{ position: 'relative', zIndex: 2 }}>
                          <div className="slide-title">{title}</div>
                          <div className="slide-body">
                            {renderSlideContent(contentForRender)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                color: '#666' 
              }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>
                  No slides available. Please try again. 
                </p>
                <button 
                  className="generate-btn" 
                  onClick={() => navigate('/generate')}
                  style={{ fontSize: '1rem', padding: '0.5rem 1.5rem' }}
                >
                  Generate New Slides
                </button>
              </div>
            )}
          </div>
          <div className="slides-preview-footer">
            <span className="slides-count">
              {generatedSlides.length} slide{generatedSlides.length !== 1 ? 's' :  ''} total
              {generatedSlides.filter(s => s.image_url).length > 0 && (
                <span style={{ marginLeft: '10px', color: '#667eea' }}>
                  ({generatedSlides.filter(s => s.image_url).length} with AI images)
                </span>
              )}
            </span>
            <button className="generate-btn" onClick={handleDownload}>
              Download as PowerPoint
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlidesGeneratingPage;