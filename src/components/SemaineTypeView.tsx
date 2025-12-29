import { useMemo } from "react";
import { Calendar, Dumbbell, Zap, Target, Clock, ChevronRight, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Athlete } from "@/types/athlete";
import { genererSemaineType, JourSemaine } from "@/lib/semaineGenerator";

interface SemaineTypeViewProps {
  athlete: Athlete;
}

const jourColors: Record<string, string> = {
  "Lundi": "border-l-muted-foreground",
  "Mardi": "border-l-primary",
  "Mercredi": "border-l-success",
  "Jeudi": "border-l-primary",
  "Vendredi": "border-l-muted-foreground",
  "Samedi": "border-l-accent",
  "Dimanche": "border-l-warning",
};

const typeIcons: Record<string, typeof Dumbbell> = {
  "Repos": Clock,
  "Z1": Clock,
  "Z2": Activity,
  "Long": Activity,
  "A1": Dumbbell,
  "A2": Dumbbell,
  "A3": Dumbbell,
  "B1": Zap,
  "B2": Zap,
  "C1": Target,
  "D1": Target,
};

export function SemaineTypeView({ athlete }: SemaineTypeViewProps) {
  const semaine = useMemo(() => genererSemaineType(athlete), [athlete]);

  if (!semaine) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-accent/10 text-accent">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Semaine Type</h2>
            <p className="text-sm text-muted-foreground">Aucun snapshot disponible</p>
          </div>
        </div>
        <p className="text-center text-muted-foreground py-8">
          Ajoutez un snapshot pour générer la semaine type
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-accent/10 text-accent">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Semaine Type</h2>
            <p className="text-sm text-muted-foreground">
              Générée selon la méthodologie Dan Lorang
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center px-3 py-1 rounded-lg bg-primary/10">
            <p className="text-xs text-muted-foreground">Priorité</p>
            <p className="text-sm font-semibold text-primary">{semaine.priorite}</p>
          </div>
          <div className="text-center px-3 py-1 rounded-lg bg-accent/10">
            <p className="text-xs text-muted-foreground">Volume</p>
            <p className="text-sm font-semibold text-accent">{semaine.volumeTotal}</p>
          </div>
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6 p-4 rounded-xl bg-secondary/30 border border-border">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">VLamax</p>
          <p className="text-lg font-bold font-mono text-primary">{semaine.vlamax.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">TTE</p>
          <p className="text-lg font-bold font-mono text-accent">{semaine.tte} min</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Séances clés</p>
          <p className="text-lg font-bold font-mono text-warning">{semaine.nbSeancesCles}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Objectif</p>
          <p className="text-lg font-bold font-mono text-success">{semaine.objectif}</p>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="space-y-3">
        {semaine.semaine.map((jour, idx) => {
          const Icon = typeIcons[jour.type] || Dumbbell;
          return (
            <div
              key={idx}
              className={cn(
                "p-4 rounded-xl border-l-4 bg-secondary/20 border border-border transition-all hover:bg-secondary/40",
                jourColors[jour.jour] || "border-l-border",
                jour.estCle && "ring-1 ring-primary/30"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    jour.estCle ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{jour.jour}</span>
                      {jour.estCle && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary">
                          CLÉ
                        </span>
                      )}
                      <span className="text-sm font-mono text-accent">{jour.type}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground mt-1">{jour.nom}</p>
                    {jour.contenu && (
                      <p className="text-sm text-muted-foreground">{jour.contenu}</p>
                    )}
                    {jour.description && (
                      <p className="text-xs text-muted-foreground mt-1">{jour.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{jour.objectif}</p>
                  {jour.intensite && (
                    <p className="text-sm font-mono text-primary">{jour.intensite}</p>
                  )}
                  {jour.format && (
                    <p className="text-xs text-accent">{jour.format}</p>
                  )}
                  {jour.duree && (
                    <p className="text-xs text-muted-foreground">{jour.duree}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary/50" />
            <span>Séance clé (priorité)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent/50" />
            <span>Spécifique course</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success/50" />
            <span>Endurance Z2</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-muted-foreground/50" />
            <span>Récupération</span>
          </div>
        </div>
      </div>
    </div>
  );
}
