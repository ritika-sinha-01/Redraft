import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { CommunityPage } from "./pages/CommunityPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EditorPage } from "./pages/EditorPage";
import { JobsPage } from "./pages/JobsPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { PremiumPage, PortfolioPage } from "./pages/PremiumPage";
import { SharedResumePage } from "./pages/SharedResumePage";
import { AnalyzerPage } from "./pages/AnalyzerPage";
import { AiAssistantPage } from "./pages/AiAssistantPage";
import { CoverLetterEditorPage } from "./pages/CoverLetterEditorPage";
import { CoverLettersPage } from "./pages/CoverLettersPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { TemplateGalleryPage } from "./pages/TemplateGalleryPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { useAuthStore } from "./store/authStore";

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/share/:slug" element={<SharedResumePage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/templates" element={<TemplateGalleryPage />} />
          <Route path="/resumes" element={<DashboardPage />} />
          <Route path="/editor/:id" element={<EditorPage />} />
          <Route path="/analyzer" element={<AnalyzerPage />} />
          <Route path="/ai" element={<AiAssistantPage />} />
          <Route path="/cover-letters" element={<CoverLettersPage />} />
          <Route path="/cover-letters/:id" element={<CoverLetterEditorPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/premium" element={<PremiumPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
