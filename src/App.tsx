import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AthleteProviders } from "@/components/AthleteProviders";
import { AuthGate } from "@/components/AuthGate";
import { OnboardingGate } from "@/components/OnboardingGate";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import Index from "./pages/Index";
import TemplatesPage from "./pages/TemplatesPage";
import AcademyPage from "./pages/AcademyPage";
import TestsPage from "./pages/TestsPage";
import AthletesListPage from "./pages/AthletesListPage";
import NotFound from "./pages/NotFound";
import RaceSimulationPage from "./pages/RaceSimulationPage";
import RaceDayModePage from "./pages/RaceDayModePage";
import LiveDecisionModePage from "./pages/LiveDecisionModePage";
import FatiguePage from "./pages/FatiguePage";
import { TFCLTestingWeekPage } from "./components/TFCLTestingWeek";
import { CAPTestingWeekPage } from "./components/CAPTestingWeek";
import { RunningGuidancePage } from "./components/RunningWeeklyGuidance";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route
                  path="/onboarding"
                  element={
                    <AuthGate>
                      <OnboardingPage />
                    </AuthGate>
                  }
                />
                <Route
                  path="/"
                  element={
                    <AuthGate>
                      <OnboardingGate>
                        <AthleteProviders>
                          <Index />
                        </AthleteProviders>
                      </OnboardingGate>
                    </AuthGate>
                  }
                />
                <Route
                  path="/templates"
                  element={
                    <AuthGate>
                      <OnboardingGate>
                        <AthleteProviders>
                          <TemplatesPage />
                        </AthleteProviders>
                      </OnboardingGate>
                    </AuthGate>
                  }
                />
                <Route
                  path="/academy"
                  element={
                    <AuthGate>
                      <OnboardingGate>
                        <AcademyPage />
                      </OnboardingGate>
                    </AuthGate>
                  }
                />
                <Route
                  path="/tests"
                  element={
                    <AuthGate>
                      <OnboardingGate>
                        <AthleteProviders>
                          <TestsPage />
                        </AthleteProviders>
                      </OnboardingGate>
                    </AuthGate>
                  }
                />
                <Route
                  path="/athletes"
                  element={
                    <AuthGate>
                      <OnboardingGate>
                        <AthleteProviders>
                          <AthletesListPage />
                        </AthleteProviders>
                      </OnboardingGate>
                    </AuthGate>
                  }
                />
                <Route
                  path="/tfcl-testing-week"
                  element={
                    <AuthGate>
                      <OnboardingGate>
                        <AthleteProviders>
                          <TFCLTestingWeekPage />
                        </AthleteProviders>
                      </OnboardingGate>
                    </AuthGate>
                  }
                />
                <Route
                  path="/cap-testing-week"
                  element={
                    <AuthGate>
                      <OnboardingGate>
                        <AthleteProviders>
                          <CAPTestingWeekPage />
                        </AthleteProviders>
                      </OnboardingGate>
                    </AuthGate>
                  }
                />
                <Route
                  path="/race-simulation"
                  element={
                    <AuthGate>
                      <OnboardingGate>
                        <AthleteProviders>
                          <RaceSimulationPage />
                        </AthleteProviders>
                      </OnboardingGate>
                    </AuthGate>
                  }
                />
                <Route
                  path="/fatigue"
                  element={
                    <AuthGate>
                      <OnboardingGate>
                        <AthleteProviders>
                          <FatiguePage />
                        </AthleteProviders>
                      </OnboardingGate>
                    </AuthGate>
                  }
                />
                <Route
                  path="/race-day"
                  element={
                    <AuthGate>
                      <OnboardingGate>
                        <AthleteProviders>
                          <RaceDayModePage />
                        </AthleteProviders>
                      </OnboardingGate>
                    </AuthGate>
                  }
                />
                <Route
                  path="/live-decision"
                  element={
                    <AuthGate>
                      <OnboardingGate>
                        <AthleteProviders>
                          <LiveDecisionModePage />
                        </AthleteProviders>
                      </OnboardingGate>
                    </AuthGate>
                  }
                />
                <Route
                  path="/running-guidance"
                  element={
                    <AuthGate>
                      <OnboardingGate>
                        <AthleteProviders>
                          <RunningGuidancePage />
                        </AthleteProviders>
                      </OnboardingGate>
                    </AuthGate>
                  }
                />
                <Route
                  path="*"
                  element={
                    <AuthGate>
                      <OnboardingGate>
                        <AthleteProviders>
                          <NotFound />
                        </AthleteProviders>
                      </OnboardingGate>
                    </AuthGate>
                  }
                />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
