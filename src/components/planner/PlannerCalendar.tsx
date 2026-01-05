// Vue calendrier du plan d'entraînement

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrainingPlanDay, PHASE_CONFIGS, PhaseType } from '@/types/planner';
import { PhaseBadge } from './PhaseBadge';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Check, X, AlertTriangle, Bike, Footprints, Waves, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PlannerCalendarProps {
  trainingPlan: TrainingPlanDay[];
  raceDate?: Date;
  onSelectDay?: (day: TrainingPlanDay) => void;
}

export function PlannerCalendar({ trainingPlan, raceDate, onSelectDay }: PlannerCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<TrainingPlanDay | null>(null);

  // Créer un map date -> planDay pour lookup rapide
  const planByDate = useMemo(() => {
    const map = new Map<string, TrainingPlanDay>();
    trainingPlan.forEach((day) => {
      map.set(day.date, day);
    });
    return map;
  }, [trainingPlan]);

  // Générer les jours du calendrier
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const getSportIcon = (sport: string | undefined, className: string = 'h-3 w-3') => {
    switch (sport) {
      case 'bike': return <Bike className={className} />;
      case 'run': return <Footprints className={className} />;
      case 'swim': return <Waves className={className} />;
      default: return <Activity className={className} />;
    }
  };

  const handleDayClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const planDay = planByDate.get(dateStr);
    if (planDay) {
      setSelectedDay(planDay);
      onSelectDay?.(planDay);
    }
  };

  return (
    <>
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Calendrier d'entraînement</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Header jours */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Grille des jours */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const planDay = planByDate.get(dateStr);
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isToday = isSameDay(date, new Date());
              const isRaceDay = raceDate && isSameDay(date, raceDate);

              const phase = planDay?.phase;
              const phaseConfig = phase ? PHASE_CONFIGS[phase] : null;

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDayClick(date)}
                  disabled={!planDay}
                  className={cn(
                    'relative flex flex-col items-center justify-start p-1 min-h-[60px] rounded-md transition-colors',
                    isCurrentMonth ? 'bg-background' : 'bg-muted/30',
                    isToday && 'ring-2 ring-primary',
                    isRaceDay && 'ring-2 ring-red-500',
                    planDay && 'hover:bg-muted cursor-pointer',
                    !planDay && 'opacity-50 cursor-default'
                  )}
                >
                  {/* Date */}
                  <span
                    className={cn(
                      'text-xs font-medium',
                      !isCurrentMonth && 'text-muted-foreground',
                      isToday && 'text-primary',
                      isRaceDay && 'text-red-400'
                    )}
                  >
                    {format(date, 'd')}
                  </span>

                  {/* Indicateur de phase (barre de couleur) */}
                  {phaseConfig && (
                    <div
                      className={cn(
                        'absolute top-0 left-0 right-0 h-1 rounded-t-md',
                        phaseConfig.bgColor.replace('/20', '')
                      )}
                    />
                  )}

                  {/* Contenu du jour */}
                  {planDay && (
                    <div className="flex flex-col items-center gap-0.5 mt-1">
                      {/* Sport icon */}
                      <div className={cn(
                        'flex items-center justify-center w-5 h-5 rounded-full',
                        planDay.status === 'DONE' && 'bg-green-500/20 text-green-400',
                        planDay.status === 'SKIPPED' && 'bg-gray-500/20 text-gray-400',
                        planDay.status === 'PLANNED' && 'bg-primary/20 text-primary',
                        planDay.adjusted && 'bg-orange-500/20 text-orange-400'
                      )}>
                        {planDay.status === 'DONE' ? (
                          <Check className="h-3 w-3" />
                        ) : planDay.status === 'SKIPPED' ? (
                          <X className="h-3 w-3" />
                        ) : planDay.adjusted ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : (
                          getSportIcon(planDay.workout?.sport)
                        )}
                      </div>

                      {/* Type label */}
                      <span className="text-[9px] text-muted-foreground truncate max-w-full">
                        {planDay.workout?.type || planDay.custom_workout_title?.slice(0, 6) || ''}
                      </span>
                    </div>
                  )}

                  {/* Indicateur jour de course */}
                  {isRaceDay && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                      <span className="text-[8px] font-bold text-red-400">RACE</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Légende */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border/50">
            {(['PHASE1', 'PHASE2', 'PHASE3', 'PHASE4'] as PhaseType[]).map((phase) => (
              <div key={phase} className="flex items-center gap-1.5">
                <div className={cn('w-3 h-3 rounded', PHASE_CONFIGS[phase].bgColor.replace('/20', ''))} />
                <span className="text-xs text-muted-foreground">{PHASE_CONFIGS[phase].shortName}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal détail du jour */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDay && getSportIcon(selectedDay.workout?.sport, 'h-5 w-5')}
              {selectedDay?.workout?.title || selectedDay?.custom_workout_title || 'Séance'}
            </DialogTitle>
            <DialogDescription>
              {selectedDay && format(new Date(selectedDay.date), 'EEEE d MMMM yyyy', { locale: fr })}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDay && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {selectedDay.phase && <PhaseBadge phase={selectedDay.phase} />}
                <Badge
                  className={cn(
                    selectedDay.status === 'DONE' && 'bg-green-500/20 text-green-400',
                    selectedDay.status === 'SKIPPED' && 'bg-gray-500/20 text-gray-400',
                    selectedDay.status === 'PLANNED' && 'bg-blue-500/20 text-blue-400'
                  )}
                >
                  {selectedDay.status === 'DONE' ? 'Terminée' : 
                   selectedDay.status === 'SKIPPED' ? 'Sautée' : 'Planifiée'}
                </Badge>
                {selectedDay.adjusted && (
                  <Badge className="bg-orange-500/20 text-orange-400">Ajustée</Badge>
                )}
              </div>

              {selectedDay.adjusted && selectedDay.adjusted_reason && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/50">
                  <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">{selectedDay.adjusted_reason}</p>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                {selectedDay.workout?.description || selectedDay.custom_workout_description || 'Pas de description'}
              </p>

              {selectedDay.workout && (
                <div className="flex gap-2">
                  <Badge variant="outline">{selectedDay.workout.duration_min} min</Badge>
                  <Badge variant="outline">{selectedDay.workout.type}</Badge>
                  {selectedDay.workout.intensity_tag && (
                    <Badge variant="outline">{selectedDay.workout.intensity_tag}</Badge>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
