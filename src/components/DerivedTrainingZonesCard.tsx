/**
 * DerivedTrainingZonesCard — zones d'entraînement dérivées de la physiologie.
 * Chaque zone affiche sa condition physiologique et ses bornes propres à
 * l'athlète, avec un badge de source (« Zones calculées » vs « Grille standard »).
 */
import { useState } from "react";
import { Activity, Bike, Footprints, Heart, Wind, Flame, Mountain, TrendingUp, Zap, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDerivedTrainingZones } from "@/hooks/useDerivedTrainingZones";
import type { DerivedZoneSet } from "@/lib/zones/deriveTrainingZones";
import type { ZoneId6 } from "@/lib/zones/zoneMapping";

const ZONE_ICONS: Record<ZoneId6, React.ComponentType<{ className?: string }>> = {
  Z1: Heart,
  Z2: Wind,
  Z3: Activity,
  Z4: TrendingUp,
  Z5: Flame,
  Z6: Zap,
};

const ZONE_COLOR: Record<ZoneId6, string> = {
  Z1: "text-sky-400 bg-sky-400/10",
  Z2: "text-emerald-400 bg-emerald-400/10",
  Z3: "text-lime-400 bg-lime-400/10",
  Z4: "text-amber-400 bg-amber-400/10",
  Z5: "text-orange-400 bg-orange-400/10",
  Z6: "text-red-400 bg-red-400/10",
};

function SourceBadge({ set }: { set: DerivedZoneSet }) {
  const derived = set.source === "derived";
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[11px] font-medium",
        derived
          ? "bg-success/10 text-success border-success/30"
          : "bg-muted text-muted-foreground border-border",
      )}
    >
      {derived
        ? `Zones calculées · confiance ${Math.round(set.confidence * 100)} %`
        : `Grille standard${set.fallbackReason ? ` · ${set.fallbackReason}` : ""}`}
    </Badge>
  );
}

function ZoneList({ set }: { set: DerivedZoneSet }) {
  const [expanded, setExpanded] = useState<ZoneId6 | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge set={set} />
        {set.source === "standard" && (
          <span className="text-xs text-muted-foreground">
            Complète les données physiologiques pour obtenir des zones personnalisées.
          </span>
        )}
      </div>

      {set.anchors.length > 0 && (
        <div className="rounded-xl bg-secondary/30 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Info className="h-3 w-3" /> Ancrages utilisés
          </p>
          <ul className="space-y-0.5">
            {set.anchors.map((a) => (
              <li key={a} className="text-xs text-foreground">• {a}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        {set.zones.map((zone) => {
          const Icon = ZONE_ICONS[zone.id];
          const open = expanded === zone.id;
          return (
            <div
              key={zone.id}
              onClick={() => setExpanded(open ? null : zone.id)}
              className={cn(
                "cursor-pointer rounded-xl border border-border p-3 transition-all",
                "hover:border-primary/30",
                open && "border-primary/50 bg-secondary/40",
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("shrink-0 rounded-lg p-2", ZONE_COLOR[zone.id])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-foreground">{zone.id}</span>
                    <span className="truncate text-sm text-foreground">{zone.label}</span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{zone.condition}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm text-foreground">
                    {zone.pctRef.min}–{zone.pctRef.max} <span className="text-xs text-muted-foreground">{zone.refLabel}</span>
                  </p>
                  {zone.absolute && (
                    <p className="font-mono text-xs text-muted-foreground">{zone.absolute}</p>
                  )}
                </div>
              </div>

              {open && (
                <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border pt-3 md:grid-cols-2">
                  <div className="rounded-lg bg-secondary/30 p-3">
                    <p className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Condition physiologique</p>
                    <p className="text-sm text-foreground">{zone.condition}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/30 p-3">
                    <p className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Cardio</p>
                    <p className="font-mono text-sm text-foreground">
                      {zone.heartRate ?? (zone.fcMaxPct ? `${zone.fcMaxPct.min}–${zone.fcMaxPct.max} % FCmax` : "N/A")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DerivedTrainingZonesCard({ className }: { className?: string }) {
  const { bike, run } = useDerivedTrainingZones();

  return (
    <div className={cn("glass-card p-6", className)}>
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-xl bg-accent/10 p-3 text-accent">
          <Activity className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Zones d'entraînement</h2>
          <p className="text-sm text-muted-foreground">
            6 zones dérivées des seuils physiologiques (LT1 · FatMax · MLSS · vVO₂max)
          </p>
        </div>
      </div>

      <Tabs defaultValue="run">
        <TabsList className="mb-4">
          <TabsTrigger value="run" className="gap-1.5">
            <Footprints className="h-4 w-4" /> Course
          </TabsTrigger>
          <TabsTrigger value="bike" className="gap-1.5">
            <Bike className="h-4 w-4" /> Vélo
          </TabsTrigger>
        </TabsList>
        <TabsContent value="run">
          <ZoneList set={run} />
        </TabsContent>
        <TabsContent value="bike">
          <ZoneList set={bike} />
        </TabsContent>
      </Tabs>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] italic text-muted-foreground">
        <Mountain className="h-3 w-3" />
        Les bornes sont recalculées à chaque nouveau snapshot. En cas de données insuffisantes, la grille standard TFCL prend le relais.
      </p>
    </div>
  );
}
