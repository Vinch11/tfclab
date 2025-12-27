import { ArrowDown, ArrowUp, Minus, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import { AthleteWithTests, comparerTests, ComparaisonTest } from "@/lib/athleteStore";

interface TestComparisonProps {
  athlete: AthleteWithTests;
}

export function TestComparison({ athlete }: TestComparisonProps) {
  const comparaisons = comparerTests(athlete);

  if (comparaisons.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-secondary/50 text-muted-foreground">
            <GitCompare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Comparaison Tests</h2>
            <p className="text-sm text-muted-foreground">
              Minimum 2 tests requis pour comparer
            </p>
          </div>
        </div>
        <p className="text-center text-muted-foreground py-8">
          Ajoutez au moins 2 tests métaboliques pour voir l'évolution
        </p>
      </div>
    );
  }

  const formatDelta = (value: number, unit: string, inverse: boolean = false) => {
    const isPositive = inverse ? value < 0 : value > 0;
    const isNegative = inverse ? value > 0 : value < 0;
    
    return (
      <div className="flex items-center gap-1">
        {value > 0 ? (
          <ArrowUp className={cn("w-4 h-4", isPositive ? "text-success" : "text-destructive")} />
        ) : value < 0 ? (
          <ArrowDown className={cn("w-4 h-4", isNegative ? "text-destructive" : "text-success")} />
        ) : (
          <Minus className="w-4 h-4 text-muted-foreground" />
        )}
        <span
          className={cn(
            "font-mono font-semibold",
            value === 0 && "text-muted-foreground",
            isPositive && "text-success",
            isNegative && "text-destructive"
          )}
        >
          {value > 0 ? "+" : ""}
          {value.toFixed(unit === "VLamax" ? 3 : 0)}
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
          <h2 className="text-xl font-semibold text-foreground">Comparaison Tests</h2>
          <p className="text-sm text-muted-foreground">
            Évolution entre les tests métaboliques
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {comparaisons.map((comp, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-secondary/30 border border-border"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {new Date(comp.dateDebut).toLocaleDateString("fr-FR")}
                </span>
                <span className="text-primary">→</span>
                <span className="text-sm font-medium text-foreground">
                  {new Date(comp.dateFin).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {Math.round(
                  (new Date(comp.dateFin).getTime() -
                    new Date(comp.dateDebut).getTime()) /
                    (1000 * 60 * 60 * 24)
                )}{" "}
                jours
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Δ VLamax</p>
                {formatDelta(comp.deltaVlamax, "VLamax", true)}
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Δ TTE</p>
                {formatDelta(comp.deltaTte / 60, "min")}
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Δ CP</p>
                {formatDelta(comp.deltaCp, "W")}
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Δ Pmax</p>
                {formatDelta(comp.deltaPmax, "W")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}