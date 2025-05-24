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
import Help from "./Help";
import GeneratedQuiz from "./GeneratedQuiz";
import GeneratedScript from "./GeneratedScript";
import SlideEditor from "./SlideEditor";



const MainRouter = () => {
  return (
    <Router>
      <Routes>
        {/* Welcome Page */}
        <Route path="/" element={<App />} exact />

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

        {/* Generated Quiz Page */}
        <Route path="/generated-quiz" element={<GeneratedQuiz />} />

        {/* Generated Script Page */}   
        <Route path="/generated-script" element={<GeneratedScript />} />

        {/* Slide Editor Page */}
        <Route path="/slide-editor" element={<SlideEditor />} />

        {/* Help Page */}
        <Route path="/help" element={<Help />} />

      </Routes>
    </Router>
  );
};

export default MainRouter;