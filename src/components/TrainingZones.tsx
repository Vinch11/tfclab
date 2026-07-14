import { useState } from "react";
import { Activity, Flame, Heart, Zap, Wind, Mountain, TrendingUp, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRAINING_ZONES, ZONES_METHODOLOGY_NOTE, getZoneWarnings, type ZoneId } from "@/lib/trainingZonesDefinition";

const ICONS: Record<ZoneId, React.ComponentType<{ className?: string }>> = {
  Z1: Heart,
  Z2: Wind,
  Z3: Activity,
  Z4a: TrendingUp,
  Z4b: Gauge,
  Z5: Flame,
  Z6: Mountain,
  Z7: Zap,
};

function fmtPct(range: { min: number; max: number } | null, suffix = "%") {
  if (!range) return "N/A";
  return `${range.min}-${range.max}${suffix}`;
}

export function TrainingZones() {
  const [selectedZone, setSelectedZone] = useState<ZoneId | null>(null);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 rounded-xl bg-accent/10 text-accent">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Zones d'Entraînement</h2>
          <p className="text-sm text-muted-foreground">Grille Physiologique Z1 → Z7 · TFCL™</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-6 italic">{ZONES_METHODOLOGY_NOTE}</p>

      {/* Header row (desktop) */}
      <div className="hidden lg:grid grid-cols-12 gap-2 px-4 pb-2 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
        <div className="col-span-3">Zone</div>
        <div className="col-span-2 text-right">% FCmax</div>
        <div className="col-span-2 text-right">% VMA</div>
        <div className="col-span-2 text-right">% FTP</div>
        <div className="col-span-3 text-right">Position seuils</div>
      </div>

      <div className="space-y-2 mt-3">
        {TRAINING_ZONES.map((zone) => {
          const Icon = ICONS[zone.id];
          const isSelected = selectedZone === zone.id;
          const warnings = getZoneWarnings(zone.id);

          return (
            <div
              key={zone.id}
              onClick={() => setSelectedZone(isSelected ? null : zone.id)}
              className={cn(
                "p-3 rounded-xl border border-border cursor-pointer transition-all duration-300",
                "hover:border-primary/30 hover:shadow-lg",
                isSelected && "border-primary/50 bg-secondary/50"
              )}
            >
              <div className="lg:grid lg:grid-cols-12 lg:gap-2 lg:items-center flex items-center gap-3">
                <div className="col-span-3 flex items-center gap-3 min-w-0 flex-1 lg:flex-none">
                  <div className={cn("p-2 rounded-lg shrink-0", zone.bgColor)}>
                    <Icon className={cn("w-4 h-4", zone.color)} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-bold", zone.color)}>{zone.id}</span>
                      <h3 className="font-medium text-foreground text-sm truncate">{zone.label}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground truncate lg:hidden">{zone.description}</p>
                  </div>
                </div>

                <div className="hidden lg:block col-span-2 text-right font-mono text-sm text-foreground">
                  {fmtPct(zone.fcMax)}
                </div>
                <div className="hidden lg:block col-span-2 text-right font-mono text-sm text-foreground">
                  {fmtPct(zone.vma)}
                </div>
                <div className="hidden lg:block col-span-2 text-right font-mono text-sm text-foreground">
                  {fmtPct(zone.ftp)}
                </div>
                <div className="hidden lg:block col-span-3 text-right text-xs text-muted-foreground">
                  {zone.positionSeuils}
                </div>
              </div>

              {isSelected && (
                <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Paramètres travaillés</p>
                    <p className="text-sm text-foreground">{zone.parametresTravailles}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Durée typique</p>
                    <p className="text-sm text-foreground">{zone.durationTypique}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30 md:col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Impact métabolique</p>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="text-foreground">VLamax <span className="font-mono font-bold">{zone.impactMetabolique.vlamax}</span></span>
                      <span className="text-foreground">TTE <span className="font-mono font-bold">{zone.impactMetabolique.tte}</span></span>
                      <span className="text-foreground">VO2max <span className="font-mono font-bold">{zone.impactMetabolique.vo2max}</span></span>
                    </div>
                    {zone.impactMetabolique.notes && (
                      <p className="text-xs text-muted-foreground mt-2">{zone.impactMetabolique.notes}</p>
                    )}
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30 lg:hidden md:col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Intensités</p>
                    <p className="text-sm text-foreground font-mono">
                      FC {fmtPct(zone.fcMax)} · VMA {fmtPct(zone.vma)} · FTP {fmtPct(zone.ftp)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{zone.positionSeuils}</p>
                  </div>
                  {warnings.length > 0 && (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 md:col-span-2">
                      {warnings.map((w, i) => (
                        <p key={i} className="text-xs text-yellow-500">⚠ {w}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
