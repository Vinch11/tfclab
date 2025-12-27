import { Button } from "@/components/ui/button";
import { ExternalLink, Upload, Download, Calendar, Activity, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface NolioWorkout {
  id: string;
  name: string;
  type: string;
  zone: string;
  duration: string;
  tss: number;
  synced: boolean;
}

const sampleWorkouts: NolioWorkout[] = [
  { id: "1", name: "Endurance Z2", type: "Endurance", zone: "Z2", duration: "2h30", tss: 120, synced: true },
  { id: "2", name: "Sweet Spot 2x20", type: "Threshold", zone: "Z3-Z4", duration: "1h30", tss: 95, synced: true },
  { id: "3", name: "VO2max 5x4min", type: "Intervals", zone: "Z5", duration: "1h15", tss: 85, synced: false },
  { id: "4", name: "Récupération Active", type: "Recovery", zone: "Z1", duration: "1h00", tss: 35, synced: true },
  { id: "5", name: "Tempo Long", type: "Tempo", zone: "Z3", duration: "2h00", tss: 110, synced: false },
];

const zoneColors: Record<string, string> = {
  Z1: "bg-blue-400/10 text-blue-400",
  Z2: "bg-green-400/10 text-green-400",
  Z3: "bg-yellow-400/10 text-yellow-400",
  "Z3-Z4": "bg-orange-400/10 text-orange-400",
  Z4: "bg-orange-400/10 text-orange-400",
  Z5: "bg-red-400/10 text-red-400",
};

export function NolioMapping() {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Mapping Nolio</h2>
            <p className="text-sm text-muted-foreground">Synchronisez vos entraînements</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="glow" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="mb-6 p-4 rounded-xl bg-success/10 border border-success/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-success" />
          <div>
            <p className="text-sm font-medium text-foreground">Connecté à Nolio</p>
            <p className="text-xs text-muted-foreground">Dernière sync: il y a 2 heures</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-success hover:text-success">
          <ExternalLink className="w-4 h-4 mr-2" />
          Ouvrir Nolio
        </Button>
      </div>

      {/* Workouts List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
          <span>Entraînements planifiés</span>
          <span>{sampleWorkouts.filter(w => w.synced).length}/{sampleWorkouts.length} synchronisés</span>
        </div>

        {sampleWorkouts.map((workout) => (
          <div
            key={workout.id}
            className={cn(
              "p-4 rounded-xl border border-border hover:border-primary/30 transition-all duration-200",
              workout.synced ? "bg-secondary/20" : "bg-secondary/40"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-secondary">
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{workout.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">{workout.type}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", zoneColors[workout.zone] || zoneColors.Z3)}>
                      {workout.zone}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-mono text-foreground">{workout.duration}</p>
                  <p className="text-xs text-muted-foreground">TSS: {workout.tss}</p>
                </div>

                <div className="flex items-center gap-2">
                  {workout.synced ? (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <CheckCircle className="w-3 h-3" />
                      Sync
                    </span>
                  ) : (
                    <Button size="sm" variant="outline" className="text-xs h-7">
                      Sync
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Zone Mapping Info */}
      <div className="mt-6 p-4 rounded-xl bg-secondary/30 border border-border">
        <h3 className="text-sm font-medium text-foreground mb-3">Correspondance Zones Dan Lorang → Nolio</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-8 text-blue-400 font-mono">Z1</span>
            <span className="text-muted-foreground">→ Recovery</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 text-green-400 font-mono">Z2</span>
            <span className="text-muted-foreground">→ Endurance</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 text-yellow-400 font-mono">Z3</span>
            <span className="text-muted-foreground">→ Tempo</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 text-orange-400 font-mono">Z4</span>
            <span className="text-muted-foreground">→ Threshold</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 text-red-400 font-mono">Z5</span>
            <span className="text-muted-foreground">→ VO2max</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 text-purple-400 font-mono">Z6</span>
            <span className="text-muted-foreground">→ Anaerobic</span>
          </div>
        </div>
      </div>
    </div>
  );
}
