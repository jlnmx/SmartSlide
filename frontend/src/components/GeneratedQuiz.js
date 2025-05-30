import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import config from "../config";


const GeneratedQuiz = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const quiz = location.state?.quiz;

  // Export quiz as Word file
  const handleExportWord = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/export-quiz-word`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz }),
      });
      if (!response.ok) throw new Error("Failed to export Word file");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "generated_quiz.docx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export Word file.");
    }
  };

  // Save quiz to backend
  const handleSaveQuiz = async () => {
    if (!quiz) return;
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.id) {
      alert("You must be logged in to save quizzes.");
      return;
    }
    let name = prompt("Enter a name for this quiz:", "My Quiz");
    if (!name) return;
    try {
      await axios.post(`${config.API_BASE_URL}/save-quiz`, {
        user_id: user.id,
        name,
        content: JSON.stringify(quiz),
      });
      alert("Quiz saved successfully!");
    } catch (err) {
      alert("Failed to save quiz.");
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
      <h1>Generated Quiz</h1>
      {quiz ? (
        <div>
          {Array.isArray(quiz)
            ? quiz.map((q, idx) => (
                <div key={idx} style={{ marginBottom: 24 }}>
                  <b>Q{idx + 1}:</b> {q.question}
                  {q.choices && (
                    <ul style={{ marginTop: 8 }}>
                      {q.choices.map((choice, cidx) => (
                        <li key={cidx}>{choice}</li>
                      ))}
                    </ul>
                  )}
                  {q.answer && (
                    <div style={{ color: "#1976d2", marginTop: 6 }}>
                      <b>Answer:</b> {q.answer}
                    </div>
                  )}
                </div>
              ))
            : <pre>{quiz}</pre>}
          <button
            style={{ marginTop: 16, marginRight: 12 }}
            onClick={handleExportWord}
          >
            Export as Word
          </button>
          <button
            style={{ marginTop: 16, marginRight: 12 }}
            onClick={handleSaveQuiz}
          >
            Save Quiz
          </button>
        </div>
      ) : (
        <div>No quiz generated.</div>
      )}
      <button style={{ marginTop: 24 }} onClick={() => navigate(-1)}>
        Back
      </button>
    </div>
  );
};

export default GeneratedQuiz;
