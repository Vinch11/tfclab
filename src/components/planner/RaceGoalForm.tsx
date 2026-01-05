// Formulaire de configuration de l'objectif de course

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RaceType, RACE_TYPE_LABELS } from '@/types/planner';
import { CalendarIcon, Target, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface RaceGoalFormProps {
  onSubmit: (raceDate: string, raceType: RaceType, raceName?: string, planStartDate?: string) => Promise<void>;
  isSubmitting?: boolean;
  existingGoal?: {
    race_date: string;
    race_type: RaceType;
    race_name: string | null;
    plan_start_date: string | null;
  };
}

export function RaceGoalForm({ onSubmit, isSubmitting, existingGoal }: RaceGoalFormProps) {
  const [raceDate, setRaceDate] = useState<Date | undefined>(
    existingGoal?.race_date ? new Date(existingGoal.race_date) : undefined
  );
  const [raceType, setRaceType] = useState<RaceType>(existingGoal?.race_type || 'marathon');
  const [raceName, setRaceName] = useState(existingGoal?.race_name || '');
  const [planStartDate, setPlanStartDate] = useState<Date | undefined>(
    existingGoal?.plan_start_date ? new Date(existingGoal.plan_start_date) : undefined
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!raceDate) return;

    await onSubmit(
      format(raceDate, 'yyyy-MM-dd'),
      raceType,
      raceName || undefined,
      planStartDate ? format(planStartDate, 'yyyy-MM-dd') : undefined
    );
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Objectif de course
        </CardTitle>
        <CardDescription>
          Définissez votre prochaine course pour générer un plan d'entraînement adapté
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Race Name */}
          <div className="space-y-2">
            <Label htmlFor="raceName">Nom de la course (optionnel)</Label>
            <Input
              id="raceName"
              value={raceName}
              onChange={(e) => setRaceName(e.target.value)}
              placeholder="Ex: Marathon de Paris, Ironman Nice..."
            />
          </div>

          {/* Race Type */}
          <div className="space-y-2">
            <Label>Type de course</Label>
            <Select value={raceType} onValueChange={(v) => setRaceType(v as RaceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RACE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Race Date */}
          <div className="space-y-2">
            <Label>Date de la course *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !raceDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {raceDate ? format(raceDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={raceDate}
                  onSelect={setRaceDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Plan Start Date */}
          <div className="space-y-2">
            <Label>Date de début du plan (optionnel)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !planStartDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {planStartDate ? format(planStartDate, 'PPP', { locale: fr }) : "Aujourd'hui par défaut"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={planStartDate}
                  onSelect={setPlanStartDate}
                  disabled={(date) => raceDate ? date > raceDate : false}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button
            type="submit"
            disabled={!raceDate || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              'Génération...'
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {existingGoal ? 'Mettre à jour le plan' : 'Générer le plan'}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
