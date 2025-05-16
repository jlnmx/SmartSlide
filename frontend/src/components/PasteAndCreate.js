import React, { useState } from "react";
import Navbar from "./Navbar";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "../styles/PasteAndCreate.css";

export default function PasteToCreate() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!input.trim()) {
      alert("Please paste some content.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:5000/paste-and-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      const data = await response.json();
      if (response.ok) {
        // Redirect to slide preview/generation page
        navigate("/slides-generating", { state: { slides: data.slides } });
      } else {
        setResult(data.error || "Failed to generate slides.");
      }
    } catch (error) {
      setResult("Error generating slides.");
    }
    setIsLoading(false);
  };

  return (
    <div>
      <Navbar />
      <div className="page-wrapper">
        <motion.div
          className="container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>Paste your content</h1>
          <p>
            Drop in your notes, ideas, or outlines. We’ll help you turn it into
            something beautiful.
          </p>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your content here..."
          />

          <button onClick={handleGenerate} disabled={isLoading || input.trim() === ""}>
            {isLoading ? "Generating..." : "Generate"}
          </button>

          {result && (
            <motion.div
              className="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {result}
            </motion.div>
          )}

          <div className="footer-note">
            <a href="#">Need help? </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}