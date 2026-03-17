import { computeRaceReadinessEffectif, type RaceReadinessEffectif } from "@/lib/raceReadinessEffectif";
/**
 * Synthèse Exécutive Card — V2.1
 * Résumé rapide du profil athlète basé exclusivement sur le Potentiel physiologique
 * ✅ Seuils contextualisés par ambition
 * ✅ Disponibilité retirée du modèle (fatigue trop espacée/imprécise)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, CheckCircle2, AlertTriangle, XCircle, Zap, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VLamaxEffectif, TTEEffectif } from "@/engines/diagnostic";
import { AmbitionLevel, DEFAULT_AMBITION, getAmbitionDefinition } from "@/types/ambitionLevel";
import {
  evaluateVLamax,
  evaluateTTE,
  evaluateFtpKg,
  evaluateVO2max,
  evaluateReadiness,
  type MetricStatus,
} from "@/lib/ambitionThresholds";

interface SyntheseExecutiveCardProps {
  athleteName: string;
  objectif: string;
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  raceReadiness: RaceReadinessEffectif;
  ftp: number | null;
  poids: number | null;
  vo2max: number | null;
  tss7d: number | null;
  completude: { score: number; manquants: string[] };
  ambition?: AmbitionLevel;
}

export function SyntheseExecutiveCard({
  athleteName, objectif, vlamaxEffectif, tteEffectif, raceReadiness,
  ftp, poids, vo2max, tss7d, completude, ambition = DEFAULT_AMBITION
}: SyntheseExecutiveCardProps) {
  const ftpKg = ftp && poids && poids > 0 ? ftp / poids : null;
  const ftpKgStr = ftpKg !== null ? ftpKg.toFixed(2) : null;
  const ambDef = getAmbitionDefinition(ambition);

  const readinessEval = evaluateReadiness(
    raceReadiness.isInsufficient ? null : raceReadiness.score,
    ambition
  );

  const readinessColor = readinessEval.status === "ok" ? "text-green-600 dark:text-green-400" 
    : readinessEval.status === "warning" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
  const readinessBg = readinessEval.status === "ok" ? "bg-green-500/10 border-green-500/30"
    : readinessEval.status === "warning" ? "bg-amber-500/10 border-amber-500/30" : "bg-red-500/10 border-red-500/30";
  const readinessLabel = readinessEval.status === "ok" ? "Race Ready" 
    : readinessEval.status === "warning" ? "En progression" : "Préparation requise";

  const statusIcon = (status: MetricStatus) => {
    switch (status) {
      case "ok": return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case "warning": return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      case "critical": return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      default: return <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  // Guard: données insuffisantes
  const isInsufficient = vlamaxEffectif.value === null && !ftp && !vo2max && completude.score === 0;

  if (isInsufficient) {
    return (
      <Card className="opacity-60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Synthèse Exécutive — {athleteName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">Données insuffisantes</p>
            <p className="text-xs mt-1 text-center max-w-xs">
              Ajoutez un snapshot avec FTP, VLamax ou VO₂max pour générer la synthèse.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build summary items with ambition-aware thresholds
  const items: { label: string; value: string; status: MetricStatus; source: string; target: string }[] = [];
  
  if (vlamaxEffectif.value !== null) {
    const eval_ = evaluateVLamax(vlamaxEffectif.value, objectif, ambition);
    items.push({ label: "VLamax", value: `${vlamaxEffectif.value.toFixed(2)} mmol/L/s`, status: eval_.status, source: vlamaxEffectif.source, target: eval_.target });
  }
  
  if (tteEffectif.tte_min > 0) {
    const eval_ = evaluateTTE(tteEffectif.tte_min, objectif, ambition);
    items.push({ label: "TTE", value: `${tteEffectif.tte_min} min`, status: eval_.status, source: tteEffectif.source, target: eval_.target });
  }
  
  if (ftpKgStr) {
    const eval_ = evaluateFtpKg(ftpKg, objectif, ambition);
    items.push({ label: "FTP/kg", value: `${ftpKgStr} W/kg`, status: eval_.status, source: "snapshot", target: eval_.target });
  }
  
  if (vo2max) {
    const eval_ = evaluateVO2max(vo2max, objectif, ambition);
    items.push({ label: "VO₂max", value: `${vo2max} ml/kg/min`, status: eval_.status, source: "snapshot", target: eval_.target });
  }

  // V2.1: Potentiel breakdown (physiological pillars only, no fatigue)
  const potentielPillars = !raceReadiness.isInsufficient && raceReadiness.details ? [
    { key: "Profil Métabolique", value: raceReadiness.details.vlamax, icon: "🧬", description: "VLamax vs cible objectif" },
    { key: "Endurance Spécifique", value: raceReadiness.details.endurance, icon: "🏋️", description: "TTE et durabilité" },
    { key: "Puissance Aérobie", value: raceReadiness.details.puissance, icon: "⚡", description: "FTP/kg et VO₂max" },
  ] : [];

  // Identify the weakest pillar for focus recommendation
  const weakestPillar = potentielPillars.length > 0 
    ? potentielPillars.reduce((min, p) => p.value < min.value ? p : min, potentielPillars[0])
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Synthèse Exécutive — {athleteName}
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {ambDef.icon} {ambDef.shortLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Race Readiness Score — V2.1 Potentiel only */}
        <div className={cn("rounded-xl p-4 border-2 text-center", readinessBg)}>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Race Readiness</p>
          </div>
          <p className={cn("text-4xl font-black mt-1", readinessColor)}>
            {raceReadiness.isInsufficient ? "—" : `${raceReadiness.score}%`}
          </p>
          <p className={cn("text-sm font-semibold", readinessColor)}>{readinessLabel}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {objectif} • Cible : {readinessEval.target}
          </p>
        </div>

        {/* Key indicators grid */}
        <div className="grid grid-cols-2 gap-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              {statusIcon(item.status)}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className="text-[9px] text-muted-foreground/70">{item.target}</p>
                </div>
                <p className="text-sm font-semibold truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* V2.1: Potentiel Pillars (no fraîcheur/fatigue) */}
        {potentielPillars.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-medium">Piliers du Potentiel</p>
            </div>
            <div className="space-y-2">
              {potentielPillars.map((pillar) => {
                const pct = Math.min(100, Math.round((pillar.value / 25) * 100));
                const isWeakest = weakestPillar?.key === pillar.key;
                return (
                  <div key={pillar.key} className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{pillar.icon}</span>
                        <span className={cn(
                          "text-xs",
                          isWeakest ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                        )}>
                          {pillar.key}
                        </span>
                        {isWeakest && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                            Axe prioritaire
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs font-mono font-medium">{pillar.value.toFixed(1)}/25</span>
                    </div>
                    <Progress value={pct} className={cn("h-1.5", isWeakest && "[&>div]:bg-amber-500")} />
                    <p className="text-[10px] text-muted-foreground">{pillar.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Focus recommendation based on weakest pillar */}
        {weakestPillar && (
          <div className="rounded-lg p-3 bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-semibold text-primary">Axe de développement prioritaire</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {weakestPillar.key === "Profil Métabolique" && "Travailler l'abaissement du VLamax via endurance longue, train-low et cadence basse."}
              {weakestPillar.key === "Endurance Spécifique" && "Augmenter le TTE via du volume Z2, des sorties longues progressives et du travail au seuil."}
              {weakestPillar.key === "Puissance Aérobie" && "Développer la puissance aérobie via intervalles VO₂max, sweet-spot et travail de force."}
            </p>
          </div>
        )}

        {/* Data completeness */}
        <div className="rounded-lg p-3 bg-muted/30">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium">Complétude des données</p>
            <Badge variant={completude.score >= 80 ? "default" : "secondary"} className="text-[10px]">
              {completude.score}%
            </Badge>
          </div>
          <Progress value={completude.score} className="h-1.5" />
          {completude.manquants.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Manquant : {completude.manquants.join(", ")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
