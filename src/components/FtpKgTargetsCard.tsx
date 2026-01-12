/**
 * FtpKgTargetsCard - Affiche les zones cibles FTP/kg ajustées à l'âge et au profil
 * "Passer d'un objectif absolu à une plage réaliste"
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, AlertTriangle, Info, Zap, Activity, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFtpKgLevelTargets, FtpKgLevelTargets } from "@/lib/scoreEnvelope";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// =============================================
// TYPES
// =============================================

interface FtpKgTargetsCardProps {
  objectif: string;
  age?: number | null;
  currentFtpKg?: number | null;
  vo2max?: number | null;
  vlamax?: number | null;
  weeklyVolume?: number | null; // heures/semaine
  className?: string;
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

function getProgressInZone(currentFtpKg: number | null, zone: { min: number; max: number }): number {
  if (!currentFtpKg) return 0;
  if (currentFtpKg < zone.min) return 0;
  if (currentFtpKg > zone.max) return 100;
  return ((currentFtpKg - zone.min) / (zone.max - zone.min)) * 100;
}

function getCurrentZone(
  currentFtpKg: number | null, 
  targets: FtpKgLevelTargets
): "below" | "plausible" | "ambitieux" | "elite" {
  if (!currentFtpKg) return "below";
  if (currentFtpKg >= targets.eliteImprobable.min) return "elite";
  if (currentFtpKg >= targets.ambitieux.min) return "ambitieux";
  if (currentFtpKg >= targets.plausible.min) return "plausible";
  return "below";
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

function buildJustifications(props: {
  age?: number | null;
  vlamax?: number | null;
  vo2max?: number | null;
  weeklyVolume?: number | null;
  currentFtpKg?: number | null;
}): JustificationItem[] {
  const items: JustificationItem[] = [];
  const { age, vlamax, vo2max, weeklyVolume, currentFtpKg } = props;

  // Âge
  if (age) {
    let impact: "positive" | "neutral" | "negative" = "neutral";
    let note = "";
    if (age >= 55) {
      impact = "negative";
      note = "Récupération plus lente, gains limités";
    } else if (age >= 50) {
      impact = "negative";
      note = "Progression possible mais modérée";
    } else if (age >= 40) {
      impact = "neutral";
      note = "Potentiel encore significatif";
    } else if (age < 35) {
      impact = "positive";
      note = "Potentiel de progression élevé";
    }
    items.push({
      icon: <Calendar className="w-4 h-4" />,
      label: "Âge",
      value: `${age} ans`,
      impact,
      note,
    });
  }

  // VLamax
  if (vlamax !== null && vlamax !== undefined) {
    let impact: "positive" | "neutral" | "negative" = "neutral";
    let note = "";
    if (vlamax <= 0.35) {
      impact = "positive";
      note = "Profil endurant, favorable longue distance";
    } else if (vlamax <= 0.45) {
      impact = "neutral";
      note = "Profil équilibré";
    } else {
      impact = "negative";
      note = "Profil glycolytique, limiter la durée";
    }
    items.push({
      icon: <Zap className="w-4 h-4" />,
      label: "VLamax",
      value: `${vlamax.toFixed(2)} mmol/L/s`,
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
      note = "Excellente capacité aérobie";
    } else if (vo2max >= 50) {
      impact = "neutral";
      note = "Capacité aérobie correcte";
    } else {
      impact = "negative";
      note = "Potentiel aérobie à développer";
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
      note = "Volume conséquent pour progresser";
    } else if (weeklyVolume >= 8) {
      impact = "neutral";
      note = "Volume suffisant pour maintien/progression";
    } else {
      impact = "negative";
      note = "Volume limité, progression lente";
    }
    items.push({
      icon: <TrendingUp className="w-4 h-4" />,
      label: "Volume/semaine",
      value: `${weeklyVolume}h`,
      impact,
      note,
    });
  }

  return items;
}

// =============================================
// COMPACT ZONE BAR COMPONENT
// =============================================

function CompactZoneBar({
  zone,
  label,
  emoji,
  color,
  currentFtpKg,
  isCurrentZone,
}: {
  zone: { min: number; max: number; label: string };
  label: string;
  emoji: string;
  color: "emerald" | "amber" | "rose";
  currentFtpKg: number | null;
  isCurrentZone: boolean;
}) {
  const colorClasses = {
    emerald: "bg-emerald-500 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-500 text-rose-600 dark:text-rose-400",
  };

  return (
    <div className={cn(
      "flex items-center justify-between px-2 py-1.5 rounded text-sm",
      isCurrentZone ? "bg-primary/10 font-medium" : "bg-muted/30"
    )}>
      <span className="flex items-center gap-1.5">
        <span>{emoji}</span>
        <span className={isCurrentZone ? "text-foreground" : "text-muted-foreground"}>{label}</span>
        {isCurrentZone && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">Vous</Badge>}
      </span>
      <span className={cn("font-mono text-xs", colorClasses[color].split(" ").slice(1).join(" "))}>
        {zone.min.toFixed(1)}–{zone.max.toFixed(1)}
      </span>
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function FtpKgTargetsCard({
  objectif,
  age,
  currentFtpKg,
  vo2max,
  vlamax,
  weeklyVolume,
  className,
}: FtpKgTargetsCardProps) {
  const targets = getFtpKgLevelTargets(objectif, age, currentFtpKg);
  const currentZone = getCurrentZone(currentFtpKg, targets);
  const justifications = buildJustifications({ age, vlamax, vo2max, weeklyVolume, currentFtpKg });

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Target className="w-4 h-4 text-primary" />
            FTP cible (12–24 mois)
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Zones ajustées selon l'âge, le profil métabolique et l'objectif.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-3 pt-0 space-y-2">
        {/* Valeur actuelle + Objectif en ligne */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Objectif : <span className="font-medium text-foreground">{getObjectifLabel(objectif)}</span></span>
          {currentFtpKg && (
            <span className="font-mono font-bold text-primary text-sm">
              {currentFtpKg.toFixed(2)} W/kg
            </span>
          )}
        </div>

        {/* Zones compactes */}
        <div className="space-y-1">
          <CompactZoneBar
            zone={targets.plausible}
            label="Réaliste"
            emoji="🔹"
            color="emerald"
            currentFtpKg={currentFtpKg}
            isCurrentZone={currentZone === "plausible"}
          />
          <CompactZoneBar
            zone={targets.ambitieux}
            label="Ambitieux"
            emoji="🔸"
            color="amber"
            currentFtpKg={currentFtpKg}
            isCurrentZone={currentZone === "ambitieux"}
          />
          <CompactZoneBar
            zone={targets.eliteImprobable}
            label="Élite"
            emoji="🔺"
            color="rose"
            currentFtpKg={currentFtpKg}
            isCurrentZone={currentZone === "elite"}
          />
        </div>

        {/* Justifications ultra-compactes */}
        {justifications.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {justifications.map((item, idx) => (
              <TooltipProvider key={idx}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 cursor-help",
                        item.impact === "positive" && "border-emerald-500/50 text-emerald-600",
                        item.impact === "neutral" && "border-border",
                        item.impact === "negative" && "border-amber-500/50 text-amber-600"
                      )}
                    >
                      {item.label}: {item.value}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{item.note}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
