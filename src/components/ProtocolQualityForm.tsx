/**
 * Protocol Quality Input Form
 * Formulaire de saisie de la qualité du protocole de test
 */

import { useState } from "react";
import {
  Moon,
  Utensils,
  Battery,
  Radio,
  Cloud,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  type ProtocolQualityInput,
  type SleepQuality,
  type NutritionPreTest,
  type EnvironmentalConditions,
  computeProtocolQuality
} from "@/engines/diagnostic";
import { cn } from "@/lib/utils";

interface ProtocolQualityFormProps {
  onSubmit: (input: ProtocolQualityInput, score: number) => void;
  initialValues?: Partial<ProtocolQualityInput>;
  className?: string;
}

export function ProtocolQualityForm({
  onSubmit,
  initialValues,
  className
}: ProtocolQualityFormProps) {
  const [sleepQuality, setSleepQuality] = useState<SleepQuality>(
    initialValues?.sleepQuality ?? 'bon'
  );
  const [nutritionPreTest, setNutritionPreTest] = useState<NutritionPreTest>(
    initialValues?.nutritionPreTest ?? 'optimale'
  );
  const [perceivedFatigue, setPerceivedFatigue] = useState<number>(
    initialValues?.perceivedFatigue ?? 3
  );
  const [sensorsCalibrated, setSensorsCalibrated] = useState<boolean>(
    initialValues?.sensorsCalibrated ?? true
  );
  const [environmentalConditions, setEnvironmentalConditions] = useState<EnvironmentalConditions>(
    initialValues?.environmentalConditions ?? 'ok'
  );

  // Calculer le score en temps réel
  const currentInput: ProtocolQualityInput = {
    sleepQuality,
    nutritionPreTest,
    perceivedFatigue,
    sensorsCalibrated,
    environmentalConditions
  };
  const result = computeProtocolQuality(currentInput);

  const handleSubmit = () => {
    onSubmit(currentInput, result.score);
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.85) return 'text-green-500';
    if (score >= 0.70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getFatigueLabel = (value: number) => {
    if (value <= 3) return { label: 'Faible', color: 'text-green-500' };
    if (value <= 6) return { label: 'Modérée', color: 'text-yellow-500' };
    if (value <= 8) return { label: 'Élevée', color: 'text-orange-500' };
    return { label: 'Très élevée', color: 'text-red-500' };
  };

  const fatigueInfo = getFatigueLabel(perceivedFatigue);

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Qualité du Protocole</CardTitle>
          <Badge
            variant="outline"
            className={cn("text-sm font-bold", getScoreColor(result.score))}
          >
            {(result.score * 100).toFixed(0)}%
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Ces facteurs influencent la fiabilité des résultats du test
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Sommeil */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Moon className="w-4 h-4 text-blue-500" />
            Qualité du sommeil (nuit précédente)
          </Label>
          <RadioGroup
            value={sleepQuality}
            onValueChange={(v) => setSleepQuality(v as SleepQuality)}
            className="flex gap-3"
          >
            {[
              { value: 'bon', label: 'Bon (≥7h)', color: 'data-[state=checked]:border-green-500' },
              { value: 'moyen', label: 'Moyen (5-7h)', color: 'data-[state=checked]:border-yellow-500' },
              { value: 'mauvais', label: 'Mauvais (<5h)', color: 'data-[state=checked]:border-red-500' }
            ].map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={option.value}
                  id={`sleep-${option.value}`}
                  className={option.color}
                />
                <Label htmlFor={`sleep-${option.value}`} className="text-xs cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Nutrition */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Utensils className="w-4 h-4 text-orange-500" />
            Nutrition pré-test
          </Label>
          <RadioGroup
            value={nutritionPreTest}
            onValueChange={(v) => setNutritionPreTest(v as NutritionPreTest)}
            className="flex gap-3"
          >
            {[
              { value: 'optimale', label: 'Optimale', desc: 'Repas complet 2-3h avant' },
              { value: 'a_jeun', label: 'À jeun', desc: 'Test FatMax' },
              { value: 'insuffisante', label: 'Insuffisante', desc: 'Repas léger/tardif' }
            ].map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`nutrition-${option.value}`} />
                <Label htmlFor={`nutrition-${option.value}`} className="text-xs cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Fatigue perçue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm">
              <Battery className="w-4 h-4 text-purple-500" />
              Fatigue perçue
            </Label>
            <span className={cn("text-sm font-medium", fatigueInfo.color)}>
              {perceivedFatigue}/10 - {fatigueInfo.label}
            </span>
          </div>
          <Slider
            value={[perceivedFatigue]}
            onValueChange={([v]) => setPerceivedFatigue(v)}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Frais</span>
            <span>Fatigué</span>
          </div>
        </div>

        {/* Capteurs calibrés */}
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm">
            <Radio className="w-4 h-4 text-cyan-500" />
            Capteurs calibrés aujourd'hui
          </Label>
          <Switch
            checked={sensorsCalibrated}
            onCheckedChange={setSensorsCalibrated}
          />
        </div>

        {/* Conditions environnementales */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Cloud className="w-4 h-4 text-gray-500" />
            Conditions environnementales
          </Label>
          <RadioGroup
            value={environmentalConditions}
            onValueChange={(v) => setEnvironmentalConditions(v as EnvironmentalConditions)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ok" id="env-ok" />
              <Label htmlFor="env-ok" className="text-xs cursor-pointer">
                Standard (18-24°C, pas de vent)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="non_standard" id="env-non" />
              <Label htmlFor="env-non" className="text-xs cursor-pointer">
                Non standard
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Flags si présents */}
        {result.flags.length > 0 && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 space-y-1">
            {result.flags.map((flag, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-400">
                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                {flag}
              </div>
            ))}
          </div>
        )}

        {/* Submit */}
        <Button onClick={handleSubmit} className="w-full">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Valider la qualité du protocole
        </Button>
      </CardContent>
    </Card>
  );
}
