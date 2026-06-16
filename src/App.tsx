import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AthleteProviders } from "@/components/AthleteProviders";
import { AuthGate } from "@/components/AuthGate";
import { OnboardingGate } from "@/components/OnboardingGate";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import Index from "./pages/Index";
import DiagnosticPage from "./pages/DiagnosticPage";
import PlanningPage from "./pages/PlanningPage";
import TestsPage from "./pages/TestsPage";
import AcademyPage from "./pages/AcademyPage";
import AthletesListPage from "./pages/AthletesListPage";
import AITrainingPlanPage from "./pages/AITrainingPlanPage";
import TemplatesPage from "./pages/TemplatesPage";
import RaceSimulationPage from "./pages/RaceSimulationPage";
import PacingAuditPage from "./pages/PacingAuditPage";
import RunningProfilePage from "./pages/RunningProfilePage";
import AthleteEditPage from "./pages/AthleteEditPage";
import NotFound from "./pages/NotFound";
import { TFCLTestingWeekPage } from "./components/TFCLTestingWeek";
import { CAPTestingWeekPage } from "./components/CAPTestingWeek";
import { RunningGuidancePage } from "./components/RunningWeeklyGuidance";
import WorkoutLibraryBrowserPage from "./pages/WorkoutLibraryBrowserPage";
import PlanLibraryPage from "./pages/PlanLibraryPage";
import VLamaxDiagnosticPage from "./pages/VLamaxDiagnosticPage";
import RunMLSSCohortPage from "./pages/RunMLSSCohortPage";
import LiteratureCohortPage from "./pages/LiteratureCohortPage";
import MiniReportPage from "./pages/MiniReportPage";
import EssentielsPage from "./pages/EssentielsPage";
import CoachChecklistPage from "./pages/CoachChecklistPage";
import TrackDayPage from "./pages/TrackDayPage";
import BikeTrackDayPage from "./pages/BikeTrackDayPage";
import SwimPoolDayPage from "./pages/SwimPoolDayPage";
import TriTestDayPage from "./pages/TriTestDayPage";

const queryClient = new QueryClient();

