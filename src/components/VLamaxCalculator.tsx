import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Zap, TrendingUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface VLamaxInputs {
  ftp: number;
  weight: number;
  vo2max: number;
  peakPower5s: number;
  lactateThreshold: number;
}

export function VLamaxCalculator() {
  const [inputs, setInputs] = useState<VLamaxInputs>({
    ftp: 280,
    weight: 70,
    vo2max: 65,
    peakPower5s: 1200,
    lactateThreshold: 4.0,
  });

  const [vlamax, setVlamax] = useState<number>(0.45);
  const [profile, setProfile] = useState<string>("Équilibré");

  useEffect(() => {
    // Simplified VLamax estimation formula based on power/weight metrics
    const ftpWkg = inputs.ftp / inputs.weight;
    const peakWkg = inputs.peakPower5s / inputs.weight;
    
    // Ratio between anaerobic and aerobic capacity
    const anaerobicRatio = peakWkg / ftpWkg;
    
    // Estimate VLamax (simplified model)
    const estimatedVlamax = 0.15 + (anaerobicRatio - 2.5) * 0.15;
    const clampedVlamax = Math.max(0.2, Math.min(0.9, estimatedVlamax));
    
    setVlamax(parseFloat(clampedVlamax.toFixed(2)));
    
    // Determine athlete profile
    if (clampedVlamax < 0.35) {
      setProfile("Diesel - Très Endurant");
    } else if (clampedVlamax < 0.45) {
      setProfile("Endurant");
    } else if (clampedVlamax < 0.55) {
      setProfile("Équilibré");
    } else if (clampedVlamax < 0.65) {
      setProfile("Explosif");
    } else {
      setProfile("Sprinter - Très Explosif");
    }
  }, [inputs]);

  const handleInputChange = (field: keyof VLamaxInputs, value: string) => {
    const numValue = parseFloat(value) || 0;
    setInputs((prev) => ({ ...prev, [field]: numValue }));
  };

  const getVlamaxColor = () => {
    if (vlamax < 0.35) return "text-primary";
    if (vlamax < 0.55) return "text-success";
    return "text-accent";
  };

  const getVlamaxBarWidth = () => {
    return `${((vlamax - 0.2) / 0.7) * 100}%`;
  };

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
          <Label htmlFor="weight" className="text-muted-foreground">Poids (kg)</Label>
          <Input
            id="weight"
            type="number"
            value={inputs.weight}
            onChange={(e) => handleInputChange("weight", e.target.value)}
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
          <Label htmlFor="peakPower" className="text-muted-foreground">Pic de Puissance 5s (W)</Label>
          <Input
            id="peakPower"
            type="number"
            value={inputs.peakPower5s}
            onChange={(e) => handleInputChange("peakPower5s", e.target.value)}
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

      {/* Result Display */}
      <div className="mt-8 p-6 rounded-xl bg-secondary/30 border border-border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              <span className="text-sm text-muted-foreground uppercase tracking-wider">VLamax Estimé</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-5xl font-bold font-mono", getVlamaxColor())}>
                {vlamax.toFixed(2)}
              </span>
              <span className="text-muted-foreground">mmol/L/s</span>
            </div>
          </div>
          
          <div className="flex-1 max-w-md">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Profil Athlète</span>
            </div>
            <div className="text-lg font-medium text-foreground mb-3">{profile}</div>
            
            {/* VLamax Bar */}
            <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all duration-500 bg-gradient-to-r from-primary via-success to-accent"
                style={{ width: getVlamaxBarWidth() }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>Endurant</span>
              <span>Explosif</span>
            </div>
          </div>
        </div>
      </div>

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
