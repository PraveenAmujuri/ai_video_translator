import { Routes, Route, Navigate } from "react-router-dom";

import SiteLayout from "./layouts/SiteLayout";
import HomePage from "./pages/HomePage";
import FeaturesPage from "./pages/FeaturesPage";
import DocsPage from "./pages/DocsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/docs" element={<DocsPage />} />
        {/* Future-ready */}
        {/* <Route path="/support" element={<SupportPage />} /> */}
        {/* <Route path="/request-feature" element={<RequestFeaturePage />} /> */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
