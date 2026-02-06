import { ArrowDown, ArrowUp, Minus, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Athlete } from "@/types/athlete";
import { comparerEvolution, ComparaisonEvolution } from "@/lib/athleteStore";

interface TestComparisonProps {
  athlete: Athlete;
}

export function TestComparison({ athlete }: TestComparisonProps) {
  const comparaisons = comparerEvolution(athlete, athlete.objectif);

  if (comparaisons.length < 2) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-secondary/50 text-muted-foreground">
            <GitCompare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Évolution</h2>
            <p className="text-sm text-muted-foreground">
              Minimum 2 profils requis pour comparer
            </p>
          </div>
        </div>
        <p className="text-center text-muted-foreground py-8">
          Ajoutez au moins 2 profils pour voir l'évolution
        </p>
      </div>
    );
  }

  const formatDelta = (current: number, previous: number, unit: string, inverse: boolean = false) => {
    const delta = current - previous;
    const isPositive = inverse ? delta < 0 : delta > 0;
    const isNegative = inverse ? delta > 0 : delta < 0;
    
    return (
      <div className="flex items-center gap-1">
        {delta > 0 ? (
          <ArrowUp className={cn("w-4 h-4", isPositive ? "text-success" : "text-destructive")} />
        ) : delta < 0 ? (
          <ArrowDown className={cn("w-4 h-4", isNegative ? "text-destructive" : "text-success")} />
        ) : (
          <Minus className="w-4 h-4 text-muted-foreground" />
        )}
        <span
          className={cn(
            "font-mono font-semibold",
            delta === 0 && "text-muted-foreground",
            isPositive && "text-success",
            isNegative && "text-destructive"
          )}
        >
          {delta > 0 ? "+" : ""}
          {delta.toFixed(unit === "VLamax" ? 2 : 0)}
          {unit !== "VLamax" && ` ${unit}`}
        </span>
      </div>
    );
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-accent/10 text-accent">
          <GitCompare className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Évolution NOLIO</h2>
          <p className="text-sm text-muted-foreground">
            Comparaison entre les snapshots
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {comparaisons.slice(1).map((current, idx) => {
          const previous = comparaisons[idx];
          return (
            <div
              key={idx}
              className="p-4 rounded-xl bg-secondary/30 border border-border"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {new Date(previous.date).toLocaleDateString("fr-FR")}
                  </span>
                  <span className="text-primary">→</span>
                  <span className="text-sm font-medium text-foreground">
                    {new Date(current.date).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(current.date).toLocaleDateString("fr-FR")}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Δ VLamax</p>
                  {formatDelta(current.vlamax, previous.vlamax, "VLamax", true)}
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Δ TTE</p>
                  {formatDelta(current.tte, previous.tte, "min")}
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Δ FTP</p>
                  {formatDelta(current.ftp, previous.ftp, "W")}
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Δ VO2max</p>
                  {formatDelta(current.vo2max, previous.vo2max, "ml/kg")}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