/** Wraps a page in auth + onboarding + athlete providers */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <OnboardingGate>
        <AthleteProviders>
          {children}
        </AthleteProviders>
      </OnboardingGate>
    </AuthGate>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <AuthProvider>
              <Routes>
                {/* Auth */}
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/onboarding" element={<AuthGate><OnboardingPage /></AuthGate>} />

                {/* Public — Mini Rapport (formulaire ouvert, sans auth) */}
                <Route path="/mini-rapport" element={<MiniReportPage />} />

                {/* ═══════════════════════════════════════════ */}
                {/* SECTION 1 — DASHBOARD                      */}
                {/* ═══════════════════════════════════════════ */}
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />

                {/* ═══════════════════════════════════════════ */}
                {/* SECTION 2 — ATHLÈTES                       */}
                {/* ═══════════════════════════════════════════ */}
                <Route path="/athletes" element={<ProtectedRoute><AthletesListPage /></ProtectedRoute>} />
                <Route path="/athlete/:id" element={<ProtectedRoute><AthleteEditPage /></ProtectedRoute>} />
                <Route path="/athleteEditPage" element={<ProtectedRoute><AthleteEditPage /></ProtectedRoute>} />
                <Route path="/essentiels" element={<ProtectedRoute><EssentielsPage /></ProtectedRoute>} />

                {/* ═══════════════════════════════════════════ */}
                {/* SECTION 3 — DIAGNOSTIC                     */}
                {/* ═══════════════════════════════════════════ */}
                <Route path="/diagnostic" element={<ProtectedRoute><DiagnosticPage /></ProtectedRoute>} />
                <Route path="/diagnostic/tests" element={<ProtectedRoute><TestsPage /></ProtectedRoute>} />
                <Route path="/diagnostic/testing-week-tfcl" element={<ProtectedRoute><TFCLTestingWeekPage /></ProtectedRoute>} />
                <Route path="/diagnostic/testing-week-cap" element={<ProtectedRoute><CAPTestingWeekPage /></ProtectedRoute>} />
                <Route path="/diagnostic/vlamax" element={<ProtectedRoute><VLamaxDiagnosticPage /></ProtectedRoute>} />
                <Route path="/diagnostic/vlamax/:athleteId" element={<ProtectedRoute><VLamaxDiagnosticPage /></ProtectedRoute>} />
                <Route path="/diagnostic/cohort-run-mlss" element={<ProtectedRoute><RunMLSSCohortPage /></ProtectedRoute>} />
                <Route path="/diagnostic/cohort-literature" element={<ProtectedRoute><LiteratureCohortPage /></ProtectedRoute>} />
                <Route path="/diagnostic/coach-checklist" element={<ProtectedRoute><CoachChecklistPage /></ProtectedRoute>} />
                <Route path="/diagnostic/track-day" element={<ProtectedRoute><TrackDayPage /></ProtectedRoute>} />
                <Route path="/diagnostic/bike-track-day" element={<ProtectedRoute><BikeTrackDayPage /></ProtectedRoute>} />
                <Route path="/diagnostic/swim-pool-day" element={<ProtectedRoute><SwimPoolDayPage /></ProtectedRoute>} />
                <Route path="/diagnostic/tri-test-day" element={<ProtectedRoute><TriTestDayPage /></ProtectedRoute>} />

                {/* ═══════════════════════════════════════════ */}
                {/* SECTION 4 — PLANIFICATION                  */}
                {/* ═══════════════════════════════════════════ */}
                <Route path="/planning" element={<ProtectedRoute><PlanningPage /></ProtectedRoute>} />
                <Route path="/planning/ai-plan" element={<ProtectedRoute><AITrainingPlanPage /></ProtectedRoute>} />
                <Route path="/planning/templates" element={<ProtectedRoute><TemplatesPage /></ProtectedRoute>} />
                <Route path="/planning/running-guidance" element={<ProtectedRoute><RunningGuidancePage /></ProtectedRoute>} />
                <Route path="/planning/library" element={<ProtectedRoute><WorkoutLibraryBrowserPage /></ProtectedRoute>} />
                <Route path="/planning/plan-library" element={<ProtectedRoute><PlanLibraryPage /></ProtectedRoute>} />

                {/* ═══════════════════════════════════════════ */}
                {/* SECTION 5 — SIMULATION                     */}
                {/* ═══════════════════════════════════════════ */}
                <Route path="/race" element={<ProtectedRoute><RaceSimulationPage /></ProtectedRoute>} />
                <Route path="/race/pacing-audit" element={<ProtectedRoute><PacingAuditPage /></ProtectedRoute>} />

                {/* ═══════════════════════════════════════════ */}
                {/* SECTION 6 — ACADEMY                        */}
                {/* ═══════════════════════════════════════════ */}
                <Route path="/academy" element={<ProtectedRoute><AcademyPage /></ProtectedRoute>} />

                {/* ═══════════════════════════════════════════ */}
                {/* RUNNING PROFILE (accessible via dashboard)  */}
                {/* ═══════════════════════════════════════════ */}
                <Route path="/running-profile" element={<ProtectedRoute><RunningProfilePage /></ProtectedRoute>} />

                {/* ═══════════════════════════════════════════ */}
                {/* LEGACY REDIRECTS                            */}
                {/* ═══════════════════════════════════════════ */}
                <Route path="/dashboard" element={<Navigate to="/" replace />} />
                <Route path="/AthleteEditPage" element={<Navigate to="/athleteEditPage" replace />} />
                <Route path="/tests" element={<Navigate to="/diagnostic/tests" replace />} />
                <Route path="/tfcl-testing-week" element={<Navigate to="/diagnostic/testing-week-tfcl" replace />} />
                <Route path="/cap-testing-week" element={<Navigate to="/diagnostic/testing-week-cap" replace />} />
                <Route path="/ai-plan" element={<Navigate to="/planning/ai-plan" replace />} />
                <Route path="/templates" element={<Navigate to="/planning/templates" replace />} />
                <Route path="/running-guidance" element={<Navigate to="/planning/running-guidance" replace />} />
                <Route path="/race-simulation" element={<Navigate to="/race" replace />} />

                {/* 404 */}
                <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
