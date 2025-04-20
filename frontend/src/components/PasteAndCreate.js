import React, { useState } from "react";
import Navbar from "./Navbar";
import { motion } from "framer-motion";
import "../styles/PasteAndCreate.css";

export default function PasteToCreate() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = () => {
    setIsLoading(true);
    setTimeout(() => {
      setResult(`You pasted: ${input}`);
      setIsLoading(false);
    }, 1000);
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
            Need help? <a href="#">Contact us</a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}