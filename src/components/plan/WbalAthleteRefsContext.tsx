/**
 * Contexte léger pour exposer les données CP/W' de l'athlète courant
 * (P30s/P60s/MAP5min/FTP/poids) aux composants d'affichage du plan, afin
 * que le repos affiché sur une fiche avec `wbalProfile` soit recalculé au
 * CP/W' réel de l'athlète (Skiba 2012) plutôt que le repos par défaut de la
 * fiche. Miroir de TargetTableContext.tsx — voir aiPlanWorkoutEnricher.ts
 * (toFiche) et wbalLibraryRecalc.ts (recalcWorkoutRest) pour la logique.
 */
import { createContext, useContext, type ReactNode } from "react";
import type { WbalAthleteRefs } from "@/lib/wbalLibraryRecalc";

const WbalAthleteRefsCtx = createContext<WbalAthleteRefs | null>(null);

export function WbalAthleteRefsProvider({ value, children }: { value: WbalAthleteRefs | null; children: ReactNode }) {
  return <WbalAthleteRefsCtx.Provider value={value}>{children}</WbalAthleteRefsCtx.Provider>;
}

export function useWbalAthleteRefs(): WbalAthleteRefs | null {
  return useContext(WbalAthleteRefsCtx);
}
