/**
 * Composant Toggle AVANT/APRÈS pour les cartes VLamax/TTE
 * Permet de basculer entre la vue modélisée et calibrée
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Beaker, FlaskConical } from "lucide-react";

interface CalibrationToggleProps {
  mode: "before" | "after";
  onChange: (mode: "before" | "after") => void;
  hasCalibration: boolean;
  className?: string;
}

export function CalibrationToggle({
  mode,
  onChange,
  hasCalibration,
  className,
}: CalibrationToggleProps) {
  if (!hasCalibration) {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <Beaker className="h-3.5 w-3.5" />
        <span>Modèle uniquement</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 p-0.5 bg-muted rounded-lg", className)}>
      <button
        type="button"
        onClick={() => onChange("before")}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
          mode === "before"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Beaker className="h-3.5 w-3.5" />
        AVANT
      </button>
      <button
        type="button"
        onClick={() => onChange("after")}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
          mode === "after"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <FlaskConical className="h-3.5 w-3.5" />
        APRÈS
      </button>
    </div>
  );
}

/**
 * Hook pour gérer l'état du toggle
 */
export function useCalibrationToggle(hasCalibration: boolean) {
  const [mode, setMode] = useState<"before" | "after">(hasCalibration ? "after" : "before");
  
  return {
    mode,
    setMode,
    isCalibrated: mode === "after" && hasCalibration,
  };
}
