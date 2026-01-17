/**
 * FatigueCard - Affiche l'état de fatigue fonctionnelle
 * "FatigueIndex™ – Two For Coaching Lab"
 * 
 * Zones officielles:
 * 🟢 0-30% → Faible fatigue
 * 🟡 31-55% → Fatigue modérée (gérable)
 * 🟠 56-75% → Fatigue élevée (attention qualité)
 * 🔴 > 75% → Fatigue critique (risque surperformance / blessure)
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Battery, 
  BatteryLow, 
  BatteryWarning,
  BatteryMedium,
  Info, 
  ChevronDown, 
  ChevronUp,
  Activity,
  Clock,
  Zap,
  User,
  Brain,
  HelpCircle,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  FatigueEffectif, 
  FATIGUE_METHODOLOGY,
  FATIGUE_INDEX_DEFINITION,
  FATIGUE_INDEX_DISCLAIMER,
  FATIGUE_POSITIVE_NOTE,
  getFatigueIcon,
  getFatigueBadgeClass
} from "@/lib/fatigueEffectif";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// =============================================
// ZONES OFFICIELLES FatigueIndex™
// =============================================

const FATIGUE_ZONES = [
  { min: 0, max: 30, label: "Faible", emoji: "🟢", color: "bg-green-500", textColor: "text-green-600 dark:text-green-400" },
  { min: 31, max: 55, label: "Modérée", emoji: "🟡", color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400" },
  { min: 56, max: 75, label: "Élevée", emoji: "🟠", color: "bg-orange-500", textColor: "text-orange-600 dark:text-orange-400" },
  { min: 76, max: 100, label: "Critique", emoji: "🔴", color: "bg-red-500", textColor: "text-red-600 dark:text-red-400" },
];

function getFatigueZone(score: number) {
  return FATIGUE_ZONES.find(z => score >= z.min && score <= z.max) || FATIGUE_ZONES[3];
}

// =============================================
// TYPES
// =============================================

interface FatigueCardProps {
  fatigue: FatigueEffectif;
  isStaffMode?: boolean;
  className?: string;
}

// =============================================
// ZONE INDICATOR COMPONENT
// =============================================

function ZoneIndicator({ score }: { score: number }) {
  return (
    <div className="flex gap-1 w-full">
      {FATIGUE_ZONES.map((zone) => {
        const isActive = score >= zone.min && score <= zone.max;
        const width = zone.max - zone.min + 1;
        
        return (
          <div
            key={zone.label}
            className={cn(
              "h-2 rounded-full transition-all relative",
              isActive ? zone.color : "bg-muted"
            )}
            style={{ flex: width }}
          >
            {isActive && (
              <div 
                className="absolute -top-1 w-3 h-3 rounded-full bg-foreground border-2 border-background shadow-md"
                style={{ 
                  left: `${((score - zone.min) / (zone.max - zone.min + 1)) * 100}%`,
                  transform: "translateX(-50%)"
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================
// CONTRIBUTION BAR COMPONENT
// =============================================

function ContributionBar({
  label,
  icon,
  emoji,
  value,
  weightedValue,
  maxValue = 100,
}: {
  label: string;
  icon: React.ReactNode;
  emoji: string;
  value: number;
  weightedValue: number;
  maxValue?: number;
}) {
  const percentage = (value / maxValue) * 100;
  const zone = getFatigueZone(value);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span>{emoji}</span>
          {icon}
          <span>{label}</span>
        </div>
        <span className="font-mono font-medium">
          +{weightedValue}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", zone.color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// =============================================
// COMPRENDRE MA FATIGUE DIALOG
// =============================================

function ComprenderFatigueDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 w-full">
          <HelpCircle className="h-4 w-4" />
          Comprendre ma fatigue
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            {FATIGUE_METHODOLOGY.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 text-sm">
          {/* Définition */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="whitespace-pre-line text-muted-foreground">
              {FATIGUE_INDEX_DEFINITION}
            </p>
          </div>
          
          {/* Zones */}
          <div>
            <h4 className="font-medium mb-2">Zones d'interprétation</h4>
            <div className="space-y-2">
              {FATIGUE_ZONES.map((zone) => (
                <div key={zone.label} className="flex items-center gap-3">
                  <span className="text-lg">{zone.emoji}</span>
                  <div className={cn("w-16 h-2 rounded-full", zone.color)} />
                  <span className="font-medium">{zone.min}-{zone.max}%</span>
                  <span className="text-muted-foreground">→ {zone.label}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Composantes */}
          <div>
            <h4 className="font-medium mb-2">Les 4 composantes du FatigueIndex™</h4>
            <div className="space-y-2">
              {FATIGUE_METHODOLOGY.pillars.map((pillar) => (
                <div key={pillar.id} className="flex items-start gap-2 p-2 rounded bg-muted/30">
                  <span className="text-lg">{pillar.emoji}</span>
                  <div>
                    <p className="font-medium">{pillar.name} ({pillar.weight}%)</p>
                    <p className="text-xs text-muted-foreground">{pillar.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Note positive */}
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-green-700 dark:text-green-400 text-xs">
              💡 {FATIGUE_POSITIVE_NOTE}
            </p>
          </div>
          
          {/* Disclaimer */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{FATIGUE_INDEX_DISCLAIMER}</span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function FatigueCard({
  fatigue,
  isStaffMode = false,
  className,
}: FatigueCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const zone = getFatigueZone(fatigue.score);

  const getBatteryIcon = () => {
    if (fatigue.score <= 30) {
      return <Battery className="w-6 h-6 text-green-500" />;
    }
    if (fatigue.score <= 55) {
      return <BatteryMedium className="w-6 h-6 text-amber-500" />;
    }
    if (fatigue.score <= 75) {
      return <BatteryWarning className="w-6 h-6 text-orange-500" />;
    }
    return <BatteryLow className="w-6 h-6 text-red-500" />;
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {getBatteryIcon()}
          FatigueIndex™
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="text-sm font-medium mb-2">{FATIGUE_METHODOLOGY.title}</p>
                <p className="text-xs text-muted-foreground">
                  Indice fonctionnel d'état du système (0-100%)
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score principal avec zone */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono">
                {fatigue.score}%
              </span>
              <Badge className={cn("text-xs gap-1", zone.textColor, "bg-transparent border", `border-current`)}>
                {zone.emoji} {zone.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {fatigue.messageAthlete}
            </p>
          </div>
          <div className="text-4xl">
            {zone.emoji}
          </div>
        </div>

        {/* Barre de zones */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>🟢 Frais</span>
            <span>🔴 Critique</span>
          </div>
          <ZoneIndicator score={fatigue.score} />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0%</span>
            <span>30%</span>
            <span>55%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Confiance */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Confiance du calcul</span>
          <span className="font-medium">
            {Math.round(fatigue.confidence * 100)}%
          </span>
        </div>

        {/* Bouton Comprendre ma fatigue */}
        <ComprenderFatigueDialog />

        {/* Mode Staff : Détail des contributions */}
        {isStaffMode && (
          <Collapsible open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-between"
              >
                <span className="text-xs">Détail des composantes</span>
                {isDetailOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <ContributionBar
                label="Charge récente (40%)"
                emoji="📊"
                icon={<Activity className="w-3.5 h-3.5" />}
                value={fatigue.contributions.chargeRecente}
                weightedValue={fatigue.contributionsWeighted.chargeRecente}
              />
              <ContributionBar
                label="Durabilité / TTE (25%)"
                emoji="⏱️"
                icon={<Clock className="w-3.5 h-3.5" />}
                value={fatigue.contributions.tte}
                weightedValue={fatigue.contributionsWeighted.tte}
              />
              <ContributionBar
                label="Profil métabolique (20%)"
                emoji="🧬"
                icon={<Zap className="w-3.5 h-3.5" />}
                value={fatigue.contributions.fraicheur + fatigue.contributions.modulateurs}
                weightedValue={fatigue.contributionsWeighted.fraicheur + fatigue.contributionsWeighted.modulateurs}
              />
              <ContributionBar
                label="Signaux subjectifs (15%)"
                emoji="💭"
                icon={<User className="w-3.5 h-3.5" />}
                value={fatigue.contributions.fatiguePercue}
                weightedValue={fatigue.contributionsWeighted.fatiguePercue}
              />

              {/* Données utilisées */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Données utilisées :</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TSS 7j</span>
                    <span className="font-mono">
                      {fatigue.inputsUsed.tss7d ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TTE</span>
                    <span className="font-mono">
                      {fatigue.inputsUsed.tteEffectif ?? "—"} min
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VLamax</span>
                    <span className="font-mono">
                      {fatigue.inputsUsed.vlamax?.toFixed(2) ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Âge</span>
                    <span className="font-mono">
                      {fatigue.inputsUsed.age ?? "—"} ans
                    </span>
                  </div>
                </div>
              </div>

              {/* Données manquantes */}
              {fatigue.reasonsMissing.length > 0 && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    ⚠️ Données manquantes : {fatigue.reasonsMissing.join(", ")}
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Recommandations */}
        {fatigue.recommendations.length > 0 && fatigue.score >= 30 && (
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs font-medium mb-2">Recommandations :</p>
            <ul className="space-y-1">
              {fatigue.recommendations.slice(0, 2).map((rec, idx) => (
                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground italic text-center">
          {FATIGUE_INDEX_DISCLAIMER.split('\n')[0]}
        </p>
      </CardContent>
    </Card>
  );
}
