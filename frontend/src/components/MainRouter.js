import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import App from "./App";
import AuthPage from "./Auth";
import UserTypeSelection from "./UserTypeSelection";
import Dashboard from "./Dashboard";
import CreatePage from "./CreatePage";
import GeneratePage from "./GeneratePage";
import PasteAndCreate from "./PasteAndCreate";
import ImportPage from "./ImportPage";
import Analytics from "./Analytics";
import SlidesGeneratingPage from "./SlidesGeneratingPage";
import AccountProfile from "./AccountProfile";
import Help from "./Help";
import GeneratedQuiz from "./GeneratedQuiz";
import GeneratedScript from "./GeneratedScript";
import SlideEditor from "./SlideEditor";
import SavedQuizzesAndScripts from "./SavedQuizzesAndScripts";
import UploadTemplates from "./UploadTemplates";
import Admin from "./Admin";
import AdminDashboard from "./AdminDashboard";



const MainRouter = () => {
  return (
    <Router>
      <Routes>
        {/* Welcome Page */}
        <Route path="/" element={<App />} exact />{/* Authentication Page */}
        <Route path="/auth" element={<AuthPage isLogin={true} />} />
        <Route path="/register" element={<AuthPage isLogin={false} />} />

        {/* User Type Selection Page */}
        <Route path="/select-user-type" element={<UserTypeSelection />} />

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

        {/* Account Profile Page */}
        <Route path="/account" element={<AccountProfile />} />

        <Route path="/slides-generating" element={<SlidesGeneratingPage />} />

        {/* Generated Quiz Page */}
        <Route path="/generated-quiz" element={<GeneratedQuiz />} />

        {/* Generated Script Page */}   
        <Route path="/generated-script" element={<GeneratedScript />} />

        {/* Slide Editor Page */}
        <Route path="/slide-editor" element={<SlideEditor />} />        {/* Saved Quizzes and Scripts Page */}
        <Route path="/saved-quizzes-and-scripts" element={<SavedQuizzesAndScripts />} />

        {/* Upload Templates Page */}
        <Route path="/upload-templates" element={<UploadTemplates />} />

        {/* Help Page */}
        <Route path="/help" element={<Help />} />

        {/* Admin Pages */}
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        
      </Routes>
    </Router>
  );
};

export default MainRouter;