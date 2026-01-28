/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RACE READINESS SIGNATURE CHART – TFCL METHOD™
 * Graphique 2D "Potentiel × Disponibilité → Décision"
 * 
 * Visualisation matricielle:
 * - Axe X: Potentiel Physiologique (Faible → Très élevé)
 * - Axe Y: Disponibilité/Fraîcheur (Épuisé → Très Disponible)
 * - Zones colorées: Rouge (No-Go), Orange (Ajuster), Vert (Go), Bleu (Ambitieux)
 * - Point athlète dynamique représentant l'état actuel
 * 
 * PHILOSOPHIE:
 * Race Readiness ≠ Fitness
 * "Capacité à exprimer son potentiel le jour J, pas la valeur maximale de ce potentiel"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Rocket,
  Activity,
  Heart,
  Info,
  Calendar,
  TrendingUp,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type PotentialLevel = 'low' | 'sufficient' | 'high' | 'very_high';
export type AvailabilityLevel = 'exhausted' | 'fragile' | 'available' | 'very_available';
export type DecisionZone = 'red' | 'orange' | 'green' | 'blue';

export interface RaceReadinessInput {
  // Données potentiel physiologique
  physiology: {
    vo2max: number | null;
    vo2maxTarget: number;
    vlamax: number | null;
    vlamaxTarget: number;
    tte: number | null;
    tteTarget: number;
    economy: number | null;  // 0-100
    trend?: 'improving' | 'stable' | 'declining';
  };
  
  // Données disponibilité
  availability: {
    hrvStatus?: 'optimal' | 'elevated' | 'suppressed' | null;
    tss7d: number | null;
    tss28d: number | null;
    subjectiveFatigue: number | null;  // 1-5
    sleepQuality: number | null;       // 1-5
    motivation: number | null;         // 1-5
    soreness: number | null;           // 1-5
    stress: number | null;             // 1-5
    hasRedFlags: boolean;              // Maladie, blessure, stress extrême
  };
  
  // Contexte
  discipline: 'IM' | '703' | 'marathon' | 'semi' | '10k' | 'cycling' | 'trail';
  ambition: 'finisher' | 'age_group' | 'competitor' | 'elite';
  daysToRace?: number | null;
}

export interface RaceReadinessResult {
  // Niveaux calculés
  potentialLevel: PotentialLevel;
  potentialLabel: string;
  potentialScore: number;  // 0-100 pour positionnement
  potentialReasons: string[];
  
  availabilityLevel: AvailabilityLevel;
  availabilityLabel: string;
  availabilityScore: number;  // 0-100 pour positionnement
  availabilityReasons: string[];
  
  // Zone de décision
  decisionZone: DecisionZone;
  decisionLabel: string;
  decisionIcon: string;
  decisionColor: string;
  
  // Recommandation
  recommendation: {
    status: 'go' | 'adjust' | 'no_go' | 'ambitious';
    title: string;
    message: string;
    actions: string[];
  };
  
  // Confiance
  confidence: 'high' | 'moderate' | 'low';
  confidenceLabel: string;
  confidenceReasons: string[];
}

