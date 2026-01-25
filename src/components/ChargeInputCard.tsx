/**
 * ChargeInputCard – Saisie rapide de la charge d'entraînement (TSS 7j)
 * Permet de mettre à jour le TSS hebdomadaire de l'athlète
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Activity, 
  TrendingUp, 
  CheckCircle2, 
  Edit2,
  AlertTriangle,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface ChargeInputCardProps {
  athleteId: string;
  athleteName: string;
  currentTss7d: number | null;
  targetTss?: number;
  objectif?: string;
  onSave: (tss7d: number) => Promise<void>;
  compact?: boolean;
}

// Références TSS par objectif
const TSS_REFERENCES: Record<string, { low: number; moderate: number; high: number; max: number }> = {
  "IM": { low: 400, moderate: 550, high: 700, max: 900 },
  "703": { low: 300, moderate: 450, high: 550, max: 700 },
  "Marathon": { low: 350, moderate: 450, high: 600, max: 750 },
  "Semi": { low: 250, moderate: 350, high: 450, max: 550 },
};

function getTssLevel(tss: number, objectif: string): { label: string; color: string; description: string } {
  const ref = TSS_REFERENCES[objectif] || TSS_REFERENCES["703"];
  
  if (tss < ref.low) {
    return { label: "Faible", color: "text-blue-600", description: "Charge légère - récupération ou décharge" };
  }
  if (tss < ref.moderate) {
    return { label: "Modérée", color: "text-green-600", description: "Charge normale - maintien" };
  }
  if (tss < ref.high) {
    return { label: "Élevée", color: "text-amber-600", description: "Charge importante - développement" };
  }
  if (tss < ref.max) {
    return { label: "Très élevée", color: "text-orange-600", description: "Charge lourde - pic de charge" };
  }
  return { label: "Critique", color: "text-red-600", description: "Surcharge - risque de surentraînement" };
}

export function ChargeInputCard({ 
  athleteId, 
  athleteName, 
  currentTss7d, 
  targetTss = 450,
  objectif = "703",
  onSave,
  compact = false
}: ChargeInputCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<number>(currentTss7d ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync value when currentTss7d changes
  useEffect(() => {
    if (currentTss7d !== null && !isEditing) {
      setValue(currentTss7d);
    }
  }, [currentTss7d, isEditing]);

  const ref = TSS_REFERENCES[objectif] || TSS_REFERENCES["703"];
  const tssLevel = getTssLevel(value, objectif);
  const percentage = Math.min(100, Math.round((value / ref.max) * 100));

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await onSave(value);
      toast({
        title: "Charge enregistrée",
        description: `TSS 7j: ${value} pour ${athleteName}`,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving charge:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la charge",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mode lecture
  if (!isEditing && currentTss7d !== null) {
    const level = getTssLevel(currentTss7d, objectif);
    
    if (compact) {
      return (
        <Card className="border-border/50">
          <CardContent className="px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">TSS 7j</span>
                <span className={cn("font-bold font-mono", level.color)}>
                  {currentTss7d}
                </span>
                <Badge variant="outline" className={cn("text-[10px]", level.color)}>
                  {level.label}
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setValue(currentTss7d);
                  setIsEditing(true);
                }}
                className="h-7 w-7 p-0"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Charge d'entraînement
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setValue(currentTss7d);
                setIsEditing(true);
              }}
              className="h-7 px-2"
            >
              <Edit2 className="h-3 w-3 mr-1" />
              Modifier
            </Button>
          </CardTitle>
          <CardDescription className="text-xs">TSS des 7 derniers jours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={cn("text-3xl font-bold font-mono", level.color)}>
                {currentTss7d}
              </span>
              <div>
                <Badge className={cn("mb-1", level.color === "text-red-600" ? "bg-red-100" : "bg-muted")} variant="outline">
                  {level.label}
                </Badge>
                <p className="text-xs text-muted-foreground">{level.description}</p>
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0</span>
              <span>Cible: {targetTss}</span>
              <span>Max: {ref.max}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  value < ref.moderate ? "bg-green-500" :
                  value < ref.high ? "bg-amber-500" :
                  value < ref.max ? "bg-orange-500" : "bg-red-500"
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mode édition
  return (
    <Card className={cn(isEditing && "ring-2 ring-primary")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          {currentTss7d === null ? "Saisir la charge" : "Modifier la charge"}
        </CardTitle>
        <CardDescription className="text-xs">TSS des 7 derniers jours</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input numérique */}
        <div className="space-y-2">
          <Label className="text-xs">TSS hebdomadaire</Label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-24 font-mono"
              min={0}
              max={1500}
            />
            <div className="flex-1">
              <Slider
                value={[value]}
                onValueChange={([v]) => setValue(v)}
                min={0}
                max={ref.max + 200}
                step={10}
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2">
            {value > ref.max && <AlertTriangle className="h-4 w-4 text-red-500" />}
            <span className={cn("font-bold font-mono text-lg", tssLevel.color)}>
              {value} TSS
            </span>
          </div>
          <Badge variant="outline" className={cn("text-xs", tssLevel.color)}>
            {tssLevel.label}
          </Badge>
        </div>

        {/* Contexte */}
        <p className="text-xs text-muted-foreground">
          {tssLevel.description}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          {isEditing && (
            <Button 
              variant="outline" 
              onClick={() => {
                setValue(currentTss7d ?? 0);
                setIsEditing(false);
              }}
              className="flex-1"
            >
              Annuler
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "..." : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ChargeInputCard;
