import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Zap, TrendingUp, Info, Gauge, Flame, Target, AlertTriangle, Calendar, Database, PenLine, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricExplanationPopup } from "./MetricExplanationPopup";
import { VLamaxEffectif, getSourceColor, getSourceBgColor, getConfidenceLabel } from "@/lib/vlamaxEffectif";
import { TTEEffectif, getSourceColor as getTTESourceColor } from "@/lib/tteEffectif";
import { Badge } from "@/components/ui/badge";
import { estimerTTE } from "@/types/snapshotNolio";

interface SnapshotData {
  ftp: number | null;
  weight_kg: number | null;
  pmax_5s: number | null;
  tss_7d: number | null;
}

interface VLamaxCalculatorProps {
  // Données snapshot effectif (cloud)
  snapshotEffectif?: SnapshotData | null;
  // Valeurs unifiées
  vlamaxEffectif?: VLamaxEffectif;
  tteEffectif?: TTEEffectif;
  // Navigation
  onGoToSnapshots?: () => void;
}

type CalculatorMode = "snapshot" | "manual";

export function VLamaxCalculator({ 
  snapshotEffectif, 
  vlamaxEffectif, 
  tteEffectif,
  onGoToSnapshots 
}: VLamaxCalculatorProps) {
  
  const hasSnapshot = snapshotEffectif != null && (
    snapshotEffectif.ftp != null || 
    snapshotEffectif.weight_kg != null
  );

  const [mode, setMode] = useState<CalculatorMode>(hasSnapshot ? "snapshot" : "manual");
  
  // Inputs manuels (mode simulation)
  const [manualInputs, setManualInputs] = useState({
    ftp: 280,
    poids: 70,
    pmax5s: 1200,
    tss_7j: 450,
  });

  // Calcul manuel (mode simulation)
  const manualResult = useMemo(() => {
    const { ftp, poids, pmax5s, tss_7j } = manualInputs;
    
    if (poids <= 0) {
      return { vlamax: 0.45, tte: 55, ftp_kg: 0, confiance: 0.3 };
    }
    
    const G = pmax5s / poids;
    const O = ftp / poids;
    const tteVal = estimerTTE(ftp, tss_7j);
    const TTE = tteVal / 60;
    
    let indexGlyco = (0.45 * G) - (0.30 * O) - (0.25 * TTE);
    let vlamaxVal = 0.25 + (indexGlyco * 0.45);
    vlamaxVal = Math.max(0.25, Math.min(0.55, vlamaxVal));
    
    return {
      vlamax: vlamaxVal,
      tte: tteVal,
      ftp_kg: ftp / poids,
      confiance: 0.3 // Mode manuel = faible confiance
    };
  }, [manualInputs]);

  const handleInputChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setManualInputs((prev) => ({ ...prev, [field]: numValue }));
  };

  // Données affichées selon le mode
  const displayData = useMemo(() => {
    if (mode === "snapshot" && hasSnapshot && vlamaxEffectif && tteEffectif) {
      return {
        ftp: snapshotEffectif?.ftp ?? null,
        poids: snapshotEffectif?.weight_kg ?? null,
        pmax5s: snapshotEffectif?.pmax_5s ?? null,
        tss_7j: snapshotEffectif?.tss_7d ?? null,
        vlamax: vlamaxEffectif.value,
        vlamaxSource: vlamaxEffectif.source,
        vlamaxConfidence: vlamaxEffectif.confidence,
        vlamaxLabel: vlamaxEffectif.label,
        tte: tteEffectif.tte_min,
        tteSource: tteEffectif.source,
        tteConfidence: tteEffectif.confidence,
        ftp_kg: (snapshotEffectif?.ftp && snapshotEffectif?.weight_kg) 
          ? snapshotEffectif.ftp / snapshotEffectif.weight_kg 
          : null,
        isFromSnapshot: true
      };
    }
    
    return {
      ftp: manualInputs.ftp,
      poids: manualInputs.poids,
      pmax5s: manualInputs.pmax5s,
      tss_7j: manualInputs.tss_7j,
      vlamax: manualResult.vlamax,
      vlamaxSource: "manual" as const,
      vlamaxConfidence: manualResult.confiance,
      vlamaxLabel: "VLamax (simulation)",
      tte: manualResult.tte,
      tteSource: "manual" as const,
      tteConfidence: 0.3,
      ftp_kg: manualResult.ftp_kg,
      isFromSnapshot: false
    };
  }, [mode, hasSnapshot, snapshotEffectif, vlamaxEffectif, tteEffectif, manualInputs, manualResult]);

  // Valeurs manquantes
  const missingValues = useMemo(() => {
    if (mode !== "snapshot") return [];
    const missing: string[] = [];
    if (!snapshotEffectif?.ftp) missing.push("FTP");
    if (!snapshotEffectif?.weight_kg) missing.push("Poids");
    if (!snapshotEffectif?.pmax_5s) missing.push("Pmax 5s");
    if (!snapshotEffectif?.tss_7d) missing.push("TSS 7j");
    return missing;
  }, [mode, snapshotEffectif]);

  // Confidence color
  const getConfianceColor = (conf: number) => {
    if (conf >= 0.7) return "text-success";
    if (conf >= 0.4) return "text-warning";
    return "text-destructive";
  };

  const getConfianceBg = (conf: number) => {
    if (conf >= 0.7) return "bg-success/20 border-success/40";
    if (conf >= 0.4) return "bg-warning/20 border-warning/40";
    return "bg-destructive/20 border-destructive/40";
  };

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header avec toggle mode */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Estimation VLamax</h2>
            <p className="text-sm text-muted-foreground">
              {mode === "snapshot" ? "Données du snapshot effectif" : "Mode simulation (manuel)"}
            </p>
          </div>
        </div>
        
        {/* Toggle Mode */}
        <div className="flex gap-2">
          <Button
            variant={mode === "snapshot" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("snapshot")}
            disabled={!hasSnapshot}
            className="gap-2"
          >
            <Database className="w-4 h-4" />
            Snapshot
          </Button>
          <Button
            variant={mode === "manual" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("manual")}
            className="gap-2"
          >
            <PenLine className="w-4 h-4" />
            Manuel
          </Button>
        </div>
      </div>

      {/* Alerte si pas de snapshot */}
      {!hasSnapshot && mode === "snapshot" && (
        <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-foreground font-medium">Aucun snapshot disponible</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ajoutez un snapshot pour activer le mode Snapshot et utiliser vos données réelles.
            </p>
            {onGoToSnapshots && (
              <Button 
                variant="link" 
                size="sm" 
                onClick={onGoToSnapshots}
                className="p-0 h-auto mt-2 text-primary"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Aller aux Snapshots
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Badge simulation en mode manuel */}
      {mode === "manual" && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border flex items-center gap-2">
          <PenLine className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            <strong>Simulation</strong> — Ces valeurs ne sont pas sauvegardées et n'affectent pas les autres écrans.
          </span>
        </div>
      )}

      {/* Input Fields */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground">FTP (W)</Label>
          <Input
            type="number"
            value={displayData.ftp ?? ""}
            onChange={(e) => handleInputChange("ftp", e.target.value)}
            disabled={mode === "snapshot"}
            className={cn(
              "bg-secondary/50 border-border",
              mode === "snapshot" && "opacity-70"
            )}
            placeholder={mode === "snapshot" ? "—" : "280"}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Poids (kg)</Label>
          <Input
            type="number"
            value={displayData.poids ?? ""}
            onChange={(e) => handleInputChange("poids", e.target.value)}
            disabled={mode === "snapshot"}
            className={cn(
              "bg-secondary/50 border-border",
              mode === "snapshot" && "opacity-70"
            )}
            placeholder={mode === "snapshot" ? "—" : "70"}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Pmax 5s (W)</Label>
          <Input
            type="number"
            value={displayData.pmax5s ?? ""}
            onChange={(e) => handleInputChange("pmax5s", e.target.value)}
            disabled={mode === "snapshot"}
            className={cn(
              "bg-secondary/50 border-border",
              mode === "snapshot" && "opacity-70"
            )}
            placeholder={mode === "snapshot" ? "—" : "1200"}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">TSS 7j</Label>
          <Input
            type="number"
            value={displayData.tss_7j ?? ""}
            onChange={(e) => handleInputChange("tss_7j", e.target.value)}
            disabled={mode === "snapshot"}
            className={cn(
              "bg-secondary/50 border-border",
              mode === "snapshot" && "opacity-70"
            )}
            placeholder={mode === "snapshot" ? "—" : "450"}
          />
        </div>
      </div>

      {/* Valeurs manquantes */}
      {mode === "snapshot" && missingValues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {missingValues.map(v => (
            <Badge key={v} variant="outline" className="text-warning border-warning/50">
              {v} manquant
            </Badge>
          ))}
        </div>
      )}

      {/* Main Result */}
      <div className="p-6 rounded-xl bg-secondary/30 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              <span className="text-sm text-muted-foreground">VLamax</span>
              <MetricExplanationPopup metric="VLamax" />
              
              {/* Badge source */}
              {mode === "snapshot" && vlamaxEffectif && (
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", getSourceColor(vlamaxEffectif.source))}
                >
                  {vlamaxEffectif.source}
                </Badge>
              )}
              {mode === "manual" && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  simulation
                </Badge>
              )}
            </div>
            
            <div className="flex items-baseline gap-3">
              <span className={cn(
                "text-5xl font-bold font-mono",
                displayData.vlamax !== null && displayData.vlamax > 1.2 ? "text-destructive" : "text-primary"
              )}>
                {displayData.vlamax !== null ? displayData.vlamax.toFixed(2) : "—"}
              </span>
              <span className="text-muted-foreground">mmol/L/s</span>
            </div>

            {/* Warning valeurs atypiques */}
            {displayData.vlamax !== null && displayData.vlamax > 1.2 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                <span className="text-xs text-destructive">
                  Valeur atypique ({displayData.vlamax.toFixed(2)}) — vérifier le protocole et les données d'entrée.
                </span>
              </div>
            )}
            
            {displayData.vlamax !== null && (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="w-4 h-4" />
                  <span>
                    Confiance: {Math.round(displayData.vlamaxConfidence * 100)}% 
                    ({getConfidenceLabel(displayData.vlamaxConfidence)})
                  </span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    style={{ width: `${Math.min(100, ((displayData.vlamax - 0.2) / 0.5) * 100)}%` }}
                  />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-secondary/40 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-accent" />
                <span className="text-xs text-muted-foreground">TTE</span>
                <MetricExplanationPopup metric="TTE" />
              </div>
              <span className="text-2xl font-bold font-mono text-accent">
                {displayData.tte !== null ? Math.round(displayData.tte) : "—"}
              </span>
              <span className="text-xs text-muted-foreground ml-1">min</span>
              
              {mode === "snapshot" && tteEffectif && (
                <div className="mt-1">
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", getTTESourceColor(tteEffectif.source))}
                  >
                    {tteEffectif.source}
                  </Badge>
                </div>
              )}
            </div>
            
            <div className="p-4 rounded-xl bg-secondary/40 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-warning" />
                <span className="text-xs text-muted-foreground">W/kg</span>
              </div>
              <span className="text-2xl font-bold font-mono text-warning">
                {displayData.ftp_kg !== null ? displayData.ftp_kg.toFixed(1) : "—"}
              </span>
            </div>
            
            {/* Confidence globale */}
            <div className={cn("p-4 rounded-xl border col-span-2", getConfianceBg(displayData.vlamaxConfidence))}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span className="text-xs text-muted-foreground">Fiabilité données</span>
                </div>
                {mode === "snapshot" && (
                  <Badge variant="outline" className="text-xs">
                    source unique
                  </Badge>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-2xl font-bold font-mono", getConfianceColor(displayData.vlamaxConfidence))}>
                  {Math.round(displayData.vlamaxConfidence * 100)}%
                </span>
                <span className="text-xs text-muted-foreground">
                  {getConfidenceLabel(displayData.vlamaxConfidence)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info footer */}
      <div className="flex items-start gap-2 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          {mode === "snapshot" 
            ? "Ces valeurs proviennent de votre snapshot effectif et sont synchronisées avec le Dashboard, Race Readiness et Analyse Dan Lorang."
            : "Mode simulation : modifiez les valeurs pour explorer différents scénarios. Ces données ne sont pas sauvegardées."
          }
        </p>
      </div>
    </div>
  );
}
