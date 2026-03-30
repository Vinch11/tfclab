/**
 * VmaTargetsCard — Affiche les zones cibles VMA pour les athlètes running
 * Équivalent running de FtpKgTargetsCard
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target, TrendingUp, AlertTriangle, Info, Zap, Activity, Calendar,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { getTargetsForAmbition, normalizeObjective } from "@/lib/physiologicalTargets";

// =============================================
// TYPES
// =============================================

interface VmaTargetsCardProps {
  objectif: string;
  age?: number | null;
  currentVma?: number | null;
  vo2max?: number | null;
  vlamax?: number | null;
  weeklyVolume?: number | null;
  className?: string;
}

interface VmaZone {
  min: number;
  max: number;
  label: string;
}

interface VmaLevelTargets {
  plausible: VmaZone;
  ambitieux: VmaZone;
  eliteImprobable: VmaZone;
}

// =============================================
// VMA TARGETS COMPUTATION
// =============================================

function getVmaLevelTargets(objectif: string, age?: number | null): VmaLevelTargets {
  const normalized = normalizeObjective(objectif);

  const finisher = getTargetsForAmbition(normalized, "finisher");
  const ageGroup = getTargetsForAmbition(normalized, "age_group");
  const competitor = getTargetsForAmbition(normalized, "competitor");
  const elite = getTargetsForAmbition(normalized, "elite");

  let plausibleMin = finisher.vma_min ?? 13.0;
  let plausibleMax = ageGroup.vma_min ?? 16.0;
  let ambitieuxMax = competitor.vma_min ?? 18.0;
  let eliteMax = elite.vma_min ?? 21.0;

  // Age adjustment: -0.3 km/h per decade above 40
  if (age && age > 40) {
    const decades = (age - 40) / 10;
    const reduction = decades * 0.3;
    plausibleMin = Math.max(10, plausibleMin - reduction);
    plausibleMax = Math.max(12, plausibleMax - reduction);
    ambitieuxMax = Math.max(14, ambitieuxMax - reduction);
    eliteMax = Math.max(16, eliteMax - reduction);
  }

  return {
    plausible: {
      min: Math.round(plausibleMin * 10) / 10,
      max: Math.round(plausibleMax * 10) / 10,
      label: "Réaliste",
    },
    ambitieux: {
      min: Math.round(plausibleMax * 10) / 10,
      max: Math.round(ambitieuxMax * 10) / 10,
      label: "Ambitieux",
    },
    eliteImprobable: {
      min: Math.round(ambitieuxMax * 10) / 10,
      max: Math.round(eliteMax * 10) / 10,
      label: "Élite",
    },
  };
}

// =============================================
// HELPERS
// =============================================

function getCurrentZone(
  currentVma: number | null,
  targets: VmaLevelTargets
): "below" | "plausible" | "ambitieux" | "elite" {
  if (!currentVma) return "below";
  if (currentVma >= targets.eliteImprobable.min) return "elite";
  if (currentVma >= targets.ambitieux.min) return "ambitieux";
  if (currentVma >= targets.plausible.min) return "plausible";
  return "below";
}

function getObjectifLabel(objectif: string): string {
  const labels: Record<string, string> = {
    Marathon: "Marathon",
    Semi: "Semi-Marathon",
    "10K": "10 km",
    "5K": "5 km",
    Trail: "Trail",
    TrailShort: "Trail Court",
    TrailMountain: "Trail Montagne",
    TrailUltra: "Ultra Trail",
    StartToRun: "Start to Run",
  };
  return labels[objectif] || objectif;
}

interface JustificationItem {
  icon: React.ReactNode;
  label: string;
  value: string;
  impact: "positive" | "neutral" | "negative";
  note?: string;
}

function buildJustifications(props: {
  age?: number | null;
  vlamax?: number | null;
  vo2max?: number | null;
  weeklyVolume?: number | null;
  currentVma?: number | null;
}): JustificationItem[] {
  const items: JustificationItem[] = [];
  const { age, vlamax, vo2max, weeklyVolume } = props;

  if (age) {
    let impact: JustificationItem["impact"] = "neutral";
    let note = "";
    if (age >= 55) { impact = "negative"; note = "Récupération plus lente, VMA en déclin"; }
    else if (age >= 50) { impact = "negative"; note = "Maintien VMA prioritaire"; }
    else if (age >= 40) { impact = "neutral"; note = "Progression VMA encore possible"; }
    else if (age < 35) { impact = "positive"; note = "Potentiel VMA élevé"; }
    items.push({ icon: <Calendar className="w-4 h-4" />, label: "Âge", value: `${age} ans`, impact, note });
  }

  if (vlamax !== null && vlamax !== undefined) {
    let impact: JustificationItem["impact"] = "neutral";
    let note = "";
    if (vlamax <= 0.35) { impact = "positive"; note = "Profil endurant, bon pour marathon/trail"; }
    else if (vlamax <= 0.45) { impact = "neutral"; note = "Profil équilibré"; }
    else { impact = "negative"; note = "Glycolytique, plus adapté au 5K/10K"; }
    items.push({ icon: <Zap className="w-4 h-4" />, label: "VLamax", value: `${vlamax.toFixed(2)}`, impact, note });
  }

  if (vo2max !== null && vo2max !== undefined) {
    let impact: JustificationItem["impact"] = "neutral";
    let note = "";
    if (vo2max >= 60) { impact = "positive"; note = "Excellente base aérobie"; }
    else if (vo2max >= 50) { impact = "neutral"; note = "Capacité aérobie correcte"; }
    else { impact = "negative"; note = "VO2max à développer"; }
    items.push({ icon: <Activity className="w-4 h-4" />, label: "VO2max", value: `${Math.round(vo2max)}`, impact, note });
  }

  if (weeklyVolume !== null && weeklyVolume !== undefined) {
    let impact: JustificationItem["impact"] = "neutral";
    let note = "";
    if (weeklyVolume >= 10) { impact = "positive"; note = "Volume suffisant pour progresser en VMA"; }
    else if (weeklyVolume >= 5) { impact = "neutral"; note = "Volume correct pour maintien"; }
    else { impact = "negative"; note = "Volume limité, progression lente"; }
    items.push({ icon: <TrendingUp className="w-4 h-4" />, label: "Volume/sem", value: `${weeklyVolume}h`, impact, note });
  }

  return items;
}

// =============================================
// ZONE BAR COMPONENT
// =============================================

function CompactZoneBar({
  zone, label, emoji, color, currentVma, isCurrentZone,
}: {
  zone: VmaZone;
  label: string;
  emoji: string;
  color: "emerald" | "amber" | "rose";
  currentVma: number | null;
  isCurrentZone: boolean;
}) {
  const colorClasses = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
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
      <span className={cn("font-mono text-xs", colorClasses[color])}>
        {zone.min.toFixed(1)}–{zone.max.toFixed(1)} km/h
      </span>
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function VmaTargetsCard({
  objectif, age, currentVma, vo2max, vlamax, weeklyVolume, className,
}: VmaTargetsCardProps) {
  const [showJustifications, setShowJustifications] = useState(false);
  const targets = getVmaLevelTargets(objectif, age);
  const currentZone = getCurrentZone(currentVma, targets);
  const justifications = buildJustifications({ age, vlamax, vo2max, weeklyVolume, currentVma });

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Target className="w-4 h-4 text-primary" />
            VMA cible (12–24 mois)
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Zones VMA ajustées selon l'âge, le profil métabolique et l'objectif course à pied.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-3 pt-0 space-y-2">
        {/* Current value + objective */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Objectif : <span className="font-medium text-foreground">{getObjectifLabel(objectif)}</span></span>
          {currentVma && (
            <span className="font-mono font-bold text-primary text-sm">
              {currentVma.toFixed(1)} km/h
            </span>
          )}
        </div>

        {/* Zones */}
        <div className="space-y-1">
          <CompactZoneBar
            zone={targets.plausible}
            label="Réaliste"
            emoji="🔹"
            color="emerald"
            currentVma={currentVma ?? null}
            isCurrentZone={currentZone === "plausible"}
          />
          <CompactZoneBar
            zone={targets.ambitieux}
            label="Ambitieux"
            emoji="🔸"
            color="amber"
            currentVma={currentVma ?? null}
            isCurrentZone={currentZone === "ambitieux"}
          />
          <CompactZoneBar
            zone={targets.eliteImprobable}
            label="Élite"
            emoji="🔺"
            color="rose"
            currentVma={currentVma ?? null}
            isCurrentZone={currentZone === "elite"}
          />
        </div>

        {/* Justifications */}
        {justifications.length > 0 && (
          <div className="pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowJustifications(!showJustifications)}
              className="w-full h-6 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              {showJustifications ? (
                <><ChevronUp className="w-3 h-3" /> Masquer justifications</>
              ) : (
                <><ChevronDown className="w-3 h-3" /> Voir justifications ({justifications.length})</>
              )}
            </Button>

            {showJustifications && (
              <div className="flex flex-wrap gap-1.5 pt-2">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
