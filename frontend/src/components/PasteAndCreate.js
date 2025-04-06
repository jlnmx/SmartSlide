// PasteToCreate.js
import React, { useState } from "react";
import { motion } from "framer-motion";
import Textarea from "./ui/Textarea";
import Button from "./ui/Button";

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
    <div className="min-h-screen bg-[#f0f0f5] flex items-center justify-center p-6">
      <motion.div
        className="bg-white rounded-[32px] shadow-xl p-10 max-w-2xl w-full border border-gray-200"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-extrabold mb-4 text-center text-gray-900">
          Paste your content
        </h1>
        <p className="text-gray-500 mb-8 text-center text-lg">
          Drop in your notes, ideas, or outlines. We’ll help you turn it into something beautiful.
        </p>

        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your content here..."
          className="mb-6 h-52"
        />

        <Button
          onClick={handleGenerate}
          disabled={isLoading || input.trim() === ""}
          className="w-full"
        >
          {isLoading ? "Generating..." : "Generate"}
        </Button>

        {result && (
          <motion.div
            className="mt-8 bg-[#f9f9fb] p-6 rounded-2xl text-gray-700 text-base border border-gray-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {result}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
