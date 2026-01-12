/**
 * VLamaxTargetsCard - Affiche les zones cibles VLamax ajustées à l'objectif et au profil
 * "Passer d'un objectif absolu à une plage réaliste"
 * 
 * VLamax bas = meilleure oxydation lipidique = meilleur pour longue distance
 * Donc ici les zones sont inversées : plus bas = plus ambitieux pour l'endurance
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingDown, AlertTriangle, Info, Zap, Activity, Calendar, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { getContextTargets } from "@/lib/scoreEnvelope";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// =============================================
// TYPES
// =============================================

interface VLamaxTargetsCardProps {
  objectif: string;
  age?: number | null;
  currentVlamax?: number | null;
  vo2max?: number | null;
  weeklyVolume?: number | null;
  className?: string;
}

interface VLamaxLevelTargets {
  elite: { min: number; max: number; label: string };
  ambitieux: { min: number; max: number; label: string };
  acceptable: { min: number; max: number; label: string };
  warning?: string;
}

interface JustificationItem {
  icon: React.ReactNode;
  label: string;
  value: string;
  impact: "positive" | "neutral" | "negative";
  note?: string;
}

// =============================================
// HELPER FUNCTIONS
// =============================================

function getVLamaxLevelTargets(objectif: string, age?: number | null): VLamaxLevelTargets {
  // Récupérer les cibles de base depuis scoreEnvelope
  const baseTargets = getContextTargets("vlamax", objectif);
  
  // Valeurs par défaut si objectif inconnu
  if (!baseTargets) {
    return {
      elite: { min: 0.25, max: 0.32, label: "Élite / Oxydatif pur" },
      ambitieux: { min: 0.32, max: 0.40, label: "Ambitieux" },
      acceptable: { min: 0.40, max: 0.55, label: "Acceptable" },
      warning: "Objectif non reconnu, valeurs génériques appliquées",
    };
  }

  // Construire les zones basées sur ideal/min/max
  // Pour VLamax: plus bas = mieux pour endurance
  // Elite = proche/sous l'idéal, Ambitieux = idéal à mid-range, Acceptable = jusqu'au max
  const ideal = baseTargets.ideal;
  const min = baseTargets.min;
  const max = baseTargets.max;
  
  // Ajustement léger pour l'âge (les athlètes plus âgés peuvent avoir un VLamax naturellement plus bas)
  let ageNote = "";
  let ageAdjustment = 0;
  if (age && age >= 50) {
    ageAdjustment = 0.02; // Légère tolérance supplémentaire
    ageNote = "Ajustement pour âge 50+ : VLamax naturellement plus stable avec l'âge";
  } else if (age && age >= 40) {
    ageAdjustment = 0.01;
  }

  return {
    elite: { 
      min: min, 
      max: ideal, 
      label: "Zone élite / Oxydatif optimal" 
    },
    ambitieux: { 
      min: ideal, 
      max: ideal + (max - ideal) * 0.5 + ageAdjustment, 
      label: "Zone ambitieuse" 
    },
    acceptable: { 
      min: ideal + (max - ideal) * 0.5 + ageAdjustment, 
      max: max + ageAdjustment, 
      label: "Zone acceptable" 
    },
    warning: ageNote || baseTargets.note,
  };
}

function getProgressInZone(currentVlamax: number | null, zone: { min: number; max: number }): number {
  if (!currentVlamax) return 0;
  if (currentVlamax < zone.min) return 0;
  if (currentVlamax > zone.max) return 100;
  return ((currentVlamax - zone.min) / (zone.max - zone.min)) * 100;
}

function getCurrentZone(
  currentVlamax: number | null, 
  targets: VLamaxLevelTargets
): "below-elite" | "elite" | "ambitieux" | "acceptable" | "above" {
  if (!currentVlamax) return "acceptable";
  if (currentVlamax < targets.elite.min) return "below-elite"; // Sous la zone élite (très rare)
  if (currentVlamax <= targets.elite.max) return "elite";
  if (currentVlamax <= targets.ambitieux.max) return "ambitieux";
  if (currentVlamax <= targets.acceptable.max) return "acceptable";
  return "above"; // Au-dessus de la zone acceptable
}

function getObjectifLabel(objectif: string): string {
  const labels: Record<string, string> = {
    IM: "Ironman",
    Ironman: "Ironman",
    "703": "70.3",
    Half: "70.3",
    Marathon: "Marathon",
    Semi: "Semi-Marathon",
    Sprint: "Sprint",
    Olympic: "Olympique",
  };
  return labels[objectif] || objectif;
}

function getObjectifContext(objectif: string): string {
  const contexts: Record<string, string> = {
    IM: "Longue distance : VLamax bas prioritaire pour maximiser l'oxydation lipidique",
    Ironman: "Longue distance : VLamax bas prioritaire pour maximiser l'oxydation lipidique",
    "703": "Distance moyenne : équilibre entre endurance et capacité glycolytique",
    Half: "Distance moyenne : équilibre entre endurance et capacité glycolytique",
    Marathon: "Course longue : VLamax modéré pour économie de course + endurance",
    Semi: "Course moyenne : tolérance au lactate modérée acceptable",
    Sprint: "Distance courte : VLamax plus élevé acceptable, puissance prioritaire",
    Olympic: "Distance olympique : équilibre puissance/endurance",
  };
  return contexts[objectif] || "Optimiser le VLamax selon l'objectif";
}

function buildJustifications(props: {
  objectif: string;
  age?: number | null;
  vo2max?: number | null;
  weeklyVolume?: number | null;
  currentVlamax?: number | null;
}): JustificationItem[] {
  const items: JustificationItem[] = [];
  const { objectif, age, vo2max, weeklyVolume, currentVlamax } = props;

  // Objectif
  const isEndurance = ["IM", "Ironman", "Marathon", "703", "Half"].includes(objectif);
  items.push({
    icon: <Target className="w-4 h-4" />,
    label: "Objectif",
    value: getObjectifLabel(objectif),
    impact: "neutral",
    note: isEndurance 
      ? "VLamax bas crucial pour l'endurance" 
      : "VLamax plus élevé toléré pour la puissance",
  });

  // Âge
  if (age) {
    let impact: "positive" | "neutral" | "negative" = "neutral";
    let note = "";
    if (age >= 50) {
      impact = "positive";
      note = "VLamax tend à se stabiliser/baisser naturellement avec l'âge";
    } else if (age >= 40) {
      impact = "neutral";
      note = "Âge favorable pour optimiser le VLamax";
    } else if (age < 30) {
      impact = "neutral";
      note = "VLamax naturellement plus élevé, travail de fond nécessaire";
    }
    items.push({
      icon: <Calendar className="w-4 h-4" />,
      label: "Âge",
      value: `${age} ans`,
      impact,
      note,
    });
  }

  // VLamax actuel
  if (currentVlamax !== null && currentVlamax !== undefined) {
    const targets = getContextTargets("vlamax", objectif);
    const ideal = targets?.ideal || 0.40;
    
    let impact: "positive" | "neutral" | "negative" = "neutral";
    let note = "";
    if (currentVlamax <= ideal) {
      impact = "positive";
      note = "Dans la zone optimale pour votre objectif";
    } else if (currentVlamax <= ideal + 0.10) {
      impact = "neutral";
      note = "Légèrement au-dessus de l'idéal, progression possible";
    } else {
      impact = "negative";
      note = "Travail de fond prioritaire pour baisser le VLamax";
    }
    items.push({
      icon: <Zap className="w-4 h-4" />,
      label: "VLamax actuel",
      value: `${currentVlamax.toFixed(2)} mmol/L/s`,
      impact,
      note,
    });
  }

  // VO2max
  if (vo2max !== null && vo2max !== undefined) {
    let impact: "positive" | "neutral" | "negative" = "neutral";
    let note = "";
    if (vo2max >= 60) {
      impact = "positive";
      note = "Haute VO2max permet de cibler un VLamax très bas";
    } else if (vo2max >= 50) {
      impact = "neutral";
      note = "VO2max correcte, équilibre VLamax/puissance important";
    } else {
      impact = "negative";
      note = "VO2max limitante, prioriser développement aérobie";
    }
    items.push({
      icon: <Activity className="w-4 h-4" />,
      label: "VO2max",
      value: `${Math.round(vo2max)} ml/kg/min`,
      impact,
      note,
    });
  }

  // Volume hebdo
  if (weeklyVolume !== null && weeklyVolume !== undefined) {
    let impact: "positive" | "neutral" | "negative" = "neutral";
    let note = "";
    if (weeklyVolume >= 15) {
      impact = "positive";
      note = "Volume élevé favorable pour baisser le VLamax";
    } else if (weeklyVolume >= 8) {
      impact = "neutral";
      note = "Volume suffisant pour maintenir le VLamax";
    } else {
      impact = "negative";
      note = "Volume limité, VLamax difficile à optimiser";
    }
    items.push({
      icon: <Flame className="w-4 h-4" />,
      label: "Volume/semaine",
      value: `${weeklyVolume}h`,
      impact,
      note,
    });
  }

  return items;
}

// =============================================
// ZONE BAR COMPONENT (inversé : bas = mieux pour endurance)
// =============================================

function ZoneBar({
  zone,
  label,
  color,
  currentVlamax,
  isCurrentZone,
}: {
  zone: { min: number; max: number; label: string };
  label: string;
  color: "emerald" | "amber" | "rose";
  currentVlamax: number | null;
  isCurrentZone: boolean;
}) {
  const colorClasses = {
    emerald: {
      bg: "bg-emerald-500/20",
      bar: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-500",
    },
    amber: {
      bg: "bg-amber-500/20",
      bar: "bg-amber-500",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-500",
    },
    rose: {
      bg: "bg-rose-500/20",
      bar: "bg-rose-500",
      text: "text-rose-600 dark:text-rose-400",
      border: "border-rose-500",
    },
  };

  const colors = colorClasses[color];
  const progress = getProgressInZone(currentVlamax, zone);
  const isInZone = currentVlamax && currentVlamax >= zone.min && currentVlamax <= zone.max;

  return (
    <div className={cn(
      "p-3 rounded-lg border transition-all",
      isCurrentZone ? `${colors.bg} ${colors.border} border-2` : "bg-muted/30 border-border"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-medium", isCurrentZone ? colors.text : "text-foreground")}>
            {label}
          </span>
          {isCurrentZone && (
            <Badge variant="outline" className={cn("text-xs", colors.text, colors.border)}>
              Actuel
            </Badge>
          )}
        </div>
        <span className={cn("font-mono font-bold text-sm", colors.text)}>
          {zone.min.toFixed(2)} – {zone.max.toFixed(2)} mmol/L/s
        </span>
      </div>
      
      {/* Barre de progression dans la zone */}
      <div className={cn("h-2 rounded-full overflow-hidden", colors.bg)}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", colors.bar)}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {isInZone && currentVlamax && (
        <div className="mt-1.5 text-xs text-muted-foreground">
          Position: {currentVlamax.toFixed(2)} mmol/L/s ({Math.round(progress)}% de la zone)
        </div>
      )}
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function VLamaxTargetsCard({
  objectif,
  age,
  currentVlamax,
  vo2max,
  weeklyVolume,
  className,
}: VLamaxTargetsCardProps) {
  const targets = getVLamaxLevelTargets(objectif, age);
  const currentZone = getCurrentZone(currentVlamax, targets);
  const justifications = buildJustifications({ objectif, age, vo2max, weeklyVolume, currentVlamax });

  // Déterminer le statut global
  const getStatusBadge = () => {
    if (!currentVlamax) return null;
    if (currentZone === "elite" || currentZone === "below-elite") {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500">
          Profil optimal
        </Badge>
      );
    }
    if (currentZone === "ambitieux") {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500">
          Progression possible
        </Badge>
      );
    }
    if (currentZone === "above") {
      return (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500">
          Travail prioritaire
        </Badge>
      );
    }
    return null;
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="w-5 h-5 text-primary" />
          VLamax cible selon l'objectif
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Le VLamax représente la capacité glycolytique maximale. 
                  Pour les sports d'endurance, un VLamax bas favorise l'oxydation des lipides.
                  Les zones sont ajustées selon votre objectif sportif.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm text-muted-foreground">
            Objectif : <span className="font-medium text-foreground">{getObjectifLabel(objectif)}</span>
          </p>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contexte objectif */}
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm text-muted-foreground">
            {getObjectifContext(objectif)}
          </p>
        </div>

        {/* Valeur actuelle */}
        {currentVlamax && (
          <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/30">
            <div className="p-2 bg-primary/20 rounded-full">
              <TrendingDown className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-sm text-muted-foreground">VLamax actuel</span>
              <div className="font-mono font-bold text-xl text-primary">
                {currentVlamax.toFixed(2)} mmol/L/s
              </div>
            </div>
          </div>
        )}

        {/* Zones cibles - Note: pour VLamax, plus bas = mieux */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground italic mb-2">
            ⬇️ Plus le VLamax est bas, meilleure est l'endurance lipidique
          </p>
          <ZoneBar
            zone={targets.elite}
            label="🔹 Zone élite / Oxydatif"
            color="emerald"
            currentVlamax={currentVlamax}
            isCurrentZone={currentZone === "elite" || currentZone === "below-elite"}
          />
          <ZoneBar
            zone={targets.ambitieux}
            label="🔸 Zone ambitieuse"
            color="amber"
            currentVlamax={currentVlamax}
            isCurrentZone={currentZone === "ambitieux"}
          />
          <ZoneBar
            zone={targets.acceptable}
            label="🔺 Zone acceptable"
            color="rose"
            currentVlamax={currentVlamax}
            isCurrentZone={currentZone === "acceptable" || currentZone === "above"}
          />
        </div>

        {/* Justifications */}
        {justifications.length > 0 && (
          <div className="pt-3 border-t border-border">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              Facteurs influençant les cibles
            </h4>
            <div className="space-y-2">
              {justifications.map((item, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "flex items-start gap-3 p-2 rounded-lg text-sm",
                    item.impact === "positive" && "bg-emerald-500/10",
                    item.impact === "neutral" && "bg-muted/30",
                    item.impact === "negative" && "bg-amber-500/10"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-full",
                    item.impact === "positive" && "bg-emerald-500/20 text-emerald-600",
                    item.impact === "neutral" && "bg-muted text-muted-foreground",
                    item.impact === "negative" && "bg-amber-500/20 text-amber-600"
                  )}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.label}:</span>
                      <span className="font-mono">{item.value}</span>
                    </div>
                    {item.note && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning général */}
        {targets.warning && (
          <div className="p-3 bg-muted/50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground italic">
              ℹ️ {targets.warning}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
