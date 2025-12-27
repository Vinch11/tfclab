import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AthleteProvider } from "@/contexts/AthleteContext";
import AthletesListPage from "./pages/AthletesListPage";
import AthleteEditPage from "./pages/AthleteEditPage";
import SnapshotSyncPage from "./pages/SnapshotSyncPage";
import DashboardPage from "./pages/DashboardPage";
import SemaineTypePage from "./pages/SemaineTypePage";
import Bloc3SemainesPage from "./pages/Bloc3SemainesPage";
import EvolutionPage from "./pages/EvolutionPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AthleteProvider>
          <Routes>
            <Route path="/" element={<AthletesListPage />} />
            <Route path="/athlete/:id" element={<AthleteEditPage />} />
            <Route path="/snapshot" element={<SnapshotSyncPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/semaine" element={<SemaineTypePage />} />
            <Route path="/bloc" element={<Bloc3SemainesPage />} />
            <Route path="/evolution" element={<EvolutionPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AthleteProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
