import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import "../styles/GeneratePage.css";

const GeneratePage = () => {
	const location = useLocation();
	const passedTemplate = location.state && location.state.selectedTemplate;
	const [prompt, setPrompt] = useState("");
	const [language, setLanguage] = useState("English");
	const [numSlides, setNumSlides] = useState("5");
	const [presentationType, setPresentationType] = useState("Default");
	const [loading, setLoading] = useState(false);
	const [templates, setTemplates] = useState([]);
	const [selectedTemplate, setSelectedTemplate] = useState(passedTemplate || null);
	const navigate = useNavigate();

	useEffect(() => {
		// Fetch templates from backend if not passed
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
			const response = await fetch("http://localhost:5000/generate-slides", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					prompt,
					language,
					numSlides: parseInt(numSlides),
					presentationType,
					template: selectedTemplate.id,
					user_id, // send user_id to backend for saving
					title: prompt, // use prompt as title
				}),
			});
			if (!response.ok) {
				const errorData = await response.text();
				throw new Error(errorData || "Failed to generate slides. Please try again.");
			}
			const data = await response.json();
			// Persist template in localStorage for refresh/direct navigation
			localStorage.setItem("selectedTemplate", JSON.stringify(selectedTemplate));
			navigate("/slides-generating", {
				state: {
					slides: data.slides,
					template: selectedTemplate,
					presentationType,
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
			{/* Floating loading spinner overlay */}
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
							<option>35</option>
							<option>40</option>
							<option>45</option>
							<option>50</option>
						</select>
					</div>
					<div>
						<label>Presentation Type:</label>
						<select
							value={presentationType}
							onChange={(e) => setPresentationType(e.target.value)}
						>
							<option value="Default">Default</option>
							<option value="Tall">Tall</option>
							<option value="Traditional">Traditional</option>
						</select>
					</div>
				</div>
				{/* Show only the selected template if passed from Templates.js, otherwise show selection grid */}
				{selectedTemplate && passedTemplate ? (
					<div className="selected-template-info" style={{ margin: "2rem 0", textAlign: "center" }}>
						<img
							src={selectedTemplate.preview || "/images/default_preview.png"}
							alt={selectedTemplate.title || selectedTemplate.name}
							style={{ width: 180, borderRadius: 8, marginBottom: 8 }}
						/>
						<div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>{selectedTemplate.title || selectedTemplate.name}</div>
						<div style={{ color: "#555" }}>{selectedTemplate.description}</div>
					</div>
				) : (
					<>
						<h2 className="template-selection-title">Select a Template</h2>
						<div className="template-selection">
							{templates.map((template) => (
								<div
									key={template.id}
									className={`template-box ${selectedTemplate && selectedTemplate.id === template.id ? "selected" : ""}`}
									onClick={() => setSelectedTemplate(template)}
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
					</>
				)}
				<button
					className="generate-btn"
					onClick={handleGenerate}
					disabled={loading}
				>
					{loading ? "Generating..." : "Generate"}
				</button>

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
};

export default GeneratePage;

/* Add to GeneratePage.css:
.floating-loading-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.7);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.floating-spinner {
  border: 6px solid #e3f2ff;
  border-top: 6px solid #007bff;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.loading-text {
  margin-top: 18px;
  font-size: 1.2rem;
  color: #007bff;
  font-weight: 500;
}
*/