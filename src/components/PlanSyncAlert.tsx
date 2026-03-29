/**
 * PlanSyncAlert — Shows a banner when key physiological metrics change
 * and the athlete has an existing AI plan that may need updating.
 */

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { MetricChange } from "@/hooks/usePlanSnapshotSync";

interface PlanSyncAlertProps {
  athleteName: string;
  athleteId: string;
  changes: MetricChange[];
  onDismiss: () => void;
}

export function PlanSyncAlert({ athleteName, athleteId, changes, onDismiss }: PlanSyncAlertProps) {
  const navigate = useNavigate();

  const handleGoToPlan = () => {
    navigate("/plan-ia", { state: { athleteId, autoRegenerate: true } });
  };

  return (
    <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20 relative">
      <RefreshCw className="h-4 w-4 text-amber-600" />
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={onDismiss}
      >
        <X className="h-3 w-3" />
      </Button>
      <AlertTitle className="text-sm font-semibold text-amber-800 dark:text-amber-200">
        Plan IA à mettre à jour — {athleteName}
      </AlertTitle>
      <AlertDescription className="text-xs text-amber-700 dark:text-amber-300 space-y-2">
        <p>
          Des métriques clés ont changé depuis la dernière génération du plan :
        </p>
        <div className="flex flex-wrap gap-1.5">
          {changes.map((c) => (
            <span
              key={c.metric}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-[10px] font-medium"
            >
              {c.label}: {c.oldValue} → {c.newValue} ({c.delta})
            </span>
          ))}
        </div>
        <p className="text-[10px] text-amber-600 dark:text-amber-400">
          Le plan actuel sera archivé automatiquement avant toute régénération.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-1 h-7 text-xs gap-1 border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300"
          onClick={handleGoToPlan}
        >
          Mettre à jour le plan <ArrowRight className="h-3 w-3" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
