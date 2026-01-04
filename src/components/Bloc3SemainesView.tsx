import { useMemo, useState } from "react";
import { Calendar, ChevronDown, ChevronUp, Dumbbell, TrendingUp, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Athlete } from "@/types/athlete";
import { genererBloc3Semaines, BlocSemaine, ChargeType } from "@/lib/bloc3Semaines";
import { SEANCES } from "@/types/seances";
import { VLamaxEffectif } from "@/lib/vlamaxEffectif";
import { TTEEffectif } from "@/lib/tteEffectif";

interface Bloc3SemainesViewProps {
  athlete: Athlete;
  vlamaxEffectif?: VLamaxEffectif;
  tteEffectif?: TTEEffectif;
}

const chargeColors: Record<ChargeType, string> = {
  "Progressive": "bg-primary/10 text-primary border-primary/30",
  "Consolidation": "bg-accent/10 text-accent border-accent/30",
  "Allégée (-30%)": "bg-success/10 text-success border-success/30",
};

const chargeIcons: Record<ChargeType, typeof TrendingUp> = {
  "Progressive": TrendingUp,
  "Consolidation": Activity,
  "Allégée (-30%)": Calendar,
};

export function Bloc3SemainesView({ athlete, vlamaxEffectif, tteEffectif }: Bloc3SemainesViewProps) {
  const bloc = useMemo(() => genererBloc3Semaines(athlete, {
    vlamaxOverride: vlamaxEffectif?.value ?? null,
    tteOverride: tteEffectif?.tte_min ?? null,
  }), [athlete, vlamaxEffectif, tteEffectif]);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);

  if (!bloc) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-accent/10 text-accent">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Bloc 3 Semaines</h2>
            <p className="text-sm text-muted-foreground">Aucun snapshot disponible</p>
          </div>
        </div>
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
            <h2 className="text-xl font-semibold text-foreground">Bloc 3 Semaines</h2>
            <p className="text-sm text-muted-foreground">
              Cycle d'entraînement • Priorité: {bloc.priorite}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">TSS Total estimé</p>
          <p className="text-2xl font-bold font-mono text-primary">{bloc.tssTotal}</p>
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {bloc.semaines.map((semaine) => {
          const Icon = chargeIcons[semaine.charge];
          return (
            <div
              key={semaine.numeroSemaine}
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02]",
                chargeColors[semaine.charge],
                expandedWeek === semaine.numeroSemaine && "ring-2 ring-offset-2 ring-offset-background"
              )}
              onClick={() => setExpandedWeek(
                expandedWeek === semaine.numeroSemaine ? null : semaine.numeroSemaine
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Semaine {semaine.numeroSemaine}</span>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xs opacity-80">{semaine.charge}</p>
              <p className="text-lg font-mono font-bold mt-2">{semaine.tssEstime} TSS</p>
            </div>
          );
        })}
      </div>

      {/* Expanded Week Detail */}
      {expandedWeek && (
        <div className="animate-fade-in">
          {bloc.semaines
            .filter((s) => s.numeroSemaine === expandedWeek)
            .map((semaine) => (
              <div key={semaine.numeroSemaine} className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Semaine {semaine.numeroSemaine} - {semaine.charge}
                    </h3>
                    <p className="text-sm text-muted-foreground">{semaine.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedWeek(null)}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                </div>

                {semaine.semaine && (
                  <div className="grid gap-2">
                    {semaine.semaine.semaine.map((jour, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border",
                          jour.estCle 
                            ? "bg-primary/5 border-primary/20" 
                            : "bg-secondary/20 border-border"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-20 text-sm font-medium text-foreground">
                            {jour.jour}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-mono",
                            jour.estCle ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                          )}>
                            {jour.type}
                          </span>
                          <span className="text-sm text-muted-foreground">{jour.nom}</span>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {jour.intensite && <span>{jour.intensite}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Cycle Explanation */}
      <div className="mt-6 p-4 rounded-xl bg-secondary/20 border border-border">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Cycle 3:1</span> — 
          2 semaines de charge progressive suivies d'1 semaine allégée (-30%) pour permettre 
          l'adaptation et éviter le surentraînement. Ce pattern optimise les gains tout en 
          préservant la fraîcheur.
        </p>
      </div>
    </div>
  );
}
