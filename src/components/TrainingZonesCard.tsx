/**
 * TrainingZonesCard - Composant unique pour l'affichage des zones Z1 → Z7
 * Utilise la définition centrale trainingZonesDefinition.ts
 * Compatible Mode Staff pour afficher seuils et impacts métaboliques
 */

import { useState } from "react";
import { 
  Activity, Flame, Heart, Zap, Wind, Mountain, TrendingUp, Gauge,
  Info, ChevronDown, ChevronUp, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  TRAINING_ZONES, 
  TrainingZoneDefinition, 
  ZoneId,
  computeZoneAbsoluteValues,
  AthleteZoneRefs,
  getZoneWarnings,
  ZONES_METHODOLOGY_NOTE
} from "@/lib/trainingZonesDefinition";
import { useAthletes } from "@/contexts/AthleteContext";

interface TrainingZonesCardProps {
  staffMode?: boolean;
  className?: string;
  showMethodologyNote?: boolean;
  compact?: boolean;
}

const zoneIcons: Record<ZoneId, React.ComponentType<{ className?: string }>> = {
  Z1: Heart,
  Z2: Wind,
  Z3: Activity,
  Z4a: TrendingUp,
  Z4b: Gauge,
  Z5: Flame,
  Z6: Mountain,
  Z7: Zap
};

function ImpactBadge({ value, type }: { value: string; type: "vlamax" | "tte" | "vo2max" }) {
  const colorMap = {
    "↓↓": "bg-green-500/20 text-green-400 border-green-500/30",
    "↓": "bg-green-400/20 text-green-400 border-green-400/30",
    "neutre": "bg-muted/50 text-muted-foreground border-muted",
    "↑": "bg-amber-400/20 text-amber-400 border-amber-400/30",
    "↑↑": "bg-red-400/20 text-red-400 border-red-400/30"
  };
  
  // VLamax: down is good, TTE/VO2: up is good
  const invertedColorMap = {
    "↓↓": "bg-red-400/20 text-red-400 border-red-400/30",
    "↓": "bg-amber-400/20 text-amber-400 border-amber-400/30",
    "neutre": "bg-muted/50 text-muted-foreground border-muted",
    "↑": "bg-green-400/20 text-green-400 border-green-400/30",
    "↑↑": "bg-green-500/20 text-green-400 border-green-500/30"
  };
  
  const colors = type === "vlamax" ? colorMap : invertedColorMap;
  
  return (
    <span className={cn(
      "px-1.5 py-0.5 rounded text-xs font-mono border",
      colors[value as keyof typeof colors] || colors.neutre
    )}>
      {value}
    </span>
  );
}

