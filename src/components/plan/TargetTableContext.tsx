/**
 * Contexte léger pour exposer la TargetTable de l'athlète courant aux
 * composants d'affichage du plan (SessionCard, exports). Le JSON du plan
 * reste 100% RELATIF ; ce contexte fournit uniquement les valeurs absolues
 * pour l'annotation à l'affichage (renderIntensities.enrichWithAbsoluteValues).
 */
import { createContext, useContext, type ReactNode } from "react";
import type { TargetTable } from "@/lib/plan/targetTable";

const TargetTableCtx = createContext<TargetTable | null>(null);

export function TargetTableProvider({ value, children }: { value: TargetTable | null; children: ReactNode }) {
  return <TargetTableCtx.Provider value={value}>{children}</TargetTableCtx.Provider>;
}

export function useTargetTable(): TargetTable | null {
  return useContext(TargetTableCtx);
}
