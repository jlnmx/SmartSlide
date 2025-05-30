import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import config from "../../config";


const GeneratedScript = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const script = location.state?.script;

  const handleExportWord = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/export-script-word`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ script }),
      });
      if (!response.ok) throw new Error("Failed to export Word file");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "script.docx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export Word file.");
    }
  };

  // Save script to backend
  const handleSaveScript = async () => {
    if (!script) return;
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.id) {
      alert("You must be logged in to save scripts.");
      return;
    }
    let name = prompt("Enter a name for this script:", "My Script");
    if (!name) return;
    try {
      await axios.post(`${config.API_BASE_URL}/save-script`, {
        user_id: user.id,
        name,
        content: script,
      });
      alert("Script saved successfully!");
    } catch (err) {
      alert("Failed to save script.");
    }
  };

  return (
    <div
      style={{
        maxWidth: 700,
        margin: "2rem auto",
        background: "#fff",
        borderRadius: 10,
        boxShadow: "0 2px 8px #0001",
        padding: 32,
      }}
    >
      <h1>Speaker Script</h1>
      {script ? (
        <>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontSize: "1.08rem",
              lineHeight: 1.7,
            }}
          >
            {script}
          </pre>
          <button
            style={{ marginTop: 16, marginRight: 12 }}
            onClick={handleExportWord}
          >
            Export as Word
          </button>
          <button
            style={{ marginTop: 16, marginRight: 12 }}
            onClick={handleSaveScript}
          >
            Save Script
          </button>
        </>
      ) : (
        <div>No script generated.</div>
      )}
      <button style={{ marginTop: 24 }} onClick={() => navigate(-1)}>
        Back
      </button>
    </div>
  );
};

export default GeneratedScript;
