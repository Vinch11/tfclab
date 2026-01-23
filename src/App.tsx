import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CloudDataProvider } from "@/contexts/CloudDataContext";
import { AthleteProvider } from "@/contexts/AthleteContext";
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
import { TFCLTestingWeekPage } from "./components/TFCLTestingWeek";
import { CAPTestingWeekPage } from "./components/CAPTestingWeek";

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
                        <CloudDataProvider>
                          <AthleteProvider>
                            <Index />
                          </AthleteProvider>
                        </CloudDataProvider>
                      </OnboardingGate>
                    </AuthGate>
                  }
                />
                <Route
                  path="/templates"
                  element={
                    <AuthGate>
                      <OnboardingGate>
                        <CloudDataProvider>
                          <AthleteProvider>
                            <TemplatesPage />
                          </AthleteProvider>
                        </CloudDataProvider>
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
                        <CloudDataProvider>
                          <AthleteProvider>
                            <TestsPage />
                          </AthleteProvider>
                        </CloudDataProvider>
                      </OnboardingGate>
                    </AuthGate>
                  }
                />
                <Route
                  path="/athletes"
                  element={
                    <AuthGate>
                      <OnboardingGate>
                        <CloudDataProvider>
                          <AthleteProvider>
                            <AthletesListPage />
                          </AthleteProvider>
                        </CloudDataProvider>
                      </OnboardingGate>
                    </AuthGate>
                  }
                />
                <Route
                  path="/tfcl-testing-week"
                  element={
                    <AuthGate>
                      <OnboardingGate>
                        <CloudDataProvider>
                          <AthleteProvider>
                            <TFCLTestingWeekPage />
                          </AthleteProvider>
                        </CloudDataProvider>
                      </OnboardingGate>
                    </AuthGate>
                  }
                />
                <Route
125:                   path="/cap-testing-week"
126:                   element={
127:                     <AuthGate>
128:                       <OnboardingGate>
129:                         <CloudDataProvider>
130:                           <AthleteProvider>
131:                             <CAPTestingWeekPage />
132:                           </AthleteProvider>
133:                         </CloudDataProvider>
134:                       </OnboardingGate>
135:                     </AuthGate>
136:                 }
137:                 />
138:                 <Route
139:                   path="/race-simulation"
140:                   element={
141:                     <AuthGate>
142:                       <OnboardingGate>
143:                         <CloudDataProvider>
144:                           <AthleteProvider>
145:                             <RaceSimulationPage />
146:                           </AthleteProvider>
147:                         </CloudDataProvider>
148:                       </OnboardingGate>
149:                     </AuthGate>
150:                   }
151:                 />
                <Route
                  path="*"
                  element={
                    <AuthGate>
                      <OnboardingGate>
                        <CloudDataProvider>
                          <AthleteProvider>
                            <NotFound />
                          </AthleteProvider>
                        </CloudDataProvider>
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
