// Composant Check-in Life-First

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Heart, Brain, Moon, AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LifeFirstCheckinProps {
  onSubmit: (stressScore: number, sleepQuality?: number, energyLevel?: number, notes?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function LifeFirstCheckin({ onSubmit, isSubmitting }: LifeFirstCheckinProps) {
  const [stressScore, setStressScore] = useState(5);
  const [sleepQuality, setSleepQuality] = useState(7);
  const [energyLevel, setEnergyLevel] = useState(7);
  const [notes, setNotes] = useState('');
  const [showExtended, setShowExtended] = useState(false);

  const handleSubmit = async () => {
    await onSubmit(stressScore, sleepQuality, energyLevel, notes || undefined);
  };

  const getStressColor = (score: number) => {
    if (score <= 3) return 'text-green-400';
    if (score <= 5) return 'text-yellow-400';
    if (score <= 7) return 'text-orange-400';
    return 'text-red-400';
  };

  const getStressLabel = (score: number) => {
    if (score <= 2) return 'Très détendu';
    if (score <= 4) return 'Correct';
    if (score <= 6) return 'Modéré';
    if (score <= 8) return 'Élevé';
    return 'Très élevé';
  };

  const isHighStress = stressScore > 7;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart className="h-5 w-5 text-pink-400" />
          Check-in Life-First
        </CardTitle>
        <CardDescription>
          Comment te sens-tu aujourd'hui ? (inspiré de principes d'entraînement endurance)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stress Score - Principal */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Brain className="h-4 w-4 text-purple-400" />
              Niveau de stress / fatigue
            </label>
            <span className={cn('text-2xl font-bold', getStressColor(stressScore))}>
              {stressScore}/10
            </span>
          </div>
          <Slider
            value={[stressScore]}
            onValueChange={([val]) => setStressScore(val)}
            min={1}
            max={10}
            step={1}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Frais</span>
            <span className={getStressColor(stressScore)}>{getStressLabel(stressScore)}</span>
            <span>Épuisé</span>
          </div>
        </div>

        {/* Alerte stress élevé */}
        {isHighStress && (
          <div className="flex items-start gap-3 rounded-lg border border-orange-500/50 bg-orange-500/10 p-3">
            <AlertTriangle className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-orange-400">Niveau de stress élevé détecté</p>
              <p className="text-muted-foreground mt-1">
                Principe Life-First : on ne construit pas la performance sur un corps stressé. 
                La séance du jour sera adaptée en récupération active.
              </p>
            </div>
          </div>
        )}

        {/* Toggle pour plus d'options */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowExtended(!showExtended)}
          className="w-full text-muted-foreground"
        >
          {showExtended ? 'Moins de détails' : 'Plus de détails (optionnel)'}
        </Button>

        {showExtended && (
          <div className="space-y-4 pt-2">
            {/* Sleep Quality */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Moon className="h-4 w-4 text-blue-400" />
                  Qualité du sommeil
                </label>
                <span className="text-lg font-semibold">{sleepQuality}/10</span>
              </div>
              <Slider
                value={[sleepQuality]}
                onValueChange={([val]) => setSleepQuality(val)}
                min={1}
                max={10}
                step={1}
              />
            </div>

            {/* Energy Level */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Heart className="h-4 w-4 text-green-400" />
                  Niveau d'énergie
                </label>
                <span className="text-lg font-semibold">{energyLevel}/10</span>
              </div>
              <Slider
                value={[energyLevel]}
                onValueChange={([val]) => setEnergyLevel(val)}
                min={1}
                max={10}
                step={1}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optionnel)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Douleurs, sensations, contexte..."
                className="min-h-[80px]"
              />
            </div>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            'Enregistrement...'
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Valider le check-in
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
