import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import App from "./App";
import AuthPage from "./Auth";
import Dashboard from "./Dashboard";
import CreatePage from "./CreatePage";
import GeneratePage from "./GeneratePage";
import PasteAndCreate from "./PasteAndCreate"; // Import PasteAndCreate component
import ImportPage from "./ImportPage";
import Analytics from "./Analytics"; // Ensure Analytics is imported
import Templates from "./Templates"; // Import the Templates component

<Routes>
  <Route path="/templates" element={<Templates />} />
</Routes>


const MainRouter = () => {
  return (
    <Router>
      <Routes>
        {/* Welcome Page */}
        <Route path="/" element={<App />} />

        {/* Authentication Page */}
        <Route path="/auth" element={<AuthPage isLogin={true} />} />
        <Route path="/register" element={<AuthPage isLogin={false} />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Create Page */}
        <Route path="/create" element={<CreatePage />} />

        {/* Generate Page */}
        <Route path="/generate" element={<GeneratePage />} />

        <Route path="/import" element={<ImportPage />} />

        {/* Paste and Create Page */}
        <Route path="/paste-and-create" element={<PasteAndCreate />} />

        <Route path="/analytics" element={<Analytics />} /> {/* Route for Analytics */}
    
        <Route path="/templates" element={<Templates />} />
      </Routes>
    </Router>
  );
};

export default MainRouter;