// Carte de la séance du jour

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrainingPlanDay, PHASE_CONFIGS } from '@/types/planner';
import { PhaseBadge } from './PhaseBadge';
import { 
  Dumbbell, 
  Clock, 
  Check, 
  X, 
  AlertTriangle,
  Bike,
  Footprints,
  Waves,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TodayWorkoutCardProps {
  planDay: TrainingPlanDay | null;
  onMarkDone: (id: string) => void;
  onMarkSkipped: (id: string) => void;
  isLoading?: boolean;
}

export function TodayWorkoutCard({ planDay, onMarkDone, onMarkSkipped, isLoading }: TodayWorkoutCardProps) {
  if (!planDay) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="py-8 text-center">
          <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">Aucune séance prévue aujourd'hui</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Configurez un objectif de course pour générer votre plan
          </p>
        </CardContent>
      </Card>
    );
  }

  const workout = planDay.workout;
  const isAdjusted = planDay.adjusted;
  const isDone = planDay.status === 'DONE';
  const isSkipped = planDay.status === 'SKIPPED';
  const title = planDay.custom_workout_title || workout?.title || 'Séance';
  const description = planDay.custom_workout_description || workout?.description;
  const duration = workout?.duration_min || 45;
  const sport = workout?.sport || 'general';

  const getSportIcon = (sport: string) => {
    switch (sport) {
      case 'bike': return <Bike className="h-5 w-5" />;
      case 'run': return <Footprints className="h-5 w-5" />;
      case 'swim': return <Waves className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const getStatusBadge = () => {
    if (isDone) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Terminée</Badge>;
    }
    if (isSkipped) {
      return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50">Sautée</Badge>;
    }
    return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Planifiée</Badge>;
  };

  return (
    <Card className={cn(
      'border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden',
      isAdjusted && 'border-orange-500/50',
      isDone && 'border-green-500/30',
      isSkipped && 'border-gray-500/30 opacity-75'
    )}>
      {/* Barre de phase colorée */}
      {planDay.phase && (
        <div className={cn('h-1', PHASE_CONFIGS[planDay.phase].bgColor.replace('/20', ''))} />
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              isDone ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-primary'
            )}>
              {isDone ? <Check className="h-5 w-5" /> : getSportIcon(sport)}
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {planDay.phase && <PhaseBadge phase={planDay.phase} size="sm" />}
                {getStatusBadge()}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">{duration} min</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Alerte Life-First si ajustée */}
        {isAdjusted && (
          <div className="flex items-start gap-3 rounded-lg border border-orange-500/50 bg-orange-500/10 p-3">
            <AlertTriangle className="h-5 w-5 text-orange-400 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-orange-400">Séance adaptée – Life-First</p>
              <p className="text-muted-foreground">{planDay.adjusted_reason}</p>
            </div>
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}

        {/* Tags */}
        {workout && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              {workout.type}
            </Badge>
            {workout.intensity_tag && (
              <Badge variant="outline" className="text-xs">
                {workout.intensity_tag}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        {planDay.status === 'PLANNED' && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => onMarkDone(planDay.id)}
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Terminer
            </Button>
            <Button
              variant="outline"
              onClick={() => onMarkSkipped(planDay.id)}
              disabled={isLoading}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Sauter
            </Button>
          </div>
        )}

        {/* Notes */}
        {planDay.notes && (
          <p className="text-xs text-muted-foreground italic border-t border-border/50 pt-2">
            Note: {planDay.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
