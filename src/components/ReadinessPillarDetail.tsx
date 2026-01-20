/**
 * Composant pour afficher le détail de calcul d'un pilier de Race Readiness
 * Affiche le score, la formule de calcul et une explication courte
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { RaceTargets, RaceWeights } from "@/lib/raceReadinessEffectif";

interface PillarCalculation {
  currentValue: number | null;
  targetValue: number;
  rawScore: number; // 0-100
  finalScore: number; // 0-25
  formula: string;
  explanation: string;
  status: "optimal" | "acceptable" | "needs_work" | "missing";
}

interface ReadinessPillarDetailProps {
  pillarKey: "vlamax" | "endurance" | "puissance" | "fraicheur";
  label: string;
  icon: ReactNode;
  value: number; // 0-25
  color: string;
  calculation: PillarCalculation;
  weight: number; // % du score final
}

export function ReadinessPillarDetail({
  pillarKey,
  label,
  icon,
  value,
  color,
  calculation,
  weight,
}: ReadinessPillarDetailProps) {
  const getStatusBadge = (status: PillarCalculation["status"]) => {
    switch (status) {
      case "optimal":
        return (
          <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">
            Optimal
          </span>
        );
      case "acceptable":
        return (
          <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning font-medium">
            Acceptable
          </span>
        );
      case "needs_work":
        return (
          <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">
            À améliorer
          </span>
        );
      default:
        return (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            Données manquantes
          </span>
        );
    }
  };

  const progressPercent = (value / 25) * 100;
  const progressColor =
    progressPercent >= 80
      ? "bg-success"
      : progressPercent >= 60
      ? "bg-warning"
      : "bg-destructive";

  return (
    <Collapsible>
      <div className="p-3 rounded-xl bg-secondary/20 border border-border">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn("w-5 h-5", color)}>{icon}</span>
              <span className="text-sm font-medium text-foreground">{label}</span>
              <span className="text-xs text-muted-foreground">({weight}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("font-mono font-bold", color)}>{value}/25</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform ui-expanded:rotate-180" />
            </div>
          </div>
          <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", progressColor)}
              style={{ width: `${progressPercent}%`, opacity: 0.8 }}
            />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
            {/* Statut */}
            <div className="flex items-center justify-between">
              {getStatusBadge(calculation.status)}
              <span className="text-xs text-muted-foreground">
                Score brut: {Math.round(calculation.rawScore)}/100
              </span>
            </div>

            {/* Valeur actuelle vs cible */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-secondary/40">
                <span className="text-muted-foreground">Actuel</span>
                <p className="font-mono font-bold text-foreground">
                  {calculation.currentValue !== null
                    ? pillarKey === "vlamax"
                      ? calculation.currentValue.toFixed(2)
                      : pillarKey === "endurance"
                      ? `${calculation.currentValue} min`
                      : pillarKey === "puissance"
                      ? `${calculation.currentValue.toFixed(1)} W/kg`
                      : `${Math.round(calculation.rawScore)}%`
                    : "—"}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <span className="text-muted-foreground">Cible</span>
                <p className="font-mono font-bold text-primary">
                  {pillarKey === "vlamax"
                    ? `≤${calculation.targetValue.toFixed(2)}`
                    : pillarKey === "endurance"
                    ? `≥${calculation.targetValue} min`
                    : pillarKey === "puissance"
                    ? `≥${calculation.targetValue.toFixed(1)} W/kg`
                    : "≥70%"}
                </p>
              </div>
            </div>

            {/* Formule de calcul */}
            <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-1">Calcul :</p>
              <p className="text-xs font-mono text-foreground">{calculation.formula}</p>
            </div>

            {/* Explication */}
            <p className="text-xs text-muted-foreground italic">
              💡 {calculation.explanation}
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/**
 * Génère les détails de calcul pour chaque pilier
 */
export function computePillarCalculations(
  readiness: {
    details: { vlamax: number; endurance: number; puissance: number; fraicheur: number };
    targets: RaceTargets;
    weights: RaceWeights;
    inputsUsed: {
      vlamax: { value: number | null; source: string };
      tte: { value: number | null; source: string };
      ftpKg: number | null;
      fatigue_ok: boolean;
      seance_specifique: boolean;
    };
    confidence: number;
  }
): Record<"vlamax" | "endurance" | "puissance" | "fraicheur", PillarCalculation> {
  const { details, targets, inputsUsed, confidence } = readiness;

  // VLamax
  const vlamaxValue = inputsUsed.vlamax.value;
  const vlamaxRawScore = details.vlamax * 4;
  const vlamaxInRange = vlamaxValue !== null && vlamaxValue >= targets.vlamaxMin && vlamaxValue <= targets.vlamaxMax;
  const vlamaxCalculation: PillarCalculation = {
    currentValue: vlamaxValue,
    targetValue: targets.vlamaxIdeal,
    rawScore: vlamaxRawScore,
    finalScore: details.vlamax,
    formula: vlamaxValue !== null
      ? vlamaxInRange
        ? `VLamax ${vlamaxValue.toFixed(2)} ∈ [${targets.vlamaxMin}-${targets.vlamaxMax}] → Score élevé`
        : `VLamax ${vlamaxValue.toFixed(2)} hors cible → Pénalité appliquée`
      : "Donnée manquante → Score neutre (40/100)",
    explanation: vlamaxValue !== null
      ? vlamaxInRange
        ? "Profil glycolytique adapté à l'objectif. Plus proche de l'idéal = meilleur score."
        : vlamaxValue > targets.vlamaxMax
          ? "VLamax trop élevé : risque de surutilisation du glycogène."
          : "VLamax trop bas : manque de punch pour les relances."
      : "Ajoutez un test VLamax pour affiner ce pilier.",
    status: vlamaxValue === null
      ? "missing"
      : vlamaxRawScore >= 80
        ? "optimal"
        : vlamaxRawScore >= 60
          ? "acceptable"
          : "needs_work",
  };

  // TTE (Endurance)
  const tteValue = inputsUsed.tte.value;
  const tteRawScore = details.endurance * 4;
  const tteCalculation: PillarCalculation = {
    currentValue: tteValue,
    targetValue: targets.tteTarget,
    rawScore: tteRawScore,
    finalScore: details.endurance,
    formula: tteValue !== null
      ? tteValue >= targets.tteTarget
        ? `TTE ${tteValue} min ≥ cible ${targets.tteTarget} min → 100%`
        : `TTE ${tteValue} / ${targets.tteTarget} × 100 = ${Math.round((tteValue / targets.tteTarget) * 100)}%`
      : "Donnée manquante → Score faible (30/100)",
    explanation: tteValue !== null
      ? tteValue >= targets.tteTarget
        ? "Capacité d'endurance au seuil atteinte. Excellent pour le format de course."
        : `Il manque ${targets.tteTarget - tteValue} min pour atteindre la cible. Travail d'endurance spécifique recommandé.`
      : "Le TTE est critique pour les épreuves longues. Testez-le pour débloquer l'analyse.",
    status: tteValue === null
      ? "missing"
      : tteRawScore >= 80
        ? "optimal"
        : tteRawScore >= 60
          ? "acceptable"
          : "needs_work",
  };

  // FTP/kg (Puissance)
  const ftpKgValue = inputsUsed.ftpKg;
  const ftpKgRawScore = details.puissance * 4;
  const ftpKgCalculation: PillarCalculation = {
    currentValue: ftpKgValue,
    targetValue: targets.ftpKgTarget,
    rawScore: ftpKgRawScore,
    finalScore: details.puissance,
    formula: ftpKgValue !== null
      ? ftpKgValue >= targets.ftpKgTarget
        ? `FTP/kg ${ftpKgValue.toFixed(1)} ≥ cible ${targets.ftpKgTarget} → 100%+`
        : `FTP/kg ${ftpKgValue.toFixed(1)} / ${targets.ftpKgTarget} × 100 = ${Math.round((ftpKgValue / targets.ftpKgTarget) * 100)}%`
      : "Donnée manquante → Score neutre (40/100)",
    explanation: ftpKgValue !== null
      ? ftpKgValue >= targets.ftpKgTarget
        ? "Puissance relative au poids excellente. Avantage compétitif sur les portions difficiles."
        : `Écart de ${(targets.ftpKgTarget - ftpKgValue).toFixed(1)} W/kg à combler. Focus sur les intervalles au seuil.`
      : "FTP et poids nécessaires pour calculer ce pilier.",
    status: ftpKgValue === null
      ? "missing"
      : ftpKgRawScore >= 80
        ? "optimal"
        : ftpKgRawScore >= 60
          ? "acceptable"
          : "needs_work",
  };

  // Fraîcheur
  const freshnessRawScore = details.fraicheur * 4;
  const freshnessCalculation: PillarCalculation = {
    currentValue: freshnessRawScore,
    targetValue: 70, // Base de 70 attendue
    rawScore: freshnessRawScore,
    finalScore: details.fraicheur,
    formula: `Base 70 ${inputsUsed.fatigue_ok ? "+ 20 (fatigue OK)" : "- 30 (fatigue)"} ${inputsUsed.seance_specifique ? "+ 10 (séance spé)" : ""} ${confidence < 0.5 ? "- 10 (conf. faible)" : ""}`,
    explanation: inputsUsed.fatigue_ok
      ? inputsUsed.seance_specifique
        ? "État de fraîcheur optimal avec séance spécifique validée. Prêt pour la compétition."
        : "Fatigue sous contrôle. Finalisez avec une séance spécifique avant la course."
      : "Signes de fatigue détectés. Priorisez la récupération avant l'objectif.",
    status: freshnessRawScore >= 80
      ? "optimal"
      : freshnessRawScore >= 60
        ? "acceptable"
        : "needs_work",
  };

  return {
    vlamax: vlamaxCalculation,
    endurance: tteCalculation,
    puissance: ftpKgCalculation,
    fraicheur: freshnessCalculation,
  };
}
