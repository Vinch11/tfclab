import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Zap, TrendingUp, Info, Gauge, Flame, Droplets, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResultatVLamax,
  computeResultatVLamax,
  getProfilLabel,
  getProfilColor,
  getRecommendations,
} from "@/types/resultatVLamax";
import { Athlete } from "@/types/athlete";

interface VLamaxCalculatorProps {
  athlete?: Athlete;
  previousVlamax?: number;
}

export function VLamaxCalculator({ athlete, previousVlamax }: VLamaxCalculatorProps) {
  const [inputs, setInputs] = useState({
    ftp: athlete?.ftp || 280,
    poids: athlete?.poids || 70,
    vo2max: athlete?.vo2max || 65,
    pmax5s: 1200,
    lactateThreshold: 4.0,
  });

  const [resultat, setResultat] = useState<ResultatVLamax>({
    vlamax: 0.45,
    ig: 50,
    confiance: 75,
    delta_6sem: 0,
  });

  const [showDetails, setShowDetails] = useState(false);

  // Update inputs when athlete changes
  useEffect(() => {
    if (athlete) {
      setInputs((prev) => ({
        ...prev,
        ftp: athlete.ftp || prev.ftp,
        poids: athlete.poids || prev.poids,
        vo2max: athlete.vo2max || prev.vo2max,
      }));
    }
  }, [athlete]);

  useEffect(() => {
    const result = computeResultatVLamax(
      inputs.ftp,
      inputs.poids,
      inputs.vo2max,
      inputs.pmax5s,
      previousVlamax
    );
    setResultat(result);
  }, [inputs, previousVlamax]);

  const handleInputChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setInputs((prev) => ({ ...prev, [field]: numValue }));
  };

  const recommendations = getRecommendations(resultat, athlete?.objectif || "IM");

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-primary/10 text-primary">
          <Calculator className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Estimation VLamax</h2>
          <p className="text-sm text-muted-foreground">Basé sur la méthodologie Dan Lorang</p>
        </div>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ftp" className="text-muted-foreground">FTP (W)</Label>
          <Input
            id="ftp"
            type="number"
            value={inputs.ftp}
            onChange={(e) => handleInputChange("ftp", e.target.value)}
            className="bg-secondary/50 border-border focus:border-primary"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="poids" className="text-muted-foreground">Poids (kg)</Label>
          <Input
            id="poids"
            type="number"
            value={inputs.poids}
            onChange={(e) => handleInputChange("poids", e.target.value)}
            className="bg-secondary/50 border-border focus:border-primary"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vo2max" className="text-muted-foreground">VO2max (ml/kg/min)</Label>
          <Input
            id="vo2max"
            type="number"
            value={inputs.vo2max}
            onChange={(e) => handleInputChange("vo2max", e.target.value)}
            className="bg-secondary/50 border-border focus:border-primary"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pmax5s" className="text-muted-foreground">Pic de Puissance 5s (W)</Label>
          <Input
            id="pmax5s"
            type="number"
            value={inputs.pmax5s}
            onChange={(e) => handleInputChange("pmax5s", e.target.value)}
            className="bg-secondary/50 border-border focus:border-primary"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lactate" className="text-muted-foreground">Seuil Lactate (mmol/L)</Label>
          <Input
            id="lactate"
            type="number"
            step="0.1"
            value={inputs.lactateThreshold}
            onChange={(e) => handleInputChange("lactateThreshold", e.target.value)}
            className="bg-secondary/50 border-border focus:border-primary"
          />
        </div>
      </div>

      {/* Main Result Display */}
      <div className="mt-8 p-6 rounded-xl bg-secondary/30 border border-border">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* VLamax Result */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              <span className="text-sm text-muted-foreground uppercase tracking-wider">VLamax Estimé</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-bold font-mono text-primary">
                {resultat.vlamax.toFixed(2)}
              </span>
              <span className="text-muted-foreground">mmol/L/s</span>
            </div>
            
            {/* VLamax Bar */}
            <div className="space-y-2">
              <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-500 bg-gradient-to-r from-primary via-success to-accent"
                  style={{ width: `${Math.min(100, ((resultat.vlamax - 0.2) / 0.7) * 100)}%` }}
                />
                <div 
                  className="absolute top-0 h-full w-0.5 bg-foreground/50"
                  style={{ left: `${((0.45 - 0.2) / 0.7) * 100}%` }}
                  title="Équilibré"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Endurant</span>
                <span>Explosif</span>
              </div>
            </div>

            {/* Profile */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Profil:</span>
              <span className={cn("text-lg font-semibold", getProfilColor(resultat.profil))}>
                {getProfilLabel(resultat.profil)}
              </span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Indice Glycolytique */}
            <div className="p-4 rounded-xl bg-secondary/40 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-accent" />
                <span className="text-xs text-muted-foreground uppercase">Indice Glycolytique</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono text-accent">{resultat.ig}</span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
              <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${resultat.ig}%` }}
                />
              </div>
            </div>

            {/* Confiance */}
            <div className="p-4 rounded-xl bg-secondary/40 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground uppercase">Confiance</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono text-success">{resultat.confiance}</span>
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-success rounded-full transition-all duration-500"
                  style={{ width: `${resultat.confiance}%` }}
                />
              </div>
            </div>

            {/* Delta 6 semaines */}
            <div className="p-4 rounded-xl bg-secondary/40 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase">Δ 6 semaines</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={cn(
                  "text-2xl font-bold font-mono",
                  resultat.delta_6sem > 0 ? "text-destructive" : resultat.delta_6sem < 0 ? "text-success" : "text-muted-foreground"
                )}>
                  {resultat.delta_6sem > 0 ? "+" : ""}{resultat.delta_6sem}
                </span>
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {resultat.delta_6sem < 0 ? "En baisse ✓" : resultat.delta_6sem > 0 ? "En hausse" : "Stable"}
              </p>
            </div>

            {/* Crossover */}
            <div className="p-4 rounded-xl bg-secondary/40 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-warning" />
                <span className="text-xs text-muted-foreground uppercase">Crossover</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono text-warning">{resultat.crossover || 70}</span>
                <span className="text-xs text-muted-foreground">% FTP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Extended Details */}
      <Button
        variant="ghost"
        className="w-full text-muted-foreground"
        onClick={() => setShowDetails(!showDetails)}
      >
        {showDetails ? "Masquer les détails" : "Afficher les détails métaboliques"}
      </Button>

      {showDetails && (
        <div className="space-y-4 animate-fade-in">
          {/* FatMax / CarboMax */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Droplets className="w-5 h-5 text-blue-400" />
                <span className="font-medium text-foreground">Zone FatMax</span>
              </div>
              <p className="text-3xl font-bold font-mono text-blue-400">{resultat.fatmax || 170}W</p>
              <p className="text-sm text-muted-foreground mt-1">
                Puissance d'oxydation lipidique maximale
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="font-medium text-foreground">Zone CarboMax</span>
              </div>
              <p className="text-3xl font-bold font-mono text-orange-400">{resultat.carbomax || 240}W</p>
              <p className="text-sm text-muted-foreground mt-1">
                Puissance de transition glucidique
              </p>
            </div>
          </div>

          {/* Recommendations */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">
                Recommandations {athlete?.objectif === "703" ? "70.3" : "Ironman"}
              </span>
            </div>
            <ul className="space-y-2">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Info Note */}
      <div className="flex items-start gap-2 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Cette estimation est basée sur vos données de puissance. Pour une mesure précise, 
          un test lactate en laboratoire est recommandé.
        </p>
      </div>
    </div>
  );
}
