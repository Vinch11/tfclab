import { computePotentielEffectif, type PotentielPhysiologiqueEffectif, getScoreColor } from "@/lib/potentielPhysiologiqueEffectif";
import { useState, useEffect, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Target, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Timer, Zap, Trophy, Info, HelpCircle, Apple, Flame, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Athlete, getDernierSnapshot } from "@/types/athlete";
import { reglesTwoForCoaching, ReglesTwoForCoachingResult, PotentielInputs, getPrioriteLabel, getPrioriteColor, getSeancesRecommandees, getSeancesSpecifiques, PrioriteType } from "@/types/reglesTwoForCoaching";
import { SEANCES } from "@/types/seances";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { type VLamaxEffectif, getSourceColor as getVLamaxSourceColor, getConfidenceLabel, type TTEEffectif, getTTESourceColor, getSourceLabel } from "@/engines/diagnostic";
import { TTEGuard, isTTEUnavailable } from "@/components/TTEGuard";
import { computeNutritionEstimate } from "@/lib/nutritionPredictive";
import { computeNutritionTiming, type DigestiveTolerance, getRiskBadgeIcon } from "@/lib/nutritionTiming";
import { computeEnergyDrift, type EnergyDriftResult } from "@/lib/energyDrift";
import { getTargetsForAmbition, normalizeObjective } from "@/lib/physiologicalTargets";
import { normalizeRaceTypeForDisplay } from "@/lib/raceTypeNormalization";
import { AmbitionLevel, DEFAULT_AMBITION, getAthleteAmbition } from "@/types/ambitionLevel";
import type { UnifiedLimiterResult } from "@/lib/v2/unifiedLimiterDetection";
import { ProfileAuditDialog } from "@/components/ProfileAuditDialog";

interface TwoForCoachingAnalysisProps {
  athlete: Athlete;
  vlamaxEffectif?: VLamaxEffectif;
  tteEffectif?: TTEEffectif;
  readiness?: PotentielPhysiologiqueEffectif;
  onGoToSnapshots?: () => void;
  unifiedLimiterResult?: UnifiedLimiterResult | null;
}
const prioriteIcons: Record<PrioriteType, typeof TrendingDown> = {
  VLAMAX_DOWN: TrendingDown,
  VLAMAX_UP: TrendingUp,
  TTE_UP: Timer,
  FTP_UTIL: Zap,
  ENDURANCE_UP: Timer,
  VITESSE_UP: TrendingUp,
  "": CheckCircle2
};

// Recommendations par priorité
const getRecommandationsPriorite = (priorite: PrioriteType): string[] => {
  switch (priorite) {
    case "VLAMAX_DOWN":
      return ["Privilégier les sorties longues Z2 (4-6h)", "Éviter les sprints et intervalles courts", "Séances tempo longues (sweet spot 2x30-40min)"];
    case "VLAMAX_UP":
      return ["Ajouter des sprints courts (5-10s max)", "Intervalles courts haute intensité", "Séances de force explosive"];
    case "TTE_UP":
      return ["Séances au seuil prolongées (2x20-30min)", "Intervalles longs à 95-105% FTP", "Sorties tempo soutenues"];
    case "FTP_UTIL":
      return ["Blocs de travail au seuil (sweet spot)", "Intervalles VO2max (3-5min à 105-115% FTP)", "Progression du volume au seuil"];
    default:
      return ["Maintenir l'équilibre actuel", "Affûtage pré-compétition", "Récupération et fraîcheur"];
  }
};

/**
 * ✅ Dérive les priorités d'entraînement depuis le moteur unifié de limiteurs
 * Garantit la cohérence avec le Coaching Compass et les Facteurs Limitants
 */
