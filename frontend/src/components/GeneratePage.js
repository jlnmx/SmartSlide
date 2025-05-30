import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import "../styles/GeneratePage.css";
import "../styles/PasteAndCreate.css"; 
import config from "../config";


const templates = [    {
        id: "tailwind-abstract-gradient",
        name: "Abstract Gradient",
        preview: "/static/template_backgrounds/abstract_title.png"
    },
    {
        id: "tailwind-business",
        name: "Business",
        preview: "/static/template_backgrounds/business_title.png"
    },
    {
        id: "tailwind-creative",
        name: "Creative",
        preview: "/static/template_backgrounds/creative_title.png"
    },
    {
        id: "tailwind-education",
        name: "Education",
        preview: "/static/template_backgrounds/education_title.png"
    }
];

const GeneratePage = () => {
    const location = useLocation();
    const passedTemplate = location.state && location.state.selectedTemplate;
    const [prompt, setPrompt] = useState("");
    const [language, setLanguage] = useState("English");
    const [numSlides, setNumSlides] = useState("5");
    const [loading, setLoading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(passedTemplate || null);
    const [showTemplatePopup, setShowTemplatePopup] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!selectedTemplate && templates.length > 0) {
            setSelectedTemplate(templates[0]);
        }
    }, []);

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
            const user_id = user && user.id ? user.id : null;
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
                }),
            });
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || "Failed to generate slides. Please try again.");
            }
            const data = await response.json();
            localStorage.setItem("selectedTemplate", JSON.stringify(selectedTemplate));
            navigate("/slides-generating", {
                state: {
                    slides: data.slides,
                    template: selectedTemplate,
                },
            });
        } catch (error) {
            console.error("Error generating slides:", error);
            alert(error.message || "An error occurred while generating slides.");
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
                    <span className="loading-text">Generating slides...</span>
                </div>
            )}
            <div className="generate-container">
                <h1 className="generate-title">Generate slides using SmartSlide</h1>
                <p className="generate-subtitle">
                    Enter a topic and select a template to generate a structured presentation.
                </p>
                <div className="input-section">
                    <input
                        type="text"
                        className="prompt-input"
                        placeholder="Enter your topic..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                </div>
                <div className="options-section">
                    <div>
                        <label>Language:</label>
                        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                            <option>English</option>
                            <option>Filipino</option>
                            <option>French</option>
                            <option>German</option>
                            <option>Chinese</option>
                            <option>Spanish</option>
                            <option>Japanese</option>
                            <option>Russian</option>
                            <option>Italian</option>
                            <option>Portuguese</option>
                            <option>Arabic</option>
                            <option>Hindi</option>
                            <option>Indonesian</option>
                            <option>Vietnamese</option>
                            <option>Thai</option>
                            <option>Turkish</option>
                            <option>Persian</option>
                            <option>Swedish</option>
                            <option>Dutch</option>
                            <option>Norwegian</option>
                            <option>Finnish</option>
                            <option>Polish</option>
                            <option>Czech</option>
                            <option>Hungarian</option>
                            <option>Romanian</option>
                            <option>Bulgarian</option>
                            <option>Ukrainian</option>
                            <option>Greek</option>
                            <option>Hebrew</option>
                            <option>Malay</option>
                            <option>Swahili</option>
                        </select>
                    </div>
                    <div>
                        <label>Number of Slides:</label>
                        <select value={numSlides} onChange={(e) => setNumSlides(e.target.value)}>
                            <option>5</option>
                            <option>10</option>
                            <option>15</option>
                            <option>20</option>
                            <option>25</option>
                            <option>30</option>
                        </select>
                    </div>
                </div>

                {/* Template selection button and popup */}
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
                {selectedTemplate.title || selectedTemplate.name}
                <div style={{ marginTop: 4 }}>
                    <img
                        src={`/static/template_backgrounds/${selectedTemplate.id}_title.png`}
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
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 style={{ marginBottom: 16 }}>Select a Template</h2>
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
                                            src={template.preview || "/images/default_preview.png"}
                                            alt={template.title || template.name}
                                            className="template-preview"
                                        />
                                        <p className="template-title">{template.title || template.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <button
                    className="generate-btn"
                    onClick={handleGenerate}
                    disabled={loading}
                >
                    {loading ? "Generating..." : "Generate"}
                </button>

                <button
                    className="need-help-btn"
                    onClick={() => navigate("/help")}
                    title="Need Help?"
                    aria-label="Need Help"
                />
            </div>
        </div>
    );
};

export default GeneratePage;