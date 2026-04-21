/**
 * Sprint Time Converter
 * Convertit un temps sur 100m ou 150m en distance équivalente parcourue en 15 secondes
 * (méthode officielle pour estimer VLamax CAP).
 *
 * Formule: distance_15s ≈ (distance / temps) × 15 × correction
 * - 100m: correction 0.96 (durée proche de 15s, faible décélération)
 * - 150m: correction 0.94 (durée plus longue, décélération plus marquée)
 */

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, Calculator, Info } from "lucide-react";

interface SprintTimeConverterProps {
  /** Callback appelé quand l'utilisateur applique la conversion */
  onApply: (distance15s: number, source: "100m" | "150m") => void;
}

const CORRECTION_100M = 0.96;
const CORRECTION_150M = 0.94;

function computeDistance15s(
  distanceMeters: number,
  timeSeconds: number,
  correction: number
): number | null {
  if (!Number.isFinite(distanceMeters) || !Number.isFinite(timeSeconds)) return null;
  if (distanceMeters <= 0 || timeSeconds <= 0) return null;
  const speed = distanceMeters / timeSeconds; // m/s
  const distance15s = speed * 15 * correction;
  return Math.round(distance15s * 10) / 10;
}

export function SprintTimeConverter({ onApply }: SprintTimeConverterProps) {
  const [time100m, setTime100m] = useState("");
  const [time150m, setTime150m] = useState("");

  const result100m = useMemo(() => {
    const t = parseFloat(time100m);
    return computeDistance15s(100, t, CORRECTION_100M);
  }, [time100m]);

  const result150m = useMemo(() => {
    const t = parseFloat(time150m);
    return computeDistance15s(150, t, CORRECTION_150M);
  }, [time150m]);

  return (
    <div className="space-y-3 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-primary" />
        <Label className="text-sm font-medium">Convertisseur sprint chronométré</Label>
        <Badge variant="outline" className="text-xs">Estimation</Badge>
      </div>

      <Alert className="bg-background/60 border-border">
        <Info className="h-3.5 w-3.5" />
        <AlertDescription className="text-xs">
          Pas de mètre-ruban ? Chronomètre un sprint maximal sur 100m ou 150m. La distance
          équivalente en 15s sera estimée automatiquement (confiance réduite ~15%).
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="100m" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="100m" className="text-xs">Sprint 100m</TabsTrigger>
          <TabsTrigger value="150m" className="text-xs">Sprint 150m</TabsTrigger>
        </TabsList>

        <TabsContent value="100m" className="mt-2 space-y-2">
          <div>
            <Label className="text-xs text-muted-foreground">Temps sur 100m</Label>
            <div className="flex gap-1 items-center mt-1">
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 14.5"
                value={time100m}
                onChange={(e) => setTime100m(e.target.value)}
                className="h-9"
              />
              <span className="text-xs text-muted-foreground w-8">sec</span>
            </div>
          </div>

          {result100m !== null && result100m > 0 && (
            <div className="flex items-center justify-between gap-2 p-2 rounded bg-background/80 border border-border">
              <div className="flex items-center gap-2 text-sm">
                <ArrowRight className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">Distance 15s ≈</span>
                <span className="font-bold text-primary">{result100m} m</span>
              </div>
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs"
                onClick={() => onApply(result100m, "100m")}
              >
                Appliquer
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="150m" className="mt-2 space-y-2">
          <div>
            <Label className="text-xs text-muted-foreground">Temps sur 150m</Label>
            <div className="flex gap-1 items-center mt-1">
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 22.0"
                value={time150m}
                onChange={(e) => setTime150m(e.target.value)}
                className="h-9"
              />
              <span className="text-xs text-muted-foreground w-8">sec</span>
            </div>
          </div>

          {result150m !== null && result150m > 0 && (
            <div className="flex items-center justify-between gap-2 p-2 rounded bg-background/80 border border-border">
              <div className="flex items-center gap-2 text-sm">
                <ArrowRight className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">Distance 15s ≈</span>
                <span className="font-bold text-primary">{result150m} m</span>
              </div>
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs"
                onClick={() => onApply(result150m, "150m")}
              >
                Appliquer
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <p className="text-[10px] text-muted-foreground italic">
        Formule : (distance / temps) × 15 × correction décélération (0.96 pour 100m, 0.94 pour 150m)
      </p>
    </div>
  );
}