function derivePrioritiesFromUnifiedLimiter(
  limiterResult: UnifiedLimiterResult,
  objectif: string | undefined
): ReglesTwoForCoachingResult {
  const priorites: PrioriteType[] = [];
  const alertes: string[] = [];
  
  // ✅ Cohérence UI : on remonte comme priorités tout gap "limiting"
  // ET tout gap "acceptable" où la valeur reste sous la cible affichée.
  // (Les cartes du dashboard montrent ces métriques en warning dans ce cas,
  // donc l'absence de priorité créerait une incohérence visuelle.)
  const isUnderTarget = (g: typeof limiterResult.gapAnalysis[number]): boolean => {
    if (g.value === null || g.target === null || g.target === undefined) return false;
    // VLamax: "sous la cible" signifie au-dessus du max (gap positif = excès)
    if (g.metric === "VLamax") return g.value > g.target;
    // Autres métriques: plus haut est mieux → sous-cible = value < target
    return g.value < g.target;
  };

  const limitingGaps = limiterResult.gapAnalysis
    .filter(g => g.status === "limiting" || (g.status === "acceptable" && isUnderTarget(g)))
    .sort((a, b) => {
      // Limiting strict d'abord, puis par impact pondéré (avec fallback sur l'écart relatif)
      const aPriority = a.status === "limiting" ? 1 : 0;
      const bPriority = b.status === "limiting" ? 1 : 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      const aImpact = a.weightedImpact || Math.abs(a.gapPercent || 0);
      const bImpact = b.weightedImpact || Math.abs(b.gapPercent || 0);
      return bImpact - aImpact;
    });
  
  for (const gap of limitingGaps) {
    switch (gap.metric) {
      case "VLamax": {
        // VLamax trop haute = réduire
        if (gap.value !== null && gap.value > gap.target) {
          if (!priorites.includes("VLAMAX_DOWN")) {
            priorites.push("VLAMAX_DOWN");
            alertes.push(`VLamax trop élevée (${gap.value.toFixed(2)} vs cible ${gap.target.toFixed(2)})`);
          }
        }
        break;
      }
      case "TTE": {
        if (!priorites.includes("TTE_UP")) {
          priorites.push("TTE_UP");
          alertes.push(`TTE insuffisant (${gap.value}min vs cible ${gap.target}min)`);
        }
        break;
      }
      case "FTP/kg": {
        if (!priorites.includes("FTP_UTIL")) {
          priorites.push("FTP_UTIL");
          alertes.push(`FTP/kg insuffisant (${gap.value?.toFixed(1)} vs cible ${gap.target.toFixed(1)} W/kg)`);
        }
        break;
      }
      case "VMA": {
        // VMA limitante → traiter comme FTP_UTIL (expression aérobie)
        if (!priorites.includes("FTP_UTIL")) {
          priorites.push("FTP_UTIL");
          alertes.push(`VMA insuffisante (${gap.value?.toFixed(1)} vs cible ${gap.target.toFixed(1)} km/h)`);
        }
        break;
      }
      case "VO2max": {
        // VO2max bas → développer le moteur (similaire à FTP_UTIL mais côté plafond)
        if (!priorites.includes("FTP_UTIL")) {
          priorites.push("FTP_UTIL");
          alertes.push(`VO2max insuffisant (${gap.value?.toFixed(0)} vs cible ${gap.target.toFixed(0)} ml/kg/min)`);
        }
        break;
      }
      case "FatMax": {
        // FatMax bas → besoin d'endurance / volume Z2
        if (!priorites.includes("ENDURANCE_UP")) {
          priorites.push("ENDURANCE_UP");
          alertes.push(`FatMax insuffisant (${gap.value}% vs cible ${gap.target}%)`);
        }
        break;
      }
      case "Economy":
      case "Durability": {
        if (!priorites.includes("ENDURANCE_UP")) {
          priorites.push("ENDURANCE_UP");
          alertes.push(`${gap.metric} insuffisant`);
        }
        break;
      }
    }
  }
  
  // VLamax trop basse (acceptable gaps peuvent aussi révéler ça)
  const vlamaxGap = limiterResult.gapAnalysis.find(g => g.metric === "VLamax");
  if (vlamaxGap && vlamaxGap.value !== null && vlamaxGap.status === "optimal") {
    // VLamax très basse → peut-être trop basse pour certains objectifs courts
    const obj = (objectif || "").toLowerCase();
    if ((obj.includes("semi") || obj.includes("10k")) && vlamaxGap.value < 0.30) {
      if (!priorites.includes("VLAMAX_UP")) {
        priorites.push("VLAMAX_UP");
        alertes.push("VLamax potentiellement trop basse pour un objectif court");
      }
    }
  }
  
  // Race Ready: aucune métrique critique limitante
  const race_ready = limitingGaps.length === 0;
  
  return {
    priorite: priorites[0] || "",
    priorites,
    alertes,
    race_ready,
  };
}