function ZoneRow({ 
  zone, 
  refs, 
  isExpanded, 
  onToggle, 
  staffMode 
}: { 
  zone: TrainingZoneDefinition; 
  refs: AthleteZoneRefs;
  isExpanded: boolean;
  onToggle: () => void;
  staffMode: boolean;
}) {
  const Icon = zoneIcons[zone.id];
  const absoluteValues = computeZoneAbsoluteValues(zone, refs);
  const warnings = staffMode ? getZoneWarnings(zone.id) : [];
  
  return (
    <div
      className={cn(
        "p-4 rounded-xl border transition-all duration-200 cursor-pointer",
        "hover:border-primary/30 hover:shadow-lg",
        isExpanded ? "border-primary/50 bg-secondary/50" : "border-border"
      )}
      onClick={onToggle}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className={cn("p-3 rounded-xl shrink-0", zone.bgColor)}>
          <Icon className={cn("w-5 h-5", zone.color)} />
        </div>
        
        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-sm font-bold", zone.color)}>{zone.id}</span>
            <h3 className="font-medium text-foreground">{zone.label}</h3>
            {warnings.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    {warnings.map((w, i) => <p key={i}>{w}</p>)}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{zone.description}</p>
        </div>
        
        {/* Percentages */}
        <div className="hidden md:flex items-center gap-4 text-sm shrink-0">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">FC</p>
            <p className="font-mono text-foreground">
              {zone.fcMax ? `${zone.fcMax.min}-${zone.fcMax.max}%` : "N/A"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">VMA</p>
            <p className="font-mono text-foreground">{zone.vma.min}-{zone.vma.max}%</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">FTP</p>
            <p className="font-mono text-foreground">{zone.ftp.min}-{zone.ftp.max}%</p>
          </div>
        </div>
        
        {/* Expand Icon */}
        <div className="shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>
      
      {/* Expanded Section */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-in">
          {/* Absolute Values */}
          {(absoluteValues.fcBpm || absoluteValues.vmaKmh || absoluteValues.ftpWatts) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {absoluteValues.fcBpm && (
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">FC (bpm)</p>
                  <p className="text-sm font-mono text-foreground">
                    {absoluteValues.fcBpm.min}-{absoluteValues.fcBpm.max}
                  </p>
                </div>
              )}
              {absoluteValues.vmaKmh && (
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">VMA (km/h)</p>
                  <p className="text-sm font-mono text-foreground">
                    {absoluteValues.vmaKmh.min.toFixed(1)}-{absoluteValues.vmaKmh.max.toFixed(1)}
                  </p>
                </div>
              )}
              {absoluteValues.paceMinPerKm && (
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Allure</p>
                  <p className="text-sm font-mono text-foreground">
                    {absoluteValues.paceMinPerKm.min} → {absoluteValues.paceMinPerKm.max}/km
                  </p>
                </div>
              )}
              {absoluteValues.ftpWatts && (
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Puissance (W)</p>
                  <p className="text-sm font-mono text-foreground">
                    {absoluteValues.ftpWatts.min}-{absoluteValues.ftpWatts.max}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Physiological Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-secondary/30">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Objectif Physiologique</p>
              <p className="text-sm text-foreground">{zone.parametresTravailles}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Durée Typique</p>
              <p className="text-sm text-foreground">{zone.durationTypique}</p>
            </div>
          </div>
          
          {/* Staff Mode: Thresholds & Metabolic Impact */}
          {staffMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                <p className="text-xs text-accent uppercase tracking-wider mb-1">Position Seuils</p>
                <p className="text-sm text-foreground font-medium">{zone.positionSeuils}</p>
              </div>
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                <p className="text-xs text-accent uppercase tracking-wider mb-2">Impact Métabolique</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">VLamax:</span>
                    <ImpactBadge value={zone.impactMetabolique.vlamax} type="vlamax" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">TTE:</span>
                    <ImpactBadge value={zone.impactMetabolique.tte} type="tte" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">VO2:</span>
                    <ImpactBadge value={zone.impactMetabolique.vo2max} type="vo2max" />
                  </div>
                </div>
                {zone.impactMetabolique.notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    {zone.impactMetabolique.notes}
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Staff Mode: Warnings */}
          {staffMode && warnings.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <p className="text-xs text-amber-400 uppercase tracking-wider">Avertissement Staff</p>
              </div>
              {warnings.map((w, i) => (
                <p key={i} className="text-sm text-amber-200">{w}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TrainingZonesCard({ 
  staffMode = false, 
  className,
  showMethodologyNote = true,
  compact = false
}: TrainingZonesCardProps) {
  const { currentAthlete } = useAthletes();
  const [expandedZone, setExpandedZone] = useState<ZoneId | null>(null);
  
  // Get athlete refs
  const refs: AthleteZoneRefs = {
    fcMax: (currentAthlete?.refs as any)?.fcMax ?? null,
    vma: (currentAthlete?.refs as any)?.vma ?? null,
    ftp: (currentAthlete?.refs as any)?.ftp ?? null
  };
  
  const handleToggle = (zoneId: ZoneId) => {
    setExpandedZone(expandedZone === zoneId ? null : zoneId);
  };
  
  return (
    <div className={cn("glass-card p-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-accent/10 text-accent">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Zones d'Entraînement</h2>
            <p className="text-sm text-muted-foreground">Grille Physiologique Z1 → Z7</p>
          </div>
        </div>
        
        {staffMode && (
          <Badge variant="outline" className="text-accent border-accent/30">
            Mode Staff
          </Badge>
        )}
      </div>
      
      {/* Methodology Note */}
      {showMethodologyNote && (
        <div className="mb-6 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              {ZONES_METHODOLOGY_NOTE}
            </p>
          </div>
        </div>
      )}
      
      {/* Zones List */}
      <div className="space-y-3">
        {TRAINING_ZONES.map((zone) => (
          <ZoneRow
            key={zone.id}
            zone={zone}
            refs={refs}
            isExpanded={expandedZone === zone.id}
            onToggle={() => handleToggle(zone.id)}
            staffMode={staffMode}
          />
        ))}
      </div>
      
      {/* Staff Legend */}
      {staffMode && (
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Légende Impact Métabolique :</p>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">VLamax</span>
              <ImpactBadge value="↓" type="vlamax" />
              <span className="text-muted-foreground">= favorable</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">TTE / VO2</span>
              <ImpactBadge value="↑" type="tte" />
              <span className="text-muted-foreground">= favorable</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
