import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import ScrollToTop from "./components/ScrollToTop";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AthleteProviders } from "@/components/AthleteProviders";
import { AuthGate } from "@/components/AuthGate";
import { OnboardingGate } from "@/components/OnboardingGate";

// Eager: bundled in initial chunk
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import Index from "./pages/Index";
import MetricCardDemoPage from "./pages/MetricCardDemoPage";


// Lazy: split into per-route chunks
const DiagnosticPage = lazy(() => import("./pages/DiagnosticPage"));
const PlanningPage = lazy(() => import("./pages/PlanningPage"));
const TestsPage = lazy(() => import("./pages/TestsPage"));
const AcademyPage = lazy(() => import("./pages/AcademyPage"));
const AthletesListPage = lazy(() => import("./pages/AthletesListPage"));
const AITrainingPlanPage = lazy(() => import("./pages/AITrainingPlanPage"));
const TemplatesPage = lazy(() => import("./pages/TemplatesPage"));
const RaceSimulationPage = lazy(() => import("./pages/RaceSimulationPage"));
const PacingAuditPage = lazy(() => import("./pages/PacingAuditPage"));
const RunningProfilePage = lazy(() => import("./pages/RunningProfilePage"));
const AthleteEditPage = lazy(() => import("./pages/AthleteEditPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TFCLTestingWeekPage = lazy(() =>
  import("./components/TFCLTestingWeek").then((m) => ({ default: m.TFCLTestingWeekPage }))
);
const CAPTestingWeekPage = lazy(() =>
  import("./components/CAPTestingWeek").then((m) => ({ default: m.CAPTestingWeekPage }))
);
const RunningGuidancePage = lazy(() =>
  import("./components/RunningWeeklyGuidance").then((m) => ({ default: m.RunningGuidancePage }))
);
const WorkoutLibraryBrowserPage = lazy(() => import("./pages/WorkoutLibraryBrowserPage"));
const PlanLibraryPage = lazy(() => import("./pages/PlanLibraryPage"));
const VLamaxDiagnosticPage = lazy(() => import("./pages/VLamaxDiagnosticPage"));
const RunMLSSCohortPage = lazy(() => import("./pages/RunMLSSCohortPage"));
const LiteratureCohortPage = lazy(() => import("./pages/LiteratureCohortPage"));
const MiniReportPage = lazy(() => import("./pages/MiniReportPage"));
const EssentielsPage = lazy(() => import("./pages/EssentielsPage"));
const CoachChecklistPage = lazy(() => import("./pages/CoachChecklistPage"));
const TrackDayPage = lazy(() => import("./pages/TrackDayPage"));
const BikeTrackDayPage = lazy(() => import("./pages/BikeTrackDayPage"));
const SwimPoolDayPage = lazy(() => import("./pages/SwimPoolDayPage"));
const TriTestDayPage = lazy(() => import("./pages/TriTestDayPage"));
const TrailSimulationPage = lazy(() => import("./pages/TrailSimulationPage"));
const EvolutionPage = lazy(() => import("./pages/EvolutionPage"));

const queryClient = new QueryClient();

/** Centered spinner shown while a route chunk is loading */
function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

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
              <Suspense fallback={<RouteFallback />}>
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
                  <Route path="/simulation/trail" element={<ProtectedRoute><TrailSimulationPage /></ProtectedRoute>} />

                  {/* ═══════════════════════════════════════════ */}
                  {/* SECTION 6 — ACADEMY                        */}
                  {/* ═══════════════════════════════════════════ */}
                  <Route path="/academy" element={<ProtectedRoute><AcademyPage /></ProtectedRoute>} />

                  {/* ═══════════════════════════════════════════ */}
                  {/* RUNNING PROFILE (accessible via dashboard)  */}
                  {/* ═══════════════════════════════════════════ */}
                  <Route path="/running-profile" element={<ProtectedRoute><RunningProfilePage /></ProtectedRoute>} />
                  <Route path="/evolution" element={<ProtectedRoute><EvolutionPage /></ProtectedRoute>} />

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
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
