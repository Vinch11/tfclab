import { useState } from "react";
import { Activity, Flame, Heart, Zap, Wind, Mountain } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrainingZone {
  id: number;
  name: string;
  description: string;
  powerRange: string;
  hrRange: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  objective: string;
  duration: string;
}

const methodZones: TrainingZone[] = [
  {
    id: 1,
    name: "Récupération Active",
    description: "Zone de récupération et régénération",
    powerRange: "< 55% FTP",
    hrRange: "50-60%",
    icon: Heart,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    objective: "Favoriser la circulation sanguine",
    duration: "30-90 min",
  },
  {
    id: 2,
    name: "Endurance Fondamentale",
    description: "Base aérobie, oxydation des graisses",
    powerRange: "55-75% FTP",
    hrRange: "60-72%",
    icon: Wind,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    objective: "Développer l'efficacité lipidique",
    duration: "2-6h",
  },
  {
    id: 3,
    name: "Tempo / Sweet Spot",
    description: "Zone d'intensité modérée",
    powerRange: "75-90% FTP",
    hrRange: "72-82%",
    icon: Activity,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
    objective: "Augmenter le seuil aérobie",
    duration: "20-90 min",
  },
  {
    id: 4,
    name: "Seuil Lactique",
    description: "Zone critique pour VLamax",
    powerRange: "90-105% FTP",
    hrRange: "82-92%",
    icon: Flame,
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    objective: "Élever le seuil lactique",
    duration: "8-30 min",
  },
  {
    id: 5,
    name: "VO2max",
    description: "Puissance aérobie maximale",
    powerRange: "105-120% FTP",
    hrRange: "92-100%",
    icon: Mountain,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    objective: "Améliorer la VO2max",
    duration: "3-8 min",
  },
  {
    id: 6,
    name: "Capacité Anaérobie",
    description: "Efforts glycolytiques intenses",
    powerRange: "> 120% FTP",
    hrRange: "Max",
    icon: Zap,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    objective: "Manipuler le VLamax",
    duration: "30s - 3 min",
  },
];

export function TrainingZones() {
  const [selectedZone, setSelectedZone] = useState<number | null>(null);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-accent/10 text-accent">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Zones d'Entraînement</h2>
          <p className="text-sm text-muted-foreground">Modèle Two For Coaching Lab™ - Optimisé VLamax</p>
        </div>
      </div>

      <div className="space-y-3">
        {methodZones.map((zone) => {
          const Icon = zone.icon;
          const isSelected = selectedZone === zone.id;

          return (
            <div
              key={zone.id}
              onClick={() => setSelectedZone(isSelected ? null : zone.id)}
              className={cn(
                "p-4 rounded-xl border border-border cursor-pointer transition-all duration-300",
                "hover:border-primary/30 hover:shadow-lg",
                isSelected && "border-primary/50 bg-secondary/50"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl", zone.bgColor)}>
                  <Icon className={cn("w-5 h-5", zone.color)} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-bold", zone.color)}>Z{zone.id}</span>
                    <h3 className="font-medium text-foreground">{zone.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{zone.description}</p>
                </div>

                <div className="hidden md:flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-muted-foreground">Puissance</p>
                    <p className="font-mono font-medium text-foreground">{zone.powerRange}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">FC</p>
                    <p className="font-mono font-medium text-foreground">{zone.hrRange}</p>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isSelected && (
                <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Objectif</p>
                    <p className="text-sm text-foreground">{zone.objective}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Durée Typique</p>
                    <p className="text-sm text-foreground">{zone.duration}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30 md:hidden">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Puissance / FC</p>
                    <p className="text-sm text-foreground">{zone.powerRange} | {zone.hrRange}</p>
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
