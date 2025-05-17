import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import "../styles/PasteAndCreate.css";

const PasteAndCreate = () => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      alert("Please paste or type some text.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("http://localhost:5000/paste-and-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        throw new Error("Failed to generate slides.");
      }
      const data = await response.json();
      setResult(data.result || "Slides generated successfully!");
    } catch (error) {
      setResult(error.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="page-wrapper">
        <div className="container">
          <h1 className="paste-title">Paste or Type Your Content</h1>
          <p>
            Paste your text below and SmartSlide will generate a presentation for you.
          </p>
          <form onSubmit={handleSubmit}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or type your content here..."
            />
            <button type="submit" disabled={loading}>
              {loading ? "Generating..." : "Generate Slides"}
            </button>
          </form>
          {result && <div className="result">{result}</div>}
        </div>
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

export default PasteAndCreate;