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
// ZONE BAR COMPONENT
// =============================================

function ZoneBar({
  zone,
  label,
  color,
  currentFtpKg,
  isCurrentZone,
}: {
  zone: { min: number; max: number; label: string };
  label: string;
  color: "emerald" | "amber" | "rose";
  currentFtpKg: number | null;
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
  const progress = getProgressInZone(currentFtpKg, zone);
  const isInZone = currentFtpKg && currentFtpKg >= zone.min && currentFtpKg <= zone.max;

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
          {zone.min.toFixed(1)} – {zone.max.toFixed(1)} W/kg
        </span>
      </div>
      
      {/* Barre de progression dans la zone */}
      <div className={cn("h-2 rounded-full overflow-hidden", colors.bg)}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", colors.bar)}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {isInZone && currentFtpKg && (
        <div className="mt-1.5 text-xs text-muted-foreground">
          Position: {currentFtpKg.toFixed(2)} W/kg ({Math.round(progress)}% de la zone)
        </div>
      )}
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
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="w-5 h-5 text-primary" />
          FTP cible à moyen terme (12–24 mois)
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Ces zones sont ajustées selon votre âge, profil métabolique et objectif sportif. 
                  Elles représentent des trajectoires réalistes, pas des objectifs absolus.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Objectif : <span className="font-medium text-foreground">{getObjectifLabel(objectif)}</span>
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Valeur actuelle */}
        {currentFtpKg && (
          <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/30">
            <div className="p-2 bg-primary/20 rounded-full">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-sm text-muted-foreground">FTP actuel</span>
              <div className="font-mono font-bold text-xl text-primary">
                {currentFtpKg.toFixed(2)} W/kg
              </div>
            </div>
          </div>
        )}

        {/* Zones cibles */}
        <div className="space-y-2">
          <ZoneBar
            zone={targets.plausible}
            label="🔹 Zone réaliste"
            color="emerald"
            currentFtpKg={currentFtpKg}
            isCurrentZone={currentZone === "plausible"}
          />
          <ZoneBar
            zone={targets.ambitieux}
            label="🔸 Zone ambitieuse"
            color="amber"
            currentFtpKg={currentFtpKg}
            isCurrentZone={currentZone === "ambitieux"}
          />
          <ZoneBar
            zone={targets.eliteImprobable}
            label="🔺 Zone élite / improbable"
            color="rose"
            currentFtpKg={currentFtpKg}
            isCurrentZone={currentZone === "elite"}
          />
        </div>

        {/* Justifications */}
        {justifications.length > 0 && (
          <div className="pt-3 border-t border-border">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              Justification des cibles
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
