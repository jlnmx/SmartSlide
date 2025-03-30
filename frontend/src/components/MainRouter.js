import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import App from './App';
import CreatePage from './CreatePage';
import GeneratePage from './GeneratePage';

const MainRouter = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/generate" element={<GeneratePage />} />
      </Routes>
    </Router>
  );
};

export default MainRouter;