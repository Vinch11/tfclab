/**
 * Comprendre Mes Scores — Explication pédagogique des métriques TFCL
 * ✅ Seuils contextualisés par ambition (plus de seuils fixes universels)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Target, Zap, Timer, Apple, Activity, AlertTriangle } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { AmbitionLevel, DEFAULT_AMBITION, getAmbitionDefinition } from "@/types/ambitionLevel";
import {
  evaluateVLamax,
  evaluateTTE,
  evaluateFtpKg,
  evaluateVO2max,
  evaluateReadiness,
} from "@/lib/ambitionThresholds";

interface ScoreExplanation {
  id: string;
  icon: React.ReactNode;
  label: string;
  value: string | null;
  status: "ok" | "warning" | "critical" | "neutral";
  whatItMeans: string;
  howToImprove: string;
  targetRange: string;
}

interface ComprendreScoresCardProps {
  vlamaxValue: number | null;
  tteMin: number;
  ftpKg: number | null;
  vo2max: number | null;
  readinessScore: number | null;
  objectif: string;
  ambition?: AmbitionLevel;
  className?: string;
}

export function ComprendreScoresCard({
  vlamaxValue, tteMin, ftpKg, vo2max, readinessScore, objectif, ambition = DEFAULT_AMBITION, className
}: ComprendreScoresCardProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  // Guard: données insuffisantes
  const isInsufficient = vlamaxValue === null && ftpKg === null && vo2max === null && (readinessScore === null || readinessScore === 0);

  if (isInsufficient) {
    return (
      <Card className={cn("opacity-60", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            Comprendre mes scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">Données insuffisantes</p>
            <p className="text-xs mt-1 text-center max-w-xs">
              Ajoutez un snapshot avec vos données physiologiques pour voir l'analyse de vos scores.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isLongDistance = ["IM", "Ironman", "Marathon", "703", "Half", "Ultra", "TrailLong"].includes(objectif);
  const ambDef = getAmbitionDefinition(ambition);

  // Évaluations dynamiques par ambition
  const vlamaxEval = evaluateVLamax(vlamaxValue, objectif, ambition);
  const tteEval = evaluateTTE(tteMin || null, objectif, ambition);
  const ftpKgEval = evaluateFtpKg(ftpKg, objectif, ambition);
  const readinessEval = evaluateReadiness(readinessScore, ambition);

  const scores: ScoreExplanation[] = [
    {
      id: "vlamax",
      icon: <Zap className="h-4 w-4" />,
      label: "VLamax",
      value: vlamaxValue !== null ? `${vlamaxValue.toFixed(2)} mmol/L/s` : null,
      status: vlamaxEval.status,
      whatItMeans: "La VLamax mesure votre capacité glycolytique maximale. Plus elle est basse, mieux vous utilisez les graisses comme source d'énergie — un atout crucial en endurance longue distance.",
      howToImprove: "Séances Z2 longues (3-5h), tempo prolongé, éviter les sprints courts en période de préparation foncière.",
      targetRange: vlamaxEval.target,
    },
    {
      id: "tte",
      icon: <Timer className="h-4 w-4" />,
      label: "TTE (Time To Exhaustion)",
      value: tteMin > 0 ? `${tteMin} min` : null,
      status: tteEval.status,
      whatItMeans: "Le TTE représente combien de temps vous pouvez tenir à votre seuil fonctionnel (FTP). Plus il est élevé, plus vous maintenez une intensité élevée longtemps.",
      howToImprove: "Blocs de travail au seuil (2x20-30min), intervalles longs à 95-105% FTP, progression du volume au seuil.",
      targetRange: tteEval.target,
    },
    {
      id: "ftpkg",
      icon: <Activity className="h-4 w-4" />,
      label: "FTP/kg",
      value: ftpKg !== null ? `${ftpKg.toFixed(2)} W/kg` : null,
      status: ftpKgEval.status,
      whatItMeans: "Votre puissance au seuil rapportée au poids. C'est l'indicateur le plus utilisé pour comparer la performance cycliste relative entre athlètes.",
      howToImprove: "Sweet spot (88-93% FTP), intervalles VO2max, optimisation du poids corporel.",
      targetRange: ftpKgEval.target,
    },
    {
      id: "readiness",
      icon: <Target className="h-4 w-4" />,
      label: "Race Readiness",
      value: readinessScore !== null ? `${readinessScore}/100` : null,
      status: readinessEval.status,
      whatItMeans: "Score composite évaluant votre préparation globale pour votre objectif. Il combine profil métabolique, endurance, puissance et fraîcheur.",
      howToImprove: "Améliorer les indicateurs individuels (VLamax, TTE, FTP/kg) et assurer une bonne récupération.",
      targetRange: readinessEval.target,
    },
  ];

  if (vo2max !== null) {
    const vo2Eval = evaluateVO2max(vo2max, objectif, ambition);
    scores.splice(2, 0, {
      id: "vo2max",
      icon: <Activity className="h-4 w-4" />,
      label: "VO2max",
      value: `${vo2max.toFixed(1)} mL/kg/min`,
      status: vo2Eval.status,
      whatItMeans: "Votre consommation maximale d'oxygène. C'est le « moteur » aérobie — plus il est élevé, plus votre plafond de performance est haut.",
      howToImprove: "Intervalles VO2max (3-5min à 105-120% FTP), séances de côtes, course à pied en VMA.",
      targetRange: vo2Eval.target,
    });
  }

  const statusColor = (s: ScoreExplanation["status"]) => {
    switch (s) {
      case "ok": return "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400";
      case "warning": return "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400";
      case "critical": return "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400";
      default: return "bg-muted/50 border-border text-muted-foreground";
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            Comprendre mes scores
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {ambDef.icon} {ambDef.shortLabel}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Cibles ajustées pour le niveau <strong>{ambDef.label}</strong>. Cliquez sur un indicateur pour comprendre sa signification.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {scores.map((score) => (
          <Collapsible
            key={score.id}
            open={openId === score.id}
            onOpenChange={(open) => setOpenId(open ? score.id : null)}
          >
            <CollapsibleTrigger className="w-full">
              <div className={cn(
                "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                statusColor(score.status)
              )}>
                <div className="flex items-center gap-2">
                  {score.icon}
                  <span className="text-sm font-medium">{score.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">
                    {score.value || "—"}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Cible: {score.targetRange}
                  </Badge>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-3 ml-6 mt-1 space-y-2 text-sm border-l-2 border-primary/20">
                <div>
                  <p className="font-medium text-xs text-primary mb-1">Qu'est-ce que c'est ?</p>
                  <p className="text-muted-foreground text-xs">{score.whatItMeans}</p>
                </div>
                <div>
                  <p className="font-medium text-xs text-primary mb-1">Comment améliorer ?</p>
                  <p className="text-muted-foreground text-xs">{score.howToImprove}</p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
