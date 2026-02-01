/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RACE READINESS RUNNING FORM — TFCL Method™
 * 
 * Formulaire de questionnaire pour renseigner la disponibilité CAP
 * Permet de calculer le Race Readiness en temps réel
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Moon, 
  Battery, 
  Heart, 
  Brain, 
  Flame,
  AlertCircle,
  Save,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type AvailabilityRun } from "@/lib/v2/raceReadinessRunning";

interface RaceReadinessRunFormProps {
  onSubmit: (availability: AvailabilityRun) => void;
  initialValues?: Partial<AvailabilityRun>;
  className?: string;
}

const QUALITY_LABELS = ["", "Très mauvais", "Mauvais", "Moyen", "Bon", "Excellent"];
const FATIGUE_LABELS = ["", "Aucune", "Légère", "Modérée", "Élevée", "Extrême"];
const STRESS_LABELS = ["", "Aucun", "Léger", "Modéré", "Élevé", "Extrême"];
const MOTIVATION_LABELS = ["", "Très basse", "Basse", "Normale", "Haute", "Très haute"];
const SORENESS_LABELS = ["Aucune", "Légère", "Modérée", "Forte"];

export function RaceReadinessRunForm({
  onSubmit,
  initialValues,
  className,
}: RaceReadinessRunFormProps) {
  const [values, setValues] = useState<AvailabilityRun>({
    sleep_quality: initialValues?.sleep_quality ?? 3,
    fatigue_level: initialValues?.fatigue_level ?? 3,
    muscle_soreness: initialValues?.muscle_soreness ?? 0,
    pain_flag: initialValues?.pain_flag ?? false,
    pain_location: initialValues?.pain_location,
    mental_stress: initialValues?.mental_stress ?? 3,
    motivation: initialValues?.motivation ?? 3,
    hr_drift_flag: initialValues?.hr_drift_flag,
    recent_load_flag: initialValues?.recent_load_flag,
  });

  const handleChange = useCallback(<K extends keyof AvailabilityRun>(
    key: K,
    value: AvailabilityRun[K]
  ) => {
    setValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    onSubmit(values);
  }, [values, onSubmit]);

  const handleReset = useCallback(() => {
    setValues({
      sleep_quality: 3,
      fatigue_level: 3,
      muscle_soreness: 0,
      pain_flag: false,
      mental_stress: 3,
      motivation: 3,
    });
  }, []);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Heart className="w-4 h-4 text-primary" />
          Disponibilité du jour
        </CardTitle>
        <CardDescription className="text-xs">
          Renseigne comment tu te sens pour calculer ton Race Readiness
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* Sommeil */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm">
              <Moon className="w-4 h-4 text-blue-500" />
              Qualité du sommeil
            </Label>
            <span className="text-xs font-medium text-muted-foreground">
              {QUALITY_LABELS[values.sleep_quality]}
            </span>
          </div>
          <Slider
            value={[values.sleep_quality]}
            onValueChange={([v]) => handleChange("sleep_quality", v)}
            min={1}
            max={5}
            step={1}
            className="py-2"
          />
        </div>

        {/* Fatigue */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm">
              <Battery className="w-4 h-4 text-yellow-500" />
              Niveau de fatigue
            </Label>
            <span className="text-xs font-medium text-muted-foreground">
              {FATIGUE_LABELS[values.fatigue_level]}
            </span>
          </div>
          <Slider
            value={[values.fatigue_level]}
            onValueChange={([v]) => handleChange("fatigue_level", v)}
            min={1}
            max={5}
            step={1}
            className="py-2"
          />
        </div>

        {/* Stress mental */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm">
              <Brain className="w-4 h-4 text-purple-500" />
              Stress mental
            </Label>
            <span className="text-xs font-medium text-muted-foreground">
              {STRESS_LABELS[values.mental_stress]}
            </span>
          </div>
          <Slider
            value={[values.mental_stress]}
            onValueChange={([v]) => handleChange("mental_stress", v)}
            min={1}
            max={5}
            step={1}
            className="py-2"
          />
        </div>

        {/* Motivation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm">
              <Flame className="w-4 h-4 text-orange-500" />
              Motivation
            </Label>
            <span className="text-xs font-medium text-muted-foreground">
              {MOTIVATION_LABELS[values.motivation]}
            </span>
          </div>
          <Slider
            value={[values.motivation]}
            onValueChange={([v]) => handleChange("motivation", v)}
            min={1}
            max={5}
            step={1}
            className="py-2"
          />
        </div>

        {/* Courbatures */}
        <div className="space-y-2">
          <Label className="text-sm">Courbatures musculaires</Label>
          <div className="flex gap-2">
            {SORENESS_LABELS.map((label, idx) => (
              <Button
                key={idx}
                variant={values.muscle_soreness === idx ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => handleChange("muscle_soreness", idx)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Douleur */}
        <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-muted">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Douleur présente ?
            </Label>
            <Switch
              checked={values.pain_flag}
              onCheckedChange={(v) => handleChange("pain_flag", v)}
            />
          </div>
          
          {values.pain_flag && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Localisation de la douleur
              </Label>
              <Input
                placeholder="Ex: genou droit, mollet gauche..."
                value={values.pain_location || ""}
                onChange={(e) => handleChange("pain_location", e.target.value)}
                className="text-sm"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleReset}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={handleSubmit}
          >
            <Save className="w-4 h-4 mr-2" />
            Valider
          </Button>
        </div>
        
        <p className="text-[10px] text-muted-foreground text-center">
          Le Race Readiness est mis à jour automatiquement
        </p>
      </CardContent>
    </Card>
  );
}
