import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Zap, TrendingUp, Info, Gauge, Flame, Target, AlertTriangle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Athlete, getDernierSnapshot } from "@/types/athlete";
import { estimerTTE, scoreConfiance, calculerAgeSnapshot, calculerPrecision } from "@/types/snapshotNolio";
import { calculVLamaxSnapshot, calculVLamaxAvecConfiance } from "@/lib/athleteStore";
import { MetricExplanationPopup } from "./MetricExplanationPopup";

interface VLamaxCalculatorProps {
  athlete?: Athlete;
}

export function VLamaxCalculator({ athlete }: VLamaxCalculatorProps) {
  const snapshot = athlete ? getDernierSnapshot(athlete) : null;
  
  const [inputs, setInputs] = useState({
    ftp: snapshot?.ftp || 280,
    poids: snapshot?.poids || 70,
    pmax5s: snapshot?.pmax_5s || 1200,
    tss_7j: snapshot?.tss_7j || 450,
  });

  const [vlamax, setVlamax] = useState(0.45);
  const [tte, setTte] = useState(55);
  const [confiance, setConfiance] = useState(60);
  const [precision, setPrecision] = useState(14);
  const [ageSnapshot, setAgeSnapshot] = useState(0);

  useEffect(() => {
    if (snapshot) {
      setInputs({
        ftp: snapshot.ftp || 280,
        poids: snapshot.poids || 70,
        pmax5s: snapshot.pmax_5s || 1200,
        tss_7j: snapshot.tss_7j || 450,
      });
      
      // Use new confidence calculation with age penalty
      const result = calculVLamaxAvecConfiance(snapshot, athlete?.objectif || "IM");
      setVlamax(result.vlamax);
      setConfiance(result.confiance);
      setPrecision(result.precision);
      setAgeSnapshot(result.ageSnapshot);
      setTte(estimerTTE(snapshot.ftp || 0, snapshot.tss_7j || 0));
    }
  }, [snapshot, athlete]);

  useEffect(() => {
    if (!snapshot) {
      // Calculate VLamax manually when no snapshot
      const G = inputs.pmax5s / inputs.poids;
      const O = inputs.ftp / inputs.poids;
      const tteVal = estimerTTE(inputs.ftp, inputs.tss_7j);
      const TTE = tteVal / 60;
      
      let indexGlyco = (0.45 * G) - (0.30 * O) - (0.25 * TTE);
      let vlamaxVal = 0.25 + (indexGlyco * 0.45);
      vlamaxVal = Math.max(0.25, Math.min(0.55, vlamaxVal));
      
      setVlamax(vlamaxVal);
      setTte(tteVal);
      setConfiance(60);
      setPrecision(14);
      setAgeSnapshot(0);
    }
  }, [inputs, snapshot]);

  const handleInputChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setInputs((prev) => ({ ...prev, [field]: numValue }));
  };

  const ftp_kg = inputs.ftp / inputs.poids;
  
  // Determine confidence color
  const getConfianceColor = () => {
    if (confiance >= 80) return "text-success";
    if (confiance >= 60) return "text-warning";
    return "text-destructive";
  };

  const getConfianceBg = () => {
    if (confiance >= 80) return "bg-success/20 border-success/40";
    if (confiance >= 60) return "bg-warning/20 border-warning/40";
    return "bg-destructive/20 border-destructive/40";
  };

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-primary/10 text-primary">
          <Calculator className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Estimation VLamax</h2>
          <p className="text-sm text-muted-foreground">Basé sur données NOLIO</p>
        </div>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground">FTP (W)</Label>
          <Input
            type="number"
            value={inputs.ftp}
            onChange={(e) => handleInputChange("ftp", e.target.value)}
            className="bg-secondary/50 border-border"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Poids (kg)</Label>
          <Input
            type="number"
            value={inputs.poids}
            onChange={(e) => handleInputChange("poids", e.target.value)}
            className="bg-secondary/50 border-border"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Pmax 5s (W)</Label>
          <Input
            type="number"
            value={inputs.pmax5s}
            onChange={(e) => handleInputChange("pmax5s", e.target.value)}
            className="bg-secondary/50 border-border"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">TSS 7j</Label>
          <Input
            type="number"
            value={inputs.tss_7j}
            onChange={(e) => handleInputChange("tss_7j", e.target.value)}
            className="bg-secondary/50 border-border"
          />
        </div>
      </div>

      {/* Main Result */}
      <div className="p-6 rounded-xl bg-secondary/30 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              <span className="text-sm text-muted-foreground">VLamax Estimé</span>
              <MetricExplanationPopup metric="VLamax" />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-bold font-mono text-primary">
                {vlamax.toFixed(2)}
              </span>
              <span className="text-muted-foreground">mmol/L/s</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4" />
              <span>±{precision}% de précision</span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                style={{ width: `${Math.min(100, ((vlamax - 0.2) / 0.5) * 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-secondary/40 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-accent" />
                <span className="text-xs text-muted-foreground">TTE Estimé</span>
                <MetricExplanationPopup metric="TTE" />
              </div>
              <span className="text-2xl font-bold font-mono text-accent">{tte}</span>
              <span className="text-xs text-muted-foreground ml-1">min</span>
            </div>
            <div className="p-4 rounded-xl bg-secondary/40 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-warning" />
                <span className="text-xs text-muted-foreground">W/kg</span>
              </div>
              <span className="text-2xl font-bold font-mono text-warning">{ftp_kg.toFixed(1)}</span>
            </div>
            
            {/* Confidence with precision */}
            <div className={cn("p-4 rounded-xl border col-span-2", getConfianceBg())}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span className="text-xs text-muted-foreground">Confiance données</span>
                </div>
                {ageSnapshot > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{ageSnapshot}j</span>
                  </div>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-2xl font-bold font-mono", getConfianceColor())}>
                  {confiance}%
                </span>
                <span className="text-xs text-muted-foreground">
                  (±{precision}% erreur)
                </span>
              </div>
              {ageSnapshot > 7 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Données anciennes de {Math.floor(ageSnapshot / 7)} semaine{ageSnapshot >= 14 ? 's' : ''} - pénalité appliquée
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Estimation basée sur vos données NOLIO. La confiance diminue de 1% par semaine depuis le dernier snapshot.
        </p>
      </div>
    </div>
  );
}
