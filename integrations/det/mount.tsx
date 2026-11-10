import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {TooltipProvider} from '@/components/ui/tooltip';
import {Toaster} from 'sonner';
import {AuthProvider,useAuth} from '@/contexts/AuthContext';
import {CloudDataProvider} from '@/contexts/CloudDataContext';
import {AthleteProvider} from '@/contexts/AthleteContext';
import PlanningPage from '@/pages/AITrainingPlanPage';
import '@/index.css';
function Home(){
 const {user,loading}=useAuth();
 if(loading)return <p>Lecture de la session du coach…</p>;
 if(!user)return <main className="p-6"><h1>DET-ENGINE · TFCLab 2.1</h1><p>Ouvrez une session coach sur TFCLab, puis revenez au formulaire DET.</p><a href="/auth">Connexion TFCLab</a></main>;
 return <CloudDataProvider><AthleteProvider><PlanningPage/></AthleteProvider></CloudDataProvider>;
}
createRoot(document.getElementById('det-root')!).render(<MemoryRouter initialEntries={['/planning/ai-plan']}><QueryClientProvider client={new QueryClient()}><TooltipProvider><AuthProvider><Home/></AuthProvider><Toaster/></TooltipProvider></QueryClientProvider></MemoryRouter>);
