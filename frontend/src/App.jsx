import { Routes, Route, Navigate } from "react-router-dom";

import SiteLayout from "./layouts/SiteLayout";
import HomePage from "./pages/HomePage";
import FeaturesPage from "./pages/FeaturesPage";
import DocsPage from "./pages/DocsPage";
import FeedbackPage from "./pages/FeedbackPage";
import About from "./pages/About";

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/request-feature" element={<FeedbackPage type="feature" />} />
        <Route path="/report-issue" element={<FeedbackPage type="bug" />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
