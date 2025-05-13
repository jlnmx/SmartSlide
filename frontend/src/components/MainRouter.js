import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import App from "./App";
import AuthPage from "./Auth";
import Dashboard from "./Dashboard";
import CreatePage from "./CreatePage";
import GeneratePage from "./GeneratePage";
import PasteAndCreate from "./PasteAndCreate";
import ImportPage from "./ImportPage";
import Analytics from "./Analytics";
import Templates from "./Templates";
import SlidesGeneratingPage from "./SlidesGeneratingPage";
import AccountProfile from "./AccountProfile";



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

        {/* Import Page */}
        <Route path="/import" element={<ImportPage />} />

        {/* Paste and Create Page */}
        <Route path="/paste-and-create" element={<PasteAndCreate />} />

        {/* Analytics Page */}
        <Route path="/analytics" element={<Analytics />} />

        {/* Templates Page */}
        <Route path="/templates" element={<Templates />} />

        <Route path="/account" element={<AccountProfile />} />

        <Route path="/slides-generating" element={<SlidesGeneratingPage />} />

      </Routes>
    </Router>
  );
};

export default MainRouter;