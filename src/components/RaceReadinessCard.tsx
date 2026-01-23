import { useMemo, useState } from "react";
import { Target, TrendingUp, Zap, Heart, Activity, ChevronRight, HelpCircle, Footprints, AlertTriangle, Battery, BatteryLow, TrendingDown, Shield, Info, ChevronDown, ChevronUp, Bike, PersonStanding, User, CheckCircle2 } from "lucide-react";
import { ProfileRadarChart } from "@/components/ProfileRadarChart";
import { cn } from "@/lib/utils";
import { useCloudData } from "@/hooks/useCloudData";
import type { DbSnapshot } from "@/hooks/useCloudData";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { VLamaxEffectif, getSourceColor as getVLamaxSourceColor, getConfidenceLabel } from "@/lib/vlamaxEffectif";
import { TTEEffectif, getSourceColor as getTTESourceColor, getSourceLabel } from "@/lib/tteEffectif";
import { RaceReadinessEffectif, getScoreColor, getScoreBgColor, getObjectifLabel, RACE_READINESS_METHODOLOGY, SPORT_SPECIFICITY, SPORT_COMPARISON_TEXT, type RaceReadinessSport } from "@/lib/raceReadinessEffectif";
import { TTEGuard, isTTEUnavailable } from "@/components/TTEGuard";
import { getEconomyRaceReadinessBonus } from "@/lib/runningEconomySnapshot";
import { EnergyDriftResult, getFactorLabel, getFactorColor } from "@/lib/energyDrift";
import { computeAgeAdjustmentIndex } from "@/lib/ageAdjustment";
import { ReadinessPillarDetail, computePillarCalculations } from "@/components/ReadinessPillarDetail";

interface RaceReadinessCardProps {
  athlete: any;
  vlamaxEffectif?: VLamaxEffectif;
  tteEffectif?: TTEEffectif;
  readiness?: RaceReadinessEffectif;
  energyDrift?: EnergyDriftResult;
  athleteAge?: number | null; // ✅ AJOUT pour badge d'ajustement âge
  onGoToSnapshots?: () => void;
  onGoToMethodology?: () => void;
  /** Mode compact pour le dashboard - affiche score + bouton expand */
  compact?: boolean;
  /** État initial du mode compact (déplié ou non) */
  defaultExpanded?: boolean;
}
// Fonction utilitaire pour récupérer le snapshot effectif
function pickEffectiveSnapshot(snapshots: DbSnapshot[], athleteId: string, activeSnapshotId?: string | null) {
  const list = snapshots.filter(s => s.athlete_id === athleteId);
  if (list.length === 0) return null;
  if (activeSnapshotId) {
    const active = list.find(s => s.id === activeSnapshotId);
    if (active) return active;
  }
  return [...list].sort((a, b) => a.date < b.date ? 1 : -1)[0];
}
export function RaceReadinessCard({
  athlete,
  vlamaxEffectif: vlamaxEffectifProp,
  tteEffectif: tteEffectifProp,
  readiness: readinessProp,
  energyDrift,
  athleteAge,
  onGoToSnapshots,
  onGoToMethodology,
  compact = false,
  defaultExpanded = false,
}: RaceReadinessCardProps) {
  const {
    snapshots
  } = useCloudData();
  const snap = useMemo(() => {
    return pickEffectiveSnapshot(snapshots as any, athlete.id, athlete.active_snapshot_id ?? null);
  }, [snapshots, athlete.id, athlete.active_snapshot_id]);
  
  // ✅ VLamax EFFECTIF - Utilise la prop si fournie, sinon fallback
  const vlamaxEffectif = vlamaxEffectifProp ?? { 
    value: null, 
    source: "unknown" as const, 
    confidence: 0.2, 
    label: "VLamax (non disponible)" 
  };

  // ✅ TTE EFFECTIF - Utilise la prop si fournie
  const tteEffectif = tteEffectifProp ?? {
    tte_min: null,
    source: "unknown" as const,
    confidence: 0,
    label: "TTE (non disponible)",
    target: 45,
    status: "critical" as const,
    status_message: "Données manquantes"
  };
  
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
    confidenceInterpretation: {
      level: "indicative" as const,
      label: "Score indicatif",
      message: "Données insuffisantes pour une analyse fiable."
    },
    reasonsMissing: ["Données manquantes"],
    inputsUsed: {
      vlamax: { value: null, source: "unknown" },
      tte: { value: null, source: "unknown" },
      ftpKg: null,
      fatigue_ok: true,
      seance_specifique: false,
    },
    messageStaff: "Ajoutez un snapshot (FTP + poids) et un TTE pour activer le calcul.",
    whyThisScore: "Données insuffisantes pour générer l'explication.",
    interpretation: {
      status: "not_ready" as const,
      statusLabel: "Données insuffisantes",
      mainStrengths: [],
      mainLimitations: ["Ajoutez un snapshot pour débloquer l'analyse"],
      priorityActions: ["Créer un snapshot avec FTP, poids, TSS 7d"],
    },
    // Propriétés économie de course (null par défaut)
    runningEconomy: null,
    wasCappedByEconomy: false,
    economyCapReason: null,
    // Propriétés nutritionnelles (null par défaut)
    nutritionalRiskIndex: null,
    wasCappedByNutrition: false,
    nutritionalCapReason: null,
    // Spécificité sport (défaut vélo)
    sport: "velo" as RaceReadinessSport,
    sportSpecificity: SPORT_SPECIFICITY.velo,
  };
  
  // État pour le panneau méthodologie
  const [showMethodology, setShowMethodology] = useState(false);
  
  // État pour le mode compact (expansion/collapse)
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // ✅ Calcul de l'info d'ajustement par âge (comme Compass)
  const ageInfo = useMemo(() => computeAgeAdjustmentIndex(athleteAge ?? null), [athleteAge]);
  const isAgeAdjusted = ageInfo.category === "master1" || ageInfo.category === "master2";
  
  const scoreColor = getScoreColor(readiness.score);
  const scoreBg = getScoreBgColor(readiness.score);

  // Gérer le cas où il n'y a pas de snapshot
  if (!snap) {
    return <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-warning/10 text-warning">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Race Readiness</h2>
            <p className="text-sm text-muted-foreground">Aucun snapshot disponible</p>
          </div>
        </div>
        {readiness.reasonsMissing.length > 0 && (
          <div className="text-sm text-muted-foreground space-y-1 mt-4">
            {readiness.reasonsMissing.map((reason, i) => (
              <p key={i}>• {reason}</p>
            ))}
          </div>
        )}
      </div>;
  }

  const pillarsData = [{
    key: "vlamax",
    label: "VLamax",
    icon: Zap,
    value: readiness.details.vlamax,
    color: "text-primary"
  }, {
    key: "endurance",
    label: "Endurance",
    icon: Activity,
    value: readiness.details.endurance,
    color: "text-accent"
  }, {
    key: "puissance",
    label: "Puissance",
    icon: TrendingUp,
    value: readiness.details.puissance,
    color: "text-warning"
  }, {
    key: "fraicheur",
    label: "Disponibilité",
    icon: Heart,
    value: readiness.details.fraicheur,
    color: "text-success"
  }];

  // Calcul détaillé des piliers
  const pillarCalculations = computePillarCalculations(readiness);

  // Mode compact : header cliquable + contenu collapsible
  if (compact) {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="glass-card overflow-hidden">
          {/* Header compact cliquable */}
          <CollapsibleTrigger asChild>
            <div className="p-4 cursor-pointer hover:bg-secondary/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2.5 rounded-xl", scoreBg)}>
                    <Target className={cn("w-5 h-5", scoreColor)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">Race Readiness</h3>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", scoreBg, scoreColor)}
                      >
                        {readiness.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Confiance {Math.round(readiness.confidence * 100)}%
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Score grand format */}
                  <div className="text-right">
                    <span className={cn("text-3xl font-bold font-mono", scoreColor)}>
                      {readiness.score}
                    </span>
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                  
                  {/* Chevron expand */}
                  <div className="p-1.5 rounded-lg bg-secondary/50">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Mini résumé des 4 piliers (toujours visible) */}
              <div className="grid grid-cols-4 gap-2 mt-3">
                {pillarsData.map((pillar) => {
                  const percentage = (pillar.value / 25) * 100;
                  const pillColor = percentage >= 70 ? "bg-success" : percentage >= 40 ? "bg-warning" : "bg-destructive";
                  return (
                    <div key={pillar.key} className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <pillar.icon className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{pillar.label}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all", pillColor)} 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-medium">{pillar.value}/25</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CollapsibleTrigger>
          
          {/* Contenu détaillé (collapsé par défaut) */}
          <CollapsibleContent>
            <div className="border-t border-border p-4 space-y-4 animate-accordion-down">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {athleteAge !== null && athleteAge !== undefined && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs py-1 px-2 gap-1",
                      ageInfo.category === "master1" && "border-warning/50 bg-warning/10 text-warning",
                      ageInfo.category === "master2" && "border-destructive/50 bg-destructive/10 text-destructive",
                      (ageInfo.category === "young" || ageInfo.category === "prime") && "border-muted-foreground/30"
                    )}
                  >
                    <User className="h-3 w-3" />
                    {athleteAge} ans
                    {isAgeAdjusted && " • TTE ajusté"}
                  </Badge>
                )}
                
                <Badge variant="outline" className="text-xs py-1 px-2 gap-1 border-success/50 bg-success/10 text-success">
                  <CheckCircle2 className="h-3 w-3" />
                  Cibles synchronisées
                </Badge>
              </div>
              
              {/* Piliers détaillés */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Cliquez sur chaque pilier pour voir le calcul détaillé
                </p>
                {pillarsData.map((pillar, index) => (
                  <ReadinessPillarDetail
                    key={pillar.key}
                    pillarKey={pillar.key as "vlamax" | "endurance" | "puissance" | "fraicheur"}
                    label={pillar.label}
                    icon={<pillar.icon className="w-4 h-4" />}
                    value={pillar.value}
                    color={pillar.color}
                    calculation={pillarCalculations[pillar.key as keyof typeof pillarCalculations]}
                    weight={readiness.weights[pillar.key === "fraicheur" ? "freshness" : pillar.key as keyof typeof readiness.weights] || 25}
                    defaultOpen={index === 0}
                  />
                ))}
              </div>
              
              {/* Interprétation courte */}
              {readiness.interpretation && (
                <div className="p-3 rounded-lg bg-secondary/20 border border-border">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Résumé : </span>
                    {readiness.whyThisScore?.slice(0, 200)}...
                  </p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  // Mode complet (non-compact) - affichage original
  return <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">Forme générale actuelle</h2>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="p-1 rounded-full hover:bg-secondary/50 transition-colors">
                    <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-primary" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-4 bg-card border-border">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Target className="w-4 h-4" />
                      </div>
                      <h4 className="font-semibold text-foreground">{RACE_READINESS_METHODOLOGY.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {RACE_READINESS_METHODOLOGY.definition}
                    </p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">Les 4 piliers :</p>
                      <ul className="list-disc list-inside pl-2 space-y-1">
                        {RACE_READINESS_METHODOLOGY.pillars.map((pillar, i) => (
                          <li key={i} className="text-xs">
                            <span className="font-medium text-foreground">{pillar.name}</span>: {pillar.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                      <p className="text-xs text-warning">
                        ⚠️ {RACE_READINESS_METHODOLOGY.disclaimer}
                      </p>
                    </div>
                  </div>
                  </PopoverContent>
                </Popover>
                {onGoToMethodology && (
                  <button
                    onClick={onGoToMethodology}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 ml-2"
                  >
                    Pourquoi ce score ?
                  </button>
                )}
              </div>
            <p className="text-sm text-muted-foreground">
              Profil: {snap.date} {athlete.active_snapshot_id ? "(actif)" : "(plus récent)"}
            </p>
          </div>
        </div>
        <div className={cn("px-4 py-2 rounded-xl", `bg-${readiness.color}/10`)}>
          <span className={cn("font-semibold", scoreColor)}>{readiness.label}</span>
        </div>
      </div>

      {/* ✅ BADGE AJUSTEMENT ÂGE + CIBLES SYNCHRONISÉES (comme Compass) */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Badge âge */}
        {athleteAge !== null && athleteAge !== undefined && (
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs py-1 px-2 gap-1",
              ageInfo.category === "master1" && "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
              ageInfo.category === "master2" && "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400",
              (ageInfo.category === "young" || ageInfo.category === "prime") && "border-muted-foreground/30"
            )}
          >
            <User className="h-3 w-3" />
            {athleteAge} ans
            {isAgeAdjusted && " • TTE ajusté"}
          </Badge>
        )}
        
        {/* Badge synchronisation cibles */}
        <Badge variant="outline" className="text-xs py-1 px-2 gap-1 border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3" />
          Cibles synchronisées
        </Badge>
        
        {/* Affichage cibles utilisées */}
        {readiness.targets && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>TTE cible:</span>
            <span className="font-mono font-medium text-foreground">{readiness.targets.tteTarget} min</span>
            {isAgeAdjusted && (
              <span className="text-amber-600 dark:text-amber-400">(ajusté {ageInfo.label})</span>
            )}
          </div>
        )}
      </div>

      {/* Debug VLamax + TTE source */}
      <div className="flex flex-wrap gap-4 mb-4">
        {vlamaxEffectif.value !== null && (
          <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-secondary/30 border border-border">
            <span className="text-muted-foreground">VLamax:</span>
            <span className="font-mono font-bold">{vlamaxEffectif.value.toFixed(2)}</span>
            <span className={cn("px-2 py-0.5 rounded text-xs", getVLamaxSourceColor(vlamaxEffectif.source))}>
              {vlamaxEffectif.source}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              conf {Math.round(vlamaxEffectif.confidence * 100)}%
            </span>
          </div>
        )}
        
        {/* TTE - Afficher garde-fou compact si indisponible */}
        {isTTEUnavailable(tteEffectif) ? (
          <TTEGuard 
            tteEffectif={tteEffectif} 
            athleteName={athlete.nom || athlete.name || "Athlète"} 
            onGoToSnapshots={onGoToSnapshots} 
            compact 
          />
        ) : tteEffectif.tte_min !== null && (
          <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-secondary/30 border border-border">
            <span className="text-muted-foreground">TTE:</span>
            <span className="font-mono font-bold">{tteEffectif.tte_min} min</span>
            <span className={cn("px-2 py-0.5 rounded text-xs", getTTESourceColor(tteEffectif.source))}>
              {getSourceLabel(tteEffectif.source)}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              conf {Math.round(tteEffectif.confidence * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Indice de confiance */}
      <div className={cn(
        "mb-4 p-3 rounded-lg border flex items-center gap-3",
        readiness.confidenceInterpretation?.level === "robust" ? "bg-success/5 border-success/30" :
        readiness.confidenceInterpretation?.level === "prudent" ? "bg-warning/5 border-warning/30" :
        "bg-orange-500/5 border-orange-500/30"
      )}>
        <Shield className={cn(
          "w-5 h-5 flex-shrink-0",
          readiness.confidenceInterpretation?.level === "robust" ? "text-success" :
          readiness.confidenceInterpretation?.level === "prudent" ? "text-warning" :
          "text-orange-500"
        )} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-semibold",
              readiness.confidenceInterpretation?.level === "robust" ? "text-success" :
              readiness.confidenceInterpretation?.level === "prudent" ? "text-warning" :
              "text-orange-500"
            )}>
              {readiness.confidenceInterpretation?.label || "Score indicatif"}
            </span>
            <span className="text-xs text-muted-foreground">
              ({Math.round(readiness.confidence * 100)}% de confiance)
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {readiness.confidenceInterpretation?.message || "Les données sont largement estimées."}
          </p>
        </div>
      </div>

      {/* 🚴🏃 SPÉCIFICITÉ SPORT - Vélo vs Course à Pied */}
      {readiness.sportSpecificity && (
        <Collapsible className="mb-4">
          <CollapsibleTrigger className="w-full">
            <div className={cn(
              "p-3 rounded-lg border flex items-center gap-3 hover:bg-secondary/30 transition-colors cursor-pointer",
              readiness.sport === "course" ? "bg-blue-500/5 border-blue-500/20" :
              readiness.sport === "triathlon" ? "bg-purple-500/5 border-purple-500/20" :
              "bg-orange-500/5 border-orange-500/20"
            )}>
              {readiness.sport === "course" ? (
                <PersonStanding className="w-5 h-5 text-blue-600" />
              ) : readiness.sport === "triathlon" ? (
                <Activity className="w-5 h-5 text-purple-600" />
              ) : (
                <Bike className="w-5 h-5 text-orange-600" />
              )}
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-semibold",
                    readiness.sport === "course" ? "text-blue-600" :
                    readiness.sport === "triathlon" ? "text-purple-600" :
                    "text-orange-600"
                  )}>
                    {readiness.sportSpecificity.title}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {readiness.sportSpecificity.dominante}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pilier principal : <strong>{readiness.sportSpecificity.pilierPrincipal}</strong> • VLamax modulabilité : {readiness.sportSpecificity.vlamaxModulabilite}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 p-4 rounded-lg bg-secondary/20 border border-border space-y-4">
              {/* Contraintes clés */}
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-2">Contraintes clés du sport</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {readiness.sportSpecificity.contraintesClés.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Rôle VLamax */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Rôle du VLamax</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {readiness.sportSpecificity.roleVLamax}
                </p>
              </div>
              
              {/* Rôle TTE */}
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-accent" />
                  <span className="text-xs font-semibold text-foreground">Rôle du TTE</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {readiness.sportSpecificity.roleTTE}
                </p>
              </div>
              
              {/* Leviers d'optimisation */}
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-2">Leviers d'optimisation</h4>
                <div className="flex flex-wrap gap-2">
                  {readiness.sportSpecificity.leviers.map((l, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {l}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Logique d'analyse */}
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="text-xs text-muted-foreground italic">
                  💡 {readiness.sportSpecificity.logique}
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-secondary/30 border border-border">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="80" cy="80" r="70" stroke="hsl(var(--secondary))" strokeWidth="12" fill="none" />
              <circle cx="80" cy="80" r="70" stroke={`hsl(var(--${readiness.color}))`} strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray={`${readiness.score / 100 * 440} 440`} className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-5xl font-bold font-mono", scoreColor)}>{readiness.score}</span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
          </div>
        </div>

        {/* Titre de section */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Contribution par pilier</h3>
          <span className="text-xs text-primary/70">Cliquez pour voir le calcul</span>
        </div>

        <div className="space-y-3">
          {(() => {
            const calculations = computePillarCalculations(readiness);
            return pillarsData.map((item, index) => (
              <ReadinessPillarDetail
                key={item.key}
                pillarKey={item.key as "vlamax" | "endurance" | "puissance" | "fraicheur"}
                label={item.label}
                icon={<item.icon className="w-4 h-4" />}
                value={item.value}
                color={item.color}
                calculation={calculations[item.key as keyof typeof calculations]}
                weight={readiness.weights[
                  item.key === "vlamax" ? "vlamax" :
                  item.key === "endurance" ? "tte" :
                  item.key === "puissance" ? "ftpKg" : "freshness"
                ]}
                defaultOpen={index === 0} // Ouvrir le premier pilier par défaut
              />
            ));
          })()}
        </div>
      </div>

      {/* 📊 GRAPHIQUE RADAR : Profil actuel vs Cible idéale */}
      {readiness.targets && vlamaxEffectif.value !== null && (
        <div className="mt-6">
          <ProfileRadarChart
            currentVlamax={readiness.details.vlamax * 4} // 0-25 → 0-100
            currentTTE={readiness.details.endurance * 4}
            currentFtpKg={readiness.details.puissance * 4}
            targetVlamax={100} // Cible = 100% de cohérence
            targetTTE={100}
            targetFtpKg={100}
            objectif={athlete.objectif || athlete.goal || "IM"}
            sport={readiness.sport}
          />
        </div>
      )}

      <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-primary" />
          Analyse personnalisée
        </h3>
        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong className="text-foreground">Profil Référence :</strong> {snap.date} {athlete.active_snapshot_id ? "(actif)" : "(plus récent)"}</p>
          <p><strong className="text-foreground">Objectif :</strong> {getObjectifLabel(athlete.objectif || athlete.goal || "IM")}</p>
          
          {vlamaxEffectif.value !== null && (
            <p>• <strong className="text-foreground">VLamax effectif</strong> : {vlamaxEffectif.value.toFixed(2)} ({vlamaxEffectif.label}) — Confiance : {Math.round(vlamaxEffectif.confidence * 100)}%</p>
          )}
          
          {tteEffectif.tte_min !== null && (
            <p>• <strong className="text-foreground">TTE</strong> : {tteEffectif.tte_min} min ({getSourceLabel(tteEffectif.source)})</p>
          )}
          
          {readiness.inputsUsed.ftpKg !== null && (
            <p>• <strong className="text-foreground">FTP/kg</strong> : {readiness.inputsUsed.ftpKg.toFixed(1)} W/kg (cible: ≥{readiness.targets?.ftpKgTarget ?? "—"} W/kg)</p>
          )}
          
          {/* 🔥 ALERTE RISQUE NUTRITIONNEL ÉLEVÉ */}
          {readiness.nutritionalRiskIndex && (readiness.nutritionalRiskIndex.level === 'high' || readiness.nutritionalRiskIndex.level === 'critical') && (
            <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-semibold text-destructive">
                  Nutrition = facteur limitant probable
                </span>
              </div>
              <p className="text-xs text-destructive/80">
                {readiness.nutritionalRiskIndex.messageStaff}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-destructive font-medium">
                  Besoin: {readiness.nutritionalRiskIndex.carbsRequired} g/h
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  Tolérance: {readiness.nutritionalRiskIndex.toleranceZone} g/h
                </span>
              </div>
            </div>
          )}
          
          {/* 🏃 Économie CAP - Affiché uniquement pour objectifs course */}
          {readiness.runningEconomy?.isApplicable && (
            <div className="mt-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Footprints className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-foreground">Économie CAP</span>
                <span className={cn(
                  "ml-auto px-2 py-0.5 rounded text-xs",
                  readiness.runningEconomy.color === 'success' ? 'bg-green-500/20 text-green-600' :
                  readiness.runningEconomy.color === 'warning' ? 'bg-yellow-500/20 text-yellow-600' :
                  readiness.runningEconomy.color === 'orange' ? 'bg-orange-500/20 text-orange-600' :
                  'bg-red-500/20 text-red-600'
                )}>
                  {readiness.runningEconomy.levelIcon} {readiness.runningEconomy.levelLabel}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {readiness.runningEconomy.analysisMessage}
              </p>
              {readiness.wasCappedByEconomy && (
                <p className="text-xs text-orange-600 mt-1">
                  🏃 Plafonné: {readiness.economyCapReason}
                </p>
              )}
            </div>
          )}
          
          {/* ⚡ DÉRIVE ÉNERGÉTIQUE */}
          {energyDrift && (
            <div className={cn(
              "mt-3 p-3 rounded-lg border",
              energyDrift.color === "success" ? "bg-success/5 border-success/30" :
              energyDrift.color === "warning" ? "bg-warning/5 border-warning/30" :
              "bg-destructive/5 border-destructive/30"
            )}>
              <div className="flex items-center gap-2 mb-2">
                {energyDrift.level === "low" ? (
                  <Battery className="h-4 w-4 text-success" />
                ) : energyDrift.level === "moderate" ? (
                  <BatteryLow className="h-4 w-4 text-warning" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <span className="text-xs font-medium text-foreground">Dérive Énergétique</span>
                <Badge variant={
                  energyDrift.level === "low" ? "secondary" :
                  energyDrift.level === "moderate" ? "default" : "destructive"
                } className="ml-auto text-xs">
                  {energyDrift.icon} {energyDrift.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {energyDrift.messageStaff}
              </p>
              {energyDrift.criticalTime && (
                <p className="text-xs mt-1 text-foreground">
                  ⏱️ Moment critique: <strong>{energyDrift.criticalTime}</strong>
                </p>
              )}
            </div>
          )}
          
          {readiness.reasonsMissing.length > 0 && (
            <div className="mt-3 p-2 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-xs font-medium text-warning mb-1">Données manquantes :</p>
              {readiness.reasonsMissing.map((reason, i) => (
                <p key={i} className="text-xs text-warning/80">• {reason}</p>
              ))}
            </div>
          )}
          
          {/* Message Staff */}
          <div className="mt-3 p-3 rounded-lg bg-secondary/30 border border-border">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">📊 Staff:</span> {readiness.messageStaff || "Race Readiness = VLamax + TTE + FTP/kg + fraîcheur, pondéré selon l'objectif."}
            </p>
          </div>
          
          {/* ✅ Interprétation Staff-Grade */}
          {readiness.interpretation && readiness.score > 0 && (
            <div className="mt-4 space-y-3">
              {/* Statut avec seuils officiels */}
              <div className={cn(
                "p-3 rounded-lg border-2",
                readiness.interpretation.status === "race_ready" ? "bg-success/10 border-success/30" :
                readiness.interpretation.status === "almost_ready" ? "bg-warning/10 border-warning/30" :
                readiness.interpretation.status === "in_progress" ? "bg-orange-500/10 border-orange-500/30" :
                "bg-destructive/10 border-destructive/30"
              )}>
                <p className={cn(
                  "text-sm font-semibold",
                  readiness.interpretation.status === "race_ready" ? "text-success" :
                  readiness.interpretation.status === "almost_ready" ? "text-warning" :
                  readiness.interpretation.status === "in_progress" ? "text-orange-600" :
                  "text-destructive"
                )}>
                  {readiness.interpretation.statusLabel}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {readiness.score >= 80 ? "80-100 : profil très cohérent avec l'objectif" :
                   readiness.score >= 60 ? "60-79 : cohérent mais perfectible" :
                   readiness.score >= 40 ? "40-59 : incohérences physiologiques notables" :
                   "< 40 : profil non adapté à ce stade"}
                </p>
              </div>
              
              {/* Points forts */}
              {readiness.interpretation.mainStrengths.length > 0 && (
                <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                  <p className="text-xs font-medium text-success mb-2">✅ Points forts</p>
                  {readiness.interpretation.mainStrengths.map((strength, i) => (
                    <p key={i} className="text-xs text-muted-foreground">• {strength}</p>
                  ))}
                </div>
              )}
              
              {/* Limitations */}
              {readiness.interpretation.mainLimitations.length > 0 && (
                <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <p className="text-xs font-medium text-destructive mb-2">⚠️ Points limitants</p>
                  {readiness.interpretation.mainLimitations.map((limitation, i) => (
                    <p key={i} className="text-xs text-muted-foreground">• {limitation}</p>
                  ))}
                </div>
              )}
              
              {/* Actions prioritaires */}
              {readiness.interpretation.priorityActions.length > 0 && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs font-medium text-primary mb-2">🎯 Actions prioritaires</p>
                  {readiness.interpretation.priorityActions.map((action, i) => (
                    <p key={i} className="text-xs text-muted-foreground">• {action}</p>
                  ))}
                </div>
              )}
              
              {/* Pondération objectif */}
              <div className="p-2 rounded-lg bg-secondary/20 border border-border">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">📐 Pondération {getObjectifLabel(athlete.objectif || athlete.goal || "IM")}:</span>{" "}
                  VLamax {readiness.weights.vlamax}% • TTE {readiness.weights.tte}% • FTP/kg {readiness.weights.ftpKg}%
                </p>
              </div>
              
              {/* Méthodologie collapsible */}
              <Collapsible open={showMethodology} onOpenChange={setShowMethodology}>
                <CollapsibleTrigger className="w-full p-2 rounded-lg bg-secondary/10 border border-border flex items-center justify-between text-xs text-muted-foreground hover:bg-secondary/20 transition-colors">
                  <span className="flex items-center gap-2">
                    <Info className="w-3 h-3" />
                    {RACE_READINESS_METHODOLOGY.title}
                  </span>
                  {showMethodology ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 p-3 rounded-lg bg-secondary/5 border border-border text-xs space-y-2">
                  <p className="text-muted-foreground whitespace-pre-line">
                    {RACE_READINESS_METHODOLOGY.definition}
                  </p>
                  <div className="p-2 rounded bg-warning/10 border border-warning/20">
                    <p className="text-warning text-xs">
                      ⚠️ {RACE_READINESS_METHODOLOGY.disclaimer}
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>
      </div>
    </div>;
}