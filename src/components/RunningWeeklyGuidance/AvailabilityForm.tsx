/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AVAILABILITY FORM — Disponibilité du jour (CAP)
 *
 * Formulaire manquant identifié en audit : la page Guidance CAP calculait le
 * Readiness et la décision hebdo à partir d'une disponibilité qu'aucun
 * contrôle ne permettait de corriger — le seul bouton présent ("Mettre à
 * jour disponibilité") pointait vers une route "/fatigue" inexistante.
 *
 * Valeur initiale = dérivée de fatigue_state (RunningGuidancePage). Ce
 * formulaire permet de la corriger pour LA séance/course du jour sans
 * toucher au snapshot ni au profil verrouillé.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Gauge } from "lucide-react";
import { type AvailabilityRun } from "@/lib/v2/potentielTypes";

interface AvailabilityFormProps {
  value: AvailabilityRun;
  onChange: (next: AvailabilityRun) => void;
  className?: string;
}

export function AvailabilityForm({ value, onChange, className }: AvailabilityFormProps) {
  const set = <K extends keyof AvailabilityRun>(key: K, v: AvailabilityRun[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          Disponibilité du jour
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RatingSlider
          label="Fatigue"
          value={value.fatigue_level}
          min={1}
          max={5}
          lowLabel="frais"
          highLabel="très fatigué"
          onChange={(v) => set("fatigue_level", v)}
        />
        <RatingSlider
          label="Sommeil"
          value={value.sleep_quality}
          min={1}
          max={5}
          lowLabel="mauvais"
          highLabel="excellent"
          onChange={(v) => set("sleep_quality", v)}
        />
        <RatingSlider
          label="Courbatures"
          value={value.muscle_soreness}
          min={0}
          max={10}
          lowLabel="aucune"
          highLabel="importantes"
          onChange={(v) => set("muscle_soreness", v)}
        />
        <RatingSlider
          label="Stress"
          value={value.mental_stress}
          min={1}
          max={5}
          lowLabel="calme"
          highLabel="très stressé"
          onChange={(v) => set("mental_stress", v)}
        />
        <RatingSlider
          label="Motivation"
          value={value.motivation}
          min={1}
          max={5}
          lowLabel="aucune envie"
          highLabel="très motivé"
          onChange={(v) => set("motivation", v)}
        />
        <div className="flex items-center justify-between pt-1">
          <Label htmlFor="pain-flag" className="text-sm font-medium text-foreground">
            Douleur signalée
          </Label>
          <Switch
            id="pain-flag"
            checked={value.pain_flag}
            onCheckedChange={(checked) => set("pain_flag", checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function RatingSlider({
  label,
  value,
  min,
  max,
  lowLabel,
  highLabel,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  lowLabel: string;
  highLabel: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={([v]) => onChange(v)}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
