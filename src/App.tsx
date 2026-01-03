import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AthleteProvider } from "@/contexts/AthleteContext";
import { AuthGate } from "@/components/AuthGate";
import AuthPage from "./pages/AuthPage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

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
                  path="/"
                  element={
                    <AuthGate>
                      <AthleteProvider>
                        <Index />
                      </AthleteProvider>
                    </AuthGate>
                  }
                />
                <Route
                  path="*"
                  element={
                    <AuthGate>
                      <AthleteProvider>
                        <NotFound />
                      </AthleteProvider>
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