export function TwoForCoachingAnalysis({
  athlete,
  vlamaxEffectif: vlamaxEffectifProp,
  tteEffectif: tteEffectifProp,
  readiness: readinessProp,
  onGoToSnapshots,
  unifiedLimiterResult
}: TwoForCoachingAnalysisProps) {
  const snapshot = getDernierSnapshot(athlete) as any;
  const [inputs, setInputs] = useState<PotentielInputs>({
    seance_specifique_validee: false,
    fatigue_ok: false
  });

  // Politique projet (insufficient-data-no-fake-defaults) : pas de 0.45 factice.
  // Absence de donnée → value=0, confidence=0, l'UI affiche "Données insuffisantes".
  const vlamaxEffectif = vlamaxEffectifProp ?? {
    value: 0,
    source: "unknown" as const,
    confidence: 0,
    label: "VLamax (données insuffisantes)"
  };

  const vlamax = vlamaxEffectif.value ?? 0;


  // ✅ TTE EFFECTIF - Utilise la prop si fournie
  const tteEffectif = tteEffectifProp ?? {
    tte_min: 45,
    source: "unknown" as const,
    confidence: 0.3,
    label: "TTE (fallback)",
    target: 45,
    status: "warning" as const,
    status_message: "Données manquantes"
  };
  
  // F38: pas de fake 45 min — 0 = données insuffisantes (cf. memory `insufficient-data-no-fake-defaults`)
  const tte = tteEffectif.tte_min ?? 0;

  // ✅ FTP/kg
  const ftp_kg = useMemo(() => {
    if (!snapshot?.ftp || !snapshot?.poids) return 4.0;
    return snapshot.ftp / snapshot.poids;
  }, [snapshot]);
  const [analysis, setAnalysis] = useState<ReglesTwoForCoachingResult>({
    priorite: "",
    priorites: [],
    alertes: [],
    race_ready: false
  });
  
  useEffect(() => {
    // ✅ Si le moteur unifié est disponible, dériver les priorités depuis ses gap analysis
    if (unifiedLimiterResult && unifiedLimiterResult.gapAnalysis?.length > 0) {
      const derivedPriorities = derivePrioritiesFromUnifiedLimiter(unifiedLimiterResult, athlete.objectif);
      setAnalysis(derivedPriorities);
    } else {
      // Fallback: ancien moteur TFCL
      const result = reglesTwoForCoaching(athlete, vlamax, tte, ftp_kg, inputs.seance_specifique_validee, inputs.fatigue_ok);
      setAnalysis(result);
    }
  }, [athlete, vlamax, tte, ftp_kg, inputs, unifiedLimiterResult]);

  const PrioriteIcon = prioriteIcons[analysis.priorite] || CheckCircle2;
  const recommendations = getRecommandationsPriorite(analysis.priorite);
  const seancesRecommandees = getSeancesRecommandees(analysis.priorite);

  // ✅ Targets dynamiques depuis physiologicalTargets (source unique)
  const ambition: AmbitionLevel = getAthleteAmbition(athlete);
  const normalizedObj = normalizeObjective(athlete.objectif || "703");
  const targets = useMemo(() => getTargetsForAmbition(normalizedObj, ambition), [normalizedObj, ambition]);
  
  const ftpTarget = targets.ftp_kg_min;
  const tteTarget = targets.tte_min;
  const vlamaxMin = targets.vlamax.min;
  const vlamaxMax = targets.vlamax.max;

  // =============================================
  // NUTRITION PRÉDICTIVE
  // =============================================
  const nutritionEstimate = useMemo(() => {
    return computeNutritionEstimate({
      vlamax: vlamaxEffectif.value,
      objectif: athlete.objectif || "IM",
      tteMin: tteEffectif.tte_min,
      tteTarget,
    });
  }, [vlamaxEffectif.value, athlete.objectif, tteEffectif.tte_min, tteTarget]);

  // =============================================
  // ÉNERGIE DRIFT + NUTRITION TIMING
  // =============================================
  const sport = useMemo(() => {
    const obj = (athlete.objectif || "").toLowerCase();
    if (obj.includes("marathon") || obj.includes("semi") || obj.includes("trail") || obj.includes("cap")) {
      return "cap" as const;
    }
    return "velo" as const;
  }, [athlete.objectif]);

  const energyDrift = useMemo<EnergyDriftResult>(() => {
    return computeEnergyDrift({
      vlamaxEffectif,
      tteEffectif,
      objectif: athlete.objectif || "IM",
      tss7d: snapshot?.tss_7j ?? null,
    });
  }, [vlamaxEffectif, tteEffectif, athlete.objectif, snapshot]);

  const nutritionTiming = useMemo(() => {
    return computeNutritionTiming({
      vlamax: vlamaxEffectif.value,
      tteMin: tteEffectif.tte_min,
      tteTarget,
      objectif: athlete.objectif || "IM",
      sport,
      digestiveTolerance: "MEDIUM",
      energyDrift,
    });
  }, [vlamaxEffectif.value, tteEffectif.tte_min, tteTarget, athlete.objectif, sport, energyDrift]);

  // ✅ RACE READINESS EFFECTIF - Utilise la prop si fournie (plus de calcul local!)
  const readiness = readinessProp ?? {
    score: 0,
    rawScore: 0,
    label: "Non disponible",
    color: "warning" as const,
    details: { vlamax: 0, endurance: 0, puissance: 0, fraicheur: 0 },
    targets: { vlamaxMin: 0.25, vlamaxMax: 0.45, vlamaxIdeal: 0.35, tteTarget: 50, ftpKgTarget: 4.5 },
    weights: { vlamax: 25, tte: 25, ftpKg: 25, freshness: 25 },
    confidence: 0,
    reasonsMissing: ["Données manquantes"],
    inputsUsed: {
      vlamax: { value: null, source: "unknown" },
      tte: { value: null, source: "unknown" },
      ftpKg: null,
      fatigue_ok: true,
      seance_specifique: false,
    },
    messageStaff: "Ajoutez un snapshot pour activer le calcul.",
    nutritionalRiskIndex: null,
    wasCappedByNutrition: false,
    nutritionalCapReason: null,
  };
  
  const raceScore = readiness.score;
  if (!snapshot) {
    return <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Analyse Two For Coaching Lab™</h2>
            <p className="text-sm text-muted-foreground">Aucun snapshot disponible</p>
          </div>
        </div>
        <p className="text-center text-muted-foreground py-8">Ajoutez un snapshot pour voir l'analyse</p>
      </div>;
  }

  // ✅ GARDE-FOU TTE : afficher un warning si TTE indisponible
  if (isTTEUnavailable(tteEffectif)) {
    return <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Analyse Two For Coaching Lab™</h2>
            <p className="text-sm text-muted-foreground">Objectif: {normalizeRaceTypeForDisplay(athlete.objectif)}</p>
          </div>
        </div>
        <TTEGuard 
          tteEffectif={tteEffectif} 
          athleteName={athlete.nom} 
          onGoToSnapshots={onGoToSnapshots} 
        />
      </div>;
  }
  return <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">Analyse Two For Coaching Lab™</h2>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="p-1 rounded-full hover:bg-secondary/50 transition-colors">
                    <Info className="w-4 h-4 text-muted-foreground hover:text-primary" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[420px] p-4 bg-card border-border">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Target className="w-4 h-4" />
                      </div>
                      <h4 className="font-semibold text-foreground">À propos de cette analyse</h4>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">Two For Coaching Lab Method™</strong> est une méthodologie d'analyse physiologique appliquée à l'entraînement d'endurance, conçue pour aider les coachs à interpréter des données complexes et guider la prise de décision stratégique.
                    </p>
                    <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Les valeurs présentées (VLamax, TTE, Potentiel Physiologique) sont des <strong className="text-foreground">estimations modélisées</strong>. Elle ne remplace ni l'expertise du coach, ni un test physiologique de laboratoire.
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground italic mt-2">
                      S'inspire des travaux de Mader, Heck, Jones, Burnley, Seiler — implémentation indépendante et propriétaire.
                    </p>
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs text-muted-foreground">
                        👉 <span className="font-medium text-foreground">Outil d'aide à la décision</span> — ne remplace pas le jugement du coach ni un test physiologique complet.
                      </p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-sm text-muted-foreground">Objectif: {normalizeRaceTypeForDisplay(athlete.objectif)}</p>
          </div>
        </div>

        {/* Race Ready Badge + bouton audit profil */}
        <div className="flex items-center gap-2">
          <ProfileAuditDialog
            snapshot={getDernierSnapshot(athlete) ?? {}}
            athleteName={athlete.prenom ?? "Athlète"}
            athleteGoal={athlete.objectif}
            variant="compact"
          />
          <div className={cn("px-4 py-2 rounded-xl flex items-center gap-2", readiness.score >= 80 ? "bg-success/10 border border-success/30" : "bg-secondary/50 border border-border")}>
            {readiness.score >= 80 ? <>
                <Trophy className="w-5 h-5 text-success" />
                <span className="font-semibold text-success">Race Ready</span>
              </> : <>
                <Target className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground">En préparation</span>
              </>}
          </div>
        </div>
      </div>

      {/* Potentiel Physiologique Score */}
      <div className="mb-6 p-4 rounded-xl bg-secondary/30 border border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Score Potentiel Physiologique Objectif</span>
          <span className={cn("text-2xl font-bold font-mono", getScoreColor(raceScore))}>{raceScore}%</span>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden mb-2">
          <div className={cn("h-full rounded-full transition-all duration-500", raceScore >= 80 ? "bg-success" : raceScore >= 60 ? "bg-warning" : "bg-destructive")} style={{
          width: `${raceScore}%`
        }} />
        </div>
        <p className={cn("text-sm font-medium", getScoreColor(raceScore))}>{readiness.label}</p>
        
        {/* Résumé Risque Nutritionnel */}
        {readiness.nutritionalRiskIndex && (
          <div className={cn(
            "mt-3 p-2 rounded-lg flex items-center gap-2 text-xs",
            readiness.nutritionalRiskIndex.level === 'low' ? 'bg-success/10 text-success' :
            readiness.nutritionalRiskIndex.level === 'moderate' ? 'bg-warning/10 text-warning' :
            'bg-destructive/10 text-destructive'
          )}>
            <span>{readiness.nutritionalRiskIndex.icon}</span>
            <span>Risque nutritionnel : <strong>{readiness.nutritionalRiskIndex.label}</strong></span>
            {readiness.wasCappedByNutrition && (
              <span className="ml-auto text-destructive">⚠️ Plafonné</span>
            )}
          </div>
        )}
        
        {/* Résumé Économie de Course (CAP) */}
        {'runningEconomy' in readiness && readiness.runningEconomy?.isApplicable && (
          <div className={cn(
            "mt-2 p-2 rounded-lg flex items-center gap-2 text-xs",
            readiness.runningEconomy.color === 'success' ? 'bg-success/10 text-success' :
            readiness.runningEconomy.color === 'warning' ? 'bg-warning/10 text-warning' :
            readiness.runningEconomy.color === 'orange' ? 'bg-orange-500/10 text-orange-600' :
            'bg-destructive/10 text-destructive'
          )}>
            <span>{readiness.runningEconomy.levelIcon}</span>
            <span>Économie de course : <strong>{readiness.runningEconomy.levelLabel}</strong></span>
            {'wasCappedByEconomy' in readiness && readiness.wasCappedByEconomy && (
              <span className="ml-auto text-destructive">🏃 Plafonné</span>
            )}
          </div>
        )}
      </div>

      {/* Current Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-3 rounded-xl bg-secondary/20 border border-border">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground mb-1">VLamax</p>
            <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", getVLamaxSourceColor(vlamaxEffectif.source))}>
              {vlamaxEffectif.source}
            </span>
          </div>
          <p className={cn("text-lg font-bold font-mono", vlamax > vlamaxMax ? "text-warning" : vlamax < vlamaxMin ? "text-destructive" : "text-success")}>
            {vlamaxEffectif.value !== null ? vlamaxEffectif.value.toFixed(2) : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            conf {Math.round(vlamaxEffectif.confidence * 100)}% • Cible: {vlamaxMin.toFixed(2)}-{vlamaxMax.toFixed(2)}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-secondary/20 border border-border">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground mb-1">TTE</p>
            <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", getTTESourceColor(tteEffectif.source))}>
              {getSourceLabel(tteEffectif.source)}
            </span>
          </div>

          <p className={cn("text-lg font-bold font-mono", tte < tteTarget ? "text-warning" : "text-success")}>
            {tteEffectif.tte_min !== null ? `${tteEffectif.tte_min} min` : "—"}
          </p>

          <p className="text-xs text-muted-foreground">
            Cible: ≥{tteTarget} min • conf {Math.round(tteEffectif.confidence * 100)}%
          </p>
        </div>

        <div className="p-3 rounded-xl bg-secondary/20 border border-border">
          <p className="text-xs text-muted-foreground mb-1">FTP</p>
          <p className={cn("text-lg font-bold font-mono", ftp_kg < ftpTarget ? "text-warning" : "text-success")}>
            {ftp_kg.toFixed(1)} W/kg
          </p>
          <p className="text-xs text-muted-foreground">Cible: ≥{ftpTarget} W/kg</p>
        </div>

        <div className="p-3 rounded-xl bg-secondary/20 border border-border">
          <p className="text-xs text-muted-foreground mb-1">TSS 7d</p>
          <p className="text-lg font-bold font-mono text-primary">{snapshot.tss_7j ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Charge hebdo</p>
        </div>
      </div>




      {/* Alerts */}
      {analysis.alertes.length > 0 && <div className="mb-6 p-4 rounded-xl bg-warning/10 border border-warning/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <span className="font-medium text-warning">Alertes</span>
          </div>
          <ul className="space-y-2">
            {analysis.alertes.map((alerte, idx) => <li key={idx} className="flex items-start gap-2 text-sm text-warning">
                <span>•</span>
                {alerte}
              </li>)}
          </ul>
        </div>}

      {/* Priorities & Recommendations */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <p className="text-xs text-muted-foreground uppercase mb-3 font-semibold">Priorités Entraînement</p>
        
        {analysis.priorites.length === 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--success)/0.1)] border border-[hsl(var(--success)/0.2)]">
            <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" />
            <p className="text-sm font-medium text-[hsl(var(--success))]">Aucune priorité — profil dans les cibles</p>
          </div>
        )}

        <div className="space-y-3">
          {analysis.priorites.map((prio, idx) => {
            const PIcon = prioriteIcons[prio] || CheckCircle2;
            const recs = getRecommandationsPriorite(prio);
            const seances = getSeancesRecommandees(prio);
            const isPrimary = idx === 0;

            return (
              <div key={prio} className={cn(
                "rounded-lg border p-3",
                isPrimary ? "border-primary/30 bg-primary/5" : "border-border/50 bg-card"
              )}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={cn(
                    "flex items-center justify-center rounded-full text-[10px] font-bold shrink-0",
                    isPrimary ? "h-5 w-5 bg-primary text-primary-foreground" : "h-5 w-5 bg-muted text-muted-foreground"
                  )}>
                    {idx + 1}
                  </div>
                  <PIcon className={cn("w-4 h-4", getPrioriteColor(prio))} />
                  <p className={cn("text-sm font-semibold", getPrioriteColor(prio))}>
                    {getPrioriteLabel(prio)}
                  </p>
                  {isPrimary && (
                    <Badge variant="outline" className="text-[9px] px-1.5 border-primary/40 text-primary">Principal</Badge>
                  )}
                </div>

                {/* Recommendations for this priority */}
                <ul className="space-y-1 ml-7">
                  {recs.map((rec, ridx) => (
                    <li key={ridx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <span className="text-primary">→</span>
                      {rec}
                    </li>
                  ))}
                </ul>

                {/* Séances recommandées */}
                {seances.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 ml-7">
                    {seances.map(code => {
                      const seance = SEANCES[code as keyof typeof SEANCES];
                      return seance ? (
                        <div key={code} className="px-2 py-1 rounded bg-primary/10 border border-primary/20">
                          <span className="text-xs font-mono font-semibold text-primary">{code}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">{seance.objectif}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 🍝 FUELING RECOMMANDÉ - Encart final cohérent avec l'analyse métabolique */}
      {nutritionEstimate && (
        <div className={cn(
          "mt-6 p-4 rounded-xl border-2",
          nutritionEstimate.nutritionalRiskIndex.level === 'low' ? 'bg-success/5 border-success/30' :
          nutritionEstimate.nutritionalRiskIndex.level === 'moderate' ? 'bg-warning/5 border-warning/30' :
          'bg-destructive/5 border-destructive/30'
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Apple className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Fueling recommandé</h3>
            </div>
            <div className={cn(
              "flex items-center gap-1 px-3 py-1 rounded-full text-sm",
              nutritionEstimate.nutritionalRiskIndex.level === 'low' ? 'bg-success/10 text-success' :
              nutritionEstimate.nutritionalRiskIndex.level === 'moderate' ? 'bg-warning/10 text-warning' :
              'bg-destructive/10 text-destructive'
            )}>
              <span>{nutritionEstimate.nutritionalRiskIndex.icon}</span>
              <span className="font-medium">{nutritionEstimate.nutritionalRiskIndex.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Flame className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Glucides cible</p>
                <p className="text-xl font-bold font-mono text-foreground">
                  {nutritionEstimate.carbsMin}–{nutritionEstimate.carbsMax} g/h
                </p>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">VLamax: <span className="font-medium text-foreground">{nutritionEstimate.vlamaxLabel}</span></p>
              <p className="text-xs text-muted-foreground">Zone de tolérance: <span className="font-medium text-foreground">{nutritionEstimate.nutritionalRiskIndex.toleranceZone} g/h</span></p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {nutritionEstimate.nutritionalRiskIndex.messagePedagogique}
          </p>

          {nutritionEstimate.nutritionalRiskIndex.potentielPhysiologiqueCap && (
            <div className="mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-destructive">
                ⚠️ Potentiel Physiologique plafonné à {nutritionEstimate.nutritionalRiskIndex.potentielPhysiologiqueCap}% – {nutritionEstimate.nutritionalRiskIndex.mainRiskFactor}
              </p>
            </div>
          )}

          {/* Timing par phases (résumé compact) */}
          {!nutritionTiming.isDataInsufficient && nutritionTiming.phases.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Timing par phases</span>
                <span className={cn(
                  "ml-auto px-2 py-0.5 rounded text-xs",
                  nutritionTiming.riskBadgeColor === "success" ? "bg-success/10 text-success" :
                  nutritionTiming.riskBadgeColor === "warning" ? "bg-warning/10 text-warning" :
                  "bg-destructive/10 text-destructive"
                )}>
                  {getRiskBadgeIcon(nutritionTiming.riskBadge)} {nutritionTiming.riskBadgeLabel}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {nutritionTiming.phases.map((phase) => (
                  <div key={phase.name} className="p-2 rounded-lg bg-secondary/30 border border-border text-center">
                    <p className="text-xs text-muted-foreground">{phase.label}</p>
                    <p className="text-lg font-bold font-mono text-foreground">{phase.carbsGh}</p>
                    <p className="text-[10px] text-muted-foreground">g/h</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>;
}