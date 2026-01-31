/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * APP PROVIDERS WRAPPER
 * 
 * Regroupe tous les providers liés aux données athlète et au Running Focus Mode.
 * Utilisé pour éviter la duplication dans App.tsx.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ReactNode } from "react";
import { CloudDataProvider } from "@/contexts/CloudDataContext";
import { AthleteProvider } from "@/contexts/AthleteContext";
import { RunningFocusModeProvider } from "@/contexts/RunningFocusModeContext";

interface AthleteProvidersProps {
  children: ReactNode;
}

/**
 * Provider combiné qui encapsule CloudData + Athlete + RunningFocusMode
 * Doit être utilisé dans toutes les routes qui nécessitent un accès aux données athlète.
 */
export function AthleteProviders({ children }: AthleteProvidersProps) {
  return (
    <CloudDataProvider>
      <AthleteProvider>
        <RunningFocusModeProvider>
          {children}
        </RunningFocusModeProvider>
      </AthleteProvider>
    </CloudDataProvider>
  );
}