interface RaceReadinessSignatureChartProps {
  input: RaceReadinessInput;
  compact?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALCUL DU POTENTIEL
// ═══════════════════════════════════════════════════════════════════════════════

function computePotentialLevel(input: RaceReadinessInput): {
  level: PotentialLevel;
  score: number;
  reasons: string[];
} {
  const { physiology } = input;
  const reasons: string[] = [];
  let score = 50; // Base
  
  // VO2max contribution (25% weight)
  if (physiology.vo2max !== null) {
    const vo2Gap = (physiology.vo2max - physiology.vo2maxTarget) / physiology.vo2maxTarget;
    if (vo2Gap >= 0.1) {
      score += 15;
      reasons.push(`VO2max ${Math.round(vo2Gap * 100)}% au-dessus de la cible`);
    } else if (vo2Gap >= 0) {
      score += 8;
      reasons.push("VO2max dans la cible");
    } else if (vo2Gap >= -0.1) {
      score -= 5;
      reasons.push("VO2max légèrement sous la cible");
    } else {
      score -= 15;
      reasons.push(`VO2max ${Math.abs(Math.round(vo2Gap * 100))}% sous la cible`);
    }
  }
  
  // VLamax contribution (25% weight) - inversé pour longue distance
  if (physiology.vlamax !== null) {
    const vlamaxGap = (physiology.vlamax - physiology.vlamaxTarget) / physiology.vlamaxTarget;
    if (vlamaxGap <= -0.15) {
      score += 15;
      reasons.push("VLamax optimale pour l'objectif");
    } else if (vlamaxGap <= 0) {
      score += 8;
      reasons.push("VLamax dans la cible");
    } else if (vlamaxGap <= 0.15) {
      score -= 5;
      reasons.push("VLamax légèrement élevée");
    } else {
      score -= 15;
      reasons.push(`VLamax trop élevée (+${Math.round(vlamaxGap * 100)}%)`);
    }
  }
  
  // TTE contribution (25% weight)
  if (physiology.tte !== null) {
    const tteGap = (physiology.tte - physiology.tteTarget) / physiology.tteTarget;
    if (tteGap >= 0.15) {
      score += 15;
      reasons.push("Durabilité excellente");
    } else if (tteGap >= 0) {
      score += 8;
      reasons.push("TTE dans la cible");
    } else if (tteGap >= -0.15) {
      score -= 5;
      reasons.push("Durabilité à améliorer");
    } else {
      score -= 15;
      reasons.push("Durabilité insuffisante");
    }
  }
  
  // Économie contribution (15% weight)
  if (physiology.economy !== null) {
    if (physiology.economy >= 75) {
      score += 10;
      reasons.push("Économie excellente");
    } else if (physiology.economy >= 50) {
      score += 5;
    } else {
      score -= 10;
      reasons.push("Économie à travailler");
    }
  }
  
  // Tendance (10% weight)
  if (physiology.trend === 'improving') {
    score += 5;
    reasons.push("Tendance positive");
  } else if (physiology.trend === 'declining') {
    score -= 10;
    reasons.push("Tendance en baisse");
  }
  
  // Clamp score
  score = Math.max(0, Math.min(100, score));
  
  // Determine level
  let level: PotentialLevel;
  if (score >= 75) level = 'very_high';
  else if (score >= 55) level = 'high';
  else if (score >= 35) level = 'sufficient';
  else level = 'low';
  
  return { level, score, reasons: reasons.slice(0, 3) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALCUL DE LA DISPONIBILITÉ
// ═══════════════════════════════════════════════════════════════════════════════

function computeAvailabilityLevel(input: RaceReadinessInput): {
  level: AvailabilityLevel;
  score: number;
  reasons: string[];
} {
  const { availability } = input;
  const reasons: string[] = [];
  let score = 50; // Base
  
  // Red flags = automatic low
  if (availability.hasRedFlags) {
    return {
      level: 'exhausted',
      score: 10,
      reasons: ["Signaux rouges actifs (maladie, blessure, stress extrême)"],
    };
  }
  
  // HRV contribution (25% weight)
  if (availability.hrvStatus === 'optimal') {
    score += 15;
    reasons.push("HRV optimale");
  } else if (availability.hrvStatus === 'elevated') {
    score -= 10;
    reasons.push("HRV élevée (stress possible)");
  } else if (availability.hrvStatus === 'suppressed') {
    score -= 20;
    reasons.push("HRV supprimée (fatigue)");
  }
  
  // Charge aiguë vs chronique (25% weight)
  if (availability.tss7d !== null && availability.tss28d !== null && availability.tss28d > 0) {
    const ratio = availability.tss7d / (availability.tss28d / 4);
    if (ratio <= 0.7) {
      score += 15;
      reasons.push("Charge allégée (tapering)");
    } else if (ratio <= 1.0) {
      score += 5;
      reasons.push("Charge équilibrée");
    } else if (ratio <= 1.3) {
      score -= 10;
      reasons.push("Charge élevée récemment");
    } else {
      score -= 20;
      reasons.push("Surcharge aiguë");
    }
  }
  
  // Questionnaire subjectif (50% weight total)
  const subjectiveScores: number[] = [];
  
  if (availability.subjectiveFatigue !== null) {
    // 1 = très fatigué, 5 = très frais
    subjectiveScores.push(availability.subjectiveFatigue);
    if (availability.subjectiveFatigue <= 2) {
      reasons.push("Fatigue subjective élevée");
    }
  }
  
  if (availability.sleepQuality !== null) {
    subjectiveScores.push(availability.sleepQuality);
    if (availability.sleepQuality <= 2) {
      reasons.push("Sommeil perturbé");
    }
  }
  
  if (availability.motivation !== null) {
    subjectiveScores.push(availability.motivation);
    if (availability.motivation >= 4) {
      reasons.push("Motivation haute");
    } else if (availability.motivation <= 2) {
      reasons.push("Motivation en berne");
    }
  }
  
  if (availability.soreness !== null) {
    // 1 = très douloureux, 5 = aucune douleur
    subjectiveScores.push(availability.soreness);
    if (availability.soreness <= 2) {
      reasons.push("Douleurs musculaires");
    }
  }
  
  if (availability.stress !== null) {
    // 1 = très stressé, 5 = très détendu
    subjectiveScores.push(availability.stress);
    if (availability.stress <= 2) {
      reasons.push("Stress élevé");
    }
  }
  
  if (subjectiveScores.length > 0) {
    const avgSubjective = subjectiveScores.reduce((a, b) => a + b, 0) / subjectiveScores.length;
    // Convert 1-5 to score adjustment (-25 to +25)
    score += (avgSubjective - 3) * 12.5;
  }
  
  // Clamp score
  score = Math.max(0, Math.min(100, score));
  
  // Determine level
  let level: AvailabilityLevel;
  if (score >= 75) level = 'very_available';
  else if (score >= 50) level = 'available';
  else if (score >= 25) level = 'fragile';
  else level = 'exhausted';
  
  return { level, score, reasons: reasons.slice(0, 3) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DÉTERMINATION DE LA ZONE DE DÉCISION
// ═══════════════════════════════════════════════════════════════════════════════

function determineDecisionZone(
  potentialLevel: PotentialLevel,
  availabilityLevel: AvailabilityLevel
): {
  zone: DecisionZone;
  recommendation: RaceReadinessResult['recommendation'];
} {
  // Matrice de décision 4x4
  const matrix: Record<PotentialLevel, Record<AvailabilityLevel, DecisionZone>> = {
    very_high: {
      very_available: 'blue',
      available: 'green',
      fragile: 'orange',
      exhausted: 'red',
    },
    high: {
      very_available: 'green',
      available: 'green',
      fragile: 'orange',
      exhausted: 'red',
    },
    sufficient: {
      very_available: 'green',
      available: 'orange',
      fragile: 'orange',
      exhausted: 'red',
    },
    low: {
      very_available: 'orange',
      available: 'orange',
      fragile: 'red',
      exhausted: 'red',
    },
  };
  
  const zone = matrix[potentialLevel][availabilityLevel];
  
  // Recommandations par zone
  const recommendations: Record<DecisionZone, RaceReadinessResult['recommendation']> = {
    blue: {
      status: 'ambitious',
      title: "🚀 Stratégie Ambitieuse Possible",
      message: "Potentiel élevé + fraîcheur optimale = conditions idéales pour viser haut.",
      actions: [
        "Objectif ambitieux validé",
        "Pacing agressif autorisé",
        "Surveiller les signaux pendant la course",
      ],
    },
    green: {
      status: 'go',
      title: "✅ Objectif Validé",
      message: "Zone robuste : le potentiel peut s'exprimer correctement le jour J.",
      actions: [
        "Maintenir le plan prévu",
        "Pacing selon les repères établis",
        "Confiance dans la préparation",
      ],
    },
    orange: {
      status: 'adjust',
      title: "⚠️ Ajustement Nécessaire",
      message: "Déséquilibre détecté : ajuster l'objectif ou le pacing pour sécuriser.",
      actions: [
        "Revoir l'objectif à la baisse",
        "Pacing conservateur recommandé",
        "Écouter les signaux corporels",
      ],
    },
    red: {
      status: 'no_go',
      title: "❌ Ne Pas Courir / Objectif Secondaire",
      message: "Conditions insuffisantes pour exprimer le potentiel. Risque > Bénéfice.",
      actions: [
        "Reporter ou objectif secondaire",
        "Prioriser la récupération",
        "Éviter de creuser la dette",
      ],
    },
  };
  
  return { zone, recommendation: recommendations[zone] };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALCUL PRINCIPAL (exporté pour utilisation externe)
// ═══════════════════════════════════════════════════════════════════════════════

export function computeRaceReadinessSignature(input: RaceReadinessInput): RaceReadinessResult {
  const potential = computePotentialLevel(input);
  const availability = computeAvailabilityLevel(input);
  const { zone, recommendation } = determineDecisionZone(potential.level, availability.level);
  
  // Labels
  const potentialLabels: Record<PotentialLevel, string> = {
    low: "Faible",
    sufficient: "Suffisant",
    high: "Élevé",
    very_high: "Très élevé",
  };
  
  const availabilityLabels: Record<AvailabilityLevel, string> = {
    exhausted: "Épuisé",
    fragile: "Fragile",
    available: "Disponible",
    very_available: "Très Disponible",
  };
  
  const zoneConfig: Record<DecisionZone, { label: string; icon: string; color: string }> = {
    red: { label: "No-Go", icon: "❌", color: "text-destructive" },
    orange: { label: "Ajuster", icon: "⚠️", color: "text-amber-600 dark:text-amber-400" },
    green: { label: "Go", icon: "✅", color: "text-green-600 dark:text-green-400" },
    blue: { label: "Ambitieux", icon: "🚀", color: "text-blue-600 dark:text-blue-400" },
  };
  
  // Confiance basée sur la qualité des données
  const dataPoints = [
    input.physiology.vo2max !== null,
    input.physiology.vlamax !== null,
    input.physiology.tte !== null,
    input.availability.subjectiveFatigue !== null,
    input.availability.sleepQuality !== null,
  ].filter(Boolean).length;
  
  const confidence: 'high' | 'moderate' | 'low' = 
    dataPoints >= 4 ? 'high' : dataPoints >= 2 ? 'moderate' : 'low';
  
  const confidenceLabels = { high: "Élevée", moderate: "Modérée", low: "Faible" };
  
  const confidenceReasons: string[] = [];
  if (input.physiology.vo2max === null) confidenceReasons.push("VO2max non renseignée");
  if (input.availability.subjectiveFatigue === null) confidenceReasons.push("Pas de check-in récent");
  
  return {
    potentialLevel: potential.level,
    potentialLabel: potentialLabels[potential.level],
    potentialScore: potential.score,
    potentialReasons: potential.reasons,
    
    availabilityLevel: availability.level,
    availabilityLabel: availabilityLabels[availability.level],
    availabilityScore: availability.score,
    availabilityReasons: availability.reasons,
    
    decisionZone: zone,
    decisionLabel: zoneConfig[zone].label,
    decisionIcon: zoneConfig[zone].icon,
    decisionColor: zoneConfig[zone].color,
    
    recommendation,
    
    confidence,
    confidenceLabel: confidenceLabels[confidence],
    confidenceReasons,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT GRAPHIQUE 2D
// ═══════════════════════════════════════════════════════════════════════════════

function MatrixChart({ result }: { result: RaceReadinessResult }) {
  // Position du point (0-100 sur chaque axe)
  const pointX = result.potentialScore;
  const pointY = result.availabilityScore;
  
  // Zones de couleur (SVG)
  const zones = [
    // Rouge: bas-gauche
    { x: 0, y: 0, width: 35, height: 35, color: "hsl(var(--destructive) / 0.3)" },
    { x: 0, y: 35, width: 35, height: 25, color: "hsl(var(--destructive) / 0.3)" },
    { x: 35, y: 0, width: 25, height: 35, color: "hsl(var(--destructive) / 0.3)" },
    
    // Orange: milieu-bas et bas-milieu
    { x: 35, y: 35, width: 25, height: 25, color: "rgba(245, 158, 11, 0.3)" },
    { x: 0, y: 60, width: 35, height: 20, color: "rgba(245, 158, 11, 0.3)" },
    { x: 60, y: 0, width: 20, height: 35, color: "rgba(245, 158, 11, 0.3)" },
    { x: 60, y: 35, width: 20, height: 25, color: "rgba(245, 158, 11, 0.3)" },
    { x: 35, y: 60, width: 25, height: 20, color: "rgba(245, 158, 11, 0.3)" },
    
    // Vert: centre-haut et milieu
    { x: 0, y: 80, width: 35, height: 20, color: "rgba(34, 197, 94, 0.3)" },
    { x: 35, y: 80, width: 25, height: 20, color: "rgba(34, 197, 94, 0.3)" },
    { x: 60, y: 60, width: 20, height: 40, color: "rgba(34, 197, 94, 0.3)" },
    { x: 80, y: 35, width: 20, height: 45, color: "rgba(34, 197, 94, 0.3)" },
    { x: 80, y: 0, width: 20, height: 35, color: "rgba(245, 158, 11, 0.3)" },
    
    // Bleu: haut-droite
    { x: 80, y: 80, width: 20, height: 20, color: "rgba(59, 130, 246, 0.4)" },
  ];
  
  return (
    <div className="relative w-full aspect-square max-w-[400px] mx-auto">
      {/* SVG Matrix */}
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Background zones */}
        {zones.map((zone, i) => (
          <rect
            key={i}
            x={zone.x}
            y={100 - zone.y - zone.height}
            width={zone.width}
            height={zone.height}
            fill={zone.color}
          />
        ))}
        
        {/* Grid lines */}
        <line x1="35" y1="0" x2="35" y2="100" stroke="currentColor" strokeOpacity="0.2" strokeDasharray="2,2" />
        <line x1="60" y1="0" x2="60" y2="100" stroke="currentColor" strokeOpacity="0.2" strokeDasharray="2,2" />
        <line x1="80" y1="0" x2="80" y2="100" stroke="currentColor" strokeOpacity="0.2" strokeDasharray="2,2" />
        <line x1="0" y1="35" x2="100" y2="35" stroke="currentColor" strokeOpacity="0.2" strokeDasharray="2,2" />
        <line x1="0" y1="60" x2="100" y2="60" stroke="currentColor" strokeOpacity="0.2" strokeDasharray="2,2" />
        <line x1="0" y1="80" x2="100" y2="80" stroke="currentColor" strokeOpacity="0.2" strokeDasharray="2,2" />
        
        {/* Axes */}
        <line x1="0" y1="100" x2="100" y2="100" stroke="currentColor" strokeOpacity="0.5" strokeWidth="0.5" />
        <line x1="0" y1="0" x2="0" y2="100" stroke="currentColor" strokeOpacity="0.5" strokeWidth="0.5" />
        
        {/* Athlete point with glow */}
        <circle
          cx={pointX}
          cy={100 - pointY}
          r="6"
          className="fill-primary/30"
        />
        <circle
          cx={pointX}
          cy={100 - pointY}
          r="4"
          className="fill-primary stroke-background"
          strokeWidth="1"
        />
        <circle
          cx={pointX}
          cy={100 - pointY}
          r="1.5"
          className="fill-background"
        />
      </svg>
      
      {/* Axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[9px] text-muted-foreground px-1 -mb-5">
        <span>Faible</span>
        <span>Suffisant</span>
        <span>Élevé</span>
        <span>Très élevé</span>
      </div>
      <div className="absolute top-0 bottom-0 left-0 flex flex-col justify-between text-[9px] text-muted-foreground py-1 -ml-16 w-14 text-right">
        <span>Très Dispo</span>
        <span>Disponible</span>
        <span>Fragile</span>
        <span>Épuisé</span>
      </div>
      
      {/* Axis titles */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-xs font-medium flex items-center gap-1">
        <Activity className="h-3 w-3" />
        <span>Potentiel Physiologique</span>
      </div>
      <div className="absolute top-1/2 -left-24 -translate-y-1/2 -rotate-90 text-xs font-medium flex items-center gap-1">
        <Heart className="h-3 w-3" />
        <span>Disponibilité</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function RaceReadinessSignatureChart({
  input,
  compact = false,
  className,
}: RaceReadinessSignatureChartProps) {
  const result = useMemo(() => computeRaceReadinessSignature(input), [input]);
  
  const zoneStyles: Record<DecisionZone, string> = {
    red: "bg-destructive/10 border-destructive/30",
    orange: "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700",
    green: "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700",
    blue: "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700",
  };
  
  const zoneIcons: Record<DecisionZone, React.ReactNode> = {
    red: <XCircle className="h-5 w-5 text-destructive" />,
    orange: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
    green: <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />,
    blue: <Rocket className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
  };
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header */}
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span>Race Readiness TFCL</span>
              <Badge variant="outline" className="text-[9px] font-normal">
                Potentiel × Disponibilité
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Capacité à exprimer son potentiel le jour J, pas sa valeur maximale
            </p>
          </div>
          
          {/* Confidence badge */}
          <Badge 
            variant="outline" 
            className={cn(
              "shrink-0",
              result.confidence === 'high' 
                ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30"
                : result.confidence === 'moderate'
                ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30"
                : "text-destructive bg-destructive/10"
            )}
          >
            Confiance: {result.confidenceLabel}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Matrix Chart */}
          <div className="flex flex-col items-center">
            <MatrixChart result={result} />
            
            {/* Legend */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {[
                { zone: 'red' as DecisionZone, label: 'No-Go' },
                { zone: 'orange' as DecisionZone, label: 'Ajuster' },
                { zone: 'green' as DecisionZone, label: 'Go' },
                { zone: 'blue' as DecisionZone, label: 'Ambitieux' },
              ].map(({ zone, label }) => (
                <div key={zone} className="flex items-center gap-1.5 text-[10px]">
                  <div className={cn("w-3 h-3 rounded-sm", zoneStyles[zone].split(' ')[0])} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right: Decision & Details */}
          <div className="space-y-4">
            {/* Decision Card */}
            <div className={cn(
              "p-4 rounded-xl border-2",
              zoneStyles[result.decisionZone]
            )}>
              <div className="flex items-center gap-3 mb-3">
                {zoneIcons[result.decisionZone]}
                <div>
                  <p className={cn("text-lg font-bold", result.decisionColor)}>
                    {result.recommendation.title}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {result.recommendation.message}
              </p>
              <ul className="space-y-1">
                {result.recommendation.actions.map((action, i) => (
                  <li key={i} className="text-xs flex items-start gap-1.5">
                    <span className={cn("mt-0.5", result.decisionColor)}>•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Axes Summary */}
            <div className="grid grid-cols-2 gap-3">
              {/* Potentiel */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-3 rounded-lg bg-muted/50 border border-border cursor-help">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="h-4 w-4 text-primary" />
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Potentiel
                        </span>
                      </div>
                      <p className="text-sm font-semibold">{result.potentialLabel}</p>
                      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${result.potentialScore}%` }}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[250px]">
                    <ul className="text-xs space-y-0.5">
                      {result.potentialReasons.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Disponibilité */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-3 rounded-lg bg-muted/50 border border-border cursor-help">
                      <div className="flex items-center gap-2 mb-1">
                        <Heart className="h-4 w-4 text-primary" />
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Disponibilité
                        </span>
                      </div>
                      <p className="text-sm font-semibold">{result.availabilityLabel}</p>
                      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${result.availabilityScore}%` }}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[250px]">
                    <ul className="text-xs space-y-0.5">
                      {result.availabilityReasons.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Days to race indicator */}
            {input.daysToRace !== null && input.daysToRace !== undefined && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-xs">
                  <span className="font-medium">J-{input.daysToRace}</span>
                  <span className="text-muted-foreground"> avant la course</span>
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer tooltip */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="mt-6 pt-4 border-t border-border/50 text-xs text-muted-foreground text-center italic cursor-help flex items-center justify-center gap-1">
                <Info className="h-3 w-3" />
                Ce point évolue chaque jour. La course se gagne souvent ici, pas au laboratoire.
              </p>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[300px]">
              <p className="text-xs">
                <strong>Race Readiness ≠ Fitness</strong><br />
                Un athlète peut être très fort mais non prêt, ou prêt mais limité. 
                TFCL cherche la zone de décision robuste, pas l'optimum théorique.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

// Export par défaut
export default RaceReadinessSignatureChart;
