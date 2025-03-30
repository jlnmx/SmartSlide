import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import App from "./App";
import AuthPage from "./Auth";
import Dashboard from "./Dashboard";
import CreatePage from "./CreatePage";
import GeneratePage from "./GeneratePage";

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
      </Routes>
    </Router>
  );
};

export default MainRouter;