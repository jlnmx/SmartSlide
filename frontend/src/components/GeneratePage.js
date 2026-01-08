import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import "../styles/GeneratePage.css";
import "../styles/PasteAndCreate.css"; 
import config from "../config";
import { getAllTemplates, getCurrentUserId } from "../utils/templateUtils";

const GeneratePage = () => {
    const location = useLocation();
    const passedTemplate = location.state && location. state.selectedTemplate;
    const [prompt, setPrompt] = useState("");
    const [language, setLanguage] = useState("English");
    const [numSlides, setNumSlides] = useState("5");
    const [loading, setLoading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(passedTemplate || null);
    const [showTemplatePopup, setShowTemplatePopup] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [templatesLoading, setTemplatesLoading] = useState(true);
    const [generateImages, setGenerateImages] = useState(false);
    const [imageStyle, setImageStyle] = useState("professional");
    const navigate = useNavigate();

    useEffect(() => {
        const loadTemplates = async () => {
            setTemplatesLoading(true);
            try {
                const userId = getCurrentUserId();
                const allTemplates = await getAllTemplates(userId);
                setTemplates(allTemplates);
                
                if (! selectedTemplate && allTemplates.length > 0) {
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

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            alert("Please enter a topic.");
            return;
        }
        if (!selectedTemplate) {
            alert("Please select a template.");
            return;
        }
        setLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem("user"));
            const user_id = user && user.id ?  user.id : null;
            
            console.log("Sending request:", {
                prompt,
                language,
                numSlides: parseInt(numSlides),
                template: selectedTemplate.id,
                generate_images: generateImages,
                image_style: imageStyle
            });
            
            const response = await fetch(`${config.API_BASE_URL}/generate-slides`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    prompt,
                    language,
                    numSlides: parseInt(numSlides),
                    template: selectedTemplate.id,
                    user_id,
                    title: prompt,
                    generate_images: generateImages,
                    image_style: imageStyle
                }),
            });
            
            // ✅ Better error handling
            if (!response. ok) {
                let errorMessage = "Failed to generate slides.";
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                    console.error("Server error:", errorData);
                } catch (parseError) {
                    // If JSON parsing fails, get text
                    const errorText = await response.text();
                    console.error("Server error (raw):", errorText);
                    errorMessage = `Server error: ${response.status}`;
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            console. log("Received slides:", data.slides?. length || 0, "slides");
            
            if (! data.slides || !Array.isArray(data.slides) || data.slides.length === 0) {
                throw new Error("No slides were generated. Please try again.");
            }
            
            localStorage.setItem("selectedTemplate", JSON.stringify(selectedTemplate));
            navigate("/slides-generating", {
                state: {
                    slides: data.slides,
                    template: selectedTemplate,
                },
            });
        } catch (error) {
            console.error("Error generating slides:", error);
            alert(error.message || "An error occurred while generating slides.  Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ background: "#e3f2ff", minHeight: "100vh" }}>
            <Navbar />
            {loading && (
                <div className="floating-loading-overlay">
                    <div className="floating-spinner"></div>
                    <span className="loading-text">
                        {generateImages ? "Generating slides with AI images (this may take 30-60 seconds)..." : "Generating slides... "}
                    </span>
                </div>
            )}
            <div className="generate-container">
                <h1 className="generate-title">Generate slides using SmartSlide</h1>
                <p className="generate-subtitle">
                    Enter a topic and select a template to generate a structured presentation. 
                </p>
                
                {/* Original Text Input */}
                <div className="input-section">
                    <input
                        type="text"
                        placeholder="Enter your topic (e.g., Climate Change, AI in Healthcare)"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="generate-input"
                        style={{
                            width: "100%",
                            padding: "15px 20px",
                            fontSize:  "16px",
                            borderRadius: "8px",
                            border: "2px solid #ddd",
                            marginBottom: "20px"
                        }}
                    />

                    {/* Settings Row */}
                    <div style={{ display: "flex", gap:  "20px", marginBottom: "20px" }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                                Number of Slides
                            </label>
                            <input
                                type="number"
                                min="3"
                                max="30"
                                value={numSlides}
                                onChange={(e) => setNumSlides(e.target.value)}
                                className="generate-input"
                                style={{
                                    width: "100%",
                                    padding: "10px 15px",
                                    fontSize:  "16px",
                                    borderRadius: "8px",
                                    border: "2px solid #ddd"
                                }}
                            />
                        </div>
                        <div style={{ flex:  1 }}>
                            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                                Language
                            </label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="generate-select"
                                style={{
                                    width: "100%",
                                    padding: "10px 15px",
                                    fontSize: "16px",
                                    borderRadius: "8px",
                                    border:  "2px solid #ddd",
                                    cursor: "pointer"
                                }}
                            >
                                <option value="English">English</option>
                                <option value="Spanish">Spanish</option>
                                <option value="French">French</option>
                                <option value="German">German</option>
                                <option value="Chinese">Chinese</option>
                                <option value="Japanese">Japanese</option>
                                <option value="Filipino">Filipino</option>
                            </select>
                        </div>
                    </div>

                    {/* Compact AI Image Generation Option */}
                    <div style={{ 
                        margin: "15px 0", 
                        padding: "12px 15px", 
                        background: "#f8f9fa", 
                        borderRadius: "8px",
                        border: "1px solid #e0e0e0"
                    }}>
                        <div style={{ 
                            display: "flex",
                            alignItems: "center",
                            gap: "10px"
                        }}>
                            <input
                                type="checkbox"
                                id="generateImages"
                                checked={generateImages}
                                onChange={(e) => setGenerateImages(e. target.checked)}
                                style={{ 
                                    width: "18px", 
                                    height: "18px", 
                                    cursor: "pointer",
                                    accentColor: "#667eea"
                                }}
                            />
                            <label 
                                htmlFor="generateImages" 
                                style={{ 
                                    cursor: "pointer", 
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    color: "#333",
                                    flex: 1
                                }}
                            >
                                🎨 Generate AI images for slides <span style={{ color: "#666", fontSize: "13px" }}>(+30s)</span>
                            </label>

                            {/* Compact Image Style Selector */}
                            {generateImages && (
                                <select
                                    value={imageStyle}
                                    onChange={(e) => setImageStyle(e. target.value)}
                                    style={{
                                        padding: "5px 10px",
                                        borderRadius: "6px",
                                        border: "1px solid #ddd",
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        background: "#fff"
                                    }}
                                >
                                    <option value="professional">Professional</option>
                                    <option value="minimalist">Minimalist</option>
                                    <option value="colorful">Colorful</option>
                                    <option value="3d">3D</option>
                                    <option value="illustration">Illustration</option>
                                    <option value="photorealistic">Photorealistic</option>
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Template Selection */}
                    <div style={{
                        margin: "20px 0",
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
                                <span style={{ fontWeight: "bold", color: "#000" }}>Selected: </span>
                                <div style={{ color: "#222" }}>
                                    {selectedTemplate.title || selectedTemplate. name}
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

                    {/* Template Popup */}
                    {showTemplatePopup && (
                        <div className="template-popup-overlay" onClick={() => setShowTemplatePopup(false)}>
                            <div
                                className="template-popup"
                                onClick={e => e.stopPropagation()}
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
                                                key={template. id}
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
                                                    {template. title || template.name}
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

                    {/* Generate Button */}
                    <button
                        className="generate-btn"
                        onClick={handleGenerate}
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "15px",
                            fontSize: "18px",
                            fontWeight: "600",
                            marginTop: "20px"
                        }}
                    >
                        {loading ? (
                            generateImages ? "Generating with AI Images..." : "Generating..."
                        ) : (
                            "Generate Slides"
                        )}
                    </button>

                    <button
                        className="need-help-btn"
                        onClick={() => navigate("/help")}
                        title="Need Help?"
                        aria-label="Need Help?"
                    />
                </div>
            </div>
        </div>
    );
};

export default GeneratePage;