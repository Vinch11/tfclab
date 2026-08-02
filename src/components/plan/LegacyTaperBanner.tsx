/**
 * LegacyTaperBanner — Option 3 : correction déterministe silencieuse + régénération IA à la demande.
 *
 * Quand `upgradeLegacyTaper` a reclassé a posteriori les dernières semaines d'un
 * plan ancien en « Affûtage », seule l'ÉTIQUETTE change : le contenu reste celui
 * d'un bloc Peak (volume plein, sorties longues). Ce bandeau le dit clairement et
 * propose au coach de régénérer UNIQUEMENT ces semaines (fenêtre IA légère).
 */

import { useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { usePlanAdaptation } from "@/hooks/usePlanAdaptation";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import type { PlanAthleteData, PlanConfig } from "@/hooks/useAITrainingPlan";
import type { LegacyTaperUpgradeReport } from "@/lib/plan/legacyPlanUpgrade";

interface Props {
  report: LegacyTaperUpgradeReport;
  currentPlan: ParsedPlan;
  athleteId: string;
  coachId: string;
  athleteData: PlanAthleteData;
  baseConfig: PlanConfig;
  /** Appelé avec le plan fusionné après régénération IA de la fenêtre d'affûtage. */
  onRegenerated?: (merged: ParsedPlan) => void;
}

export function LegacyTaperBanner({
  report,
  currentPlan,
  athleteId,
  coachId,
  athleteData,
  baseConfig,
  onRegenerated,
}: Props) {
  const adapt = usePlanAdaptation();
  const [done, setDone] = useState(false);

  const weeks = [...report.fixedWeeks].sort((a, b) => a - b);
  const fromWeek = weeks[0];
  const toWeek = weeks[weeks.length - 1];
  const busy = adapt.isApplying || adapt.isRegenStreaming;

  const handleRegen = async () => {
    const merged = await adapt.regenerateWindow({
      athleteId,
      coachId,
      triggeredBy: "coach_manual",
      currentPlan,
      athleteData,
      baseConfig,
      fromWeek,
      toWeek,
      reason:
        `Régénération de l'affûtage (S${fromWeek}→S${toWeek}) — plan ancien reclassé. ` +
        `Volume −40 à −60 % vs pic, intensité et fréquence maintenues (Mujika & Padilla 2003 ; Bosquet 2007). ` +
        `Supprimer les sorties longues, conserver des rappels courts type openers.`,
    });
    if (merged) {
      setDone(true);
      onRegenerated?.(merged);
    }
  };

  if (done) {
    return (
      <Alert className="border-primary/40">
        <RefreshCw className="h-4 w-4" />
        <AlertTitle>Affûtage régénéré (IA)</AlertTitle>
        <AlertDescription className="text-sm">
          Les semaines S{fromWeek} à S{toWeek} ont été réécrites avec un volume d'affûtage.
          Enregistre le plan pour rendre la correction permanente.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive" className="border-destructive/40">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Affûtage recalculé (structure seulement)</AlertTitle>
      <AlertDescription className="space-y-3 text-sm">
        <p>
          Ce plan ancien ne comptait que {report.before} semaine{report.before > 1 ? "s" : ""} d'affûtage
          au lieu de {report.required}. Les semaines{" "}
          <strong>S{weeks.join(", S")}</strong> ont été reclassées automatiquement en « Affûtage » —
          mais <strong>leur contenu n'a pas été adapté</strong> : le volume reste celui d'un bloc de
          développement. Régénère-les pour obtenir un vrai affûtage (volume −40 à −60 %, intensité
          maintenue).
        </p>
        <Button size="sm" variant="outline" onClick={handleRegen} disabled={busy} className="gap-1.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Régénérer les semaines d'affûtage (S{fromWeek}→S{toWeek})
        </Button>
      </AlertDescription>
    </Alert>
  );
}
