// Compte à rebours jusqu'à la course

import { differenceInDays } from 'date-fns';
import { Target, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RaceCountdownProps {
  raceDate: Date;
  raceName?: string;
  className?: string;
}

export function RaceCountdown({ raceDate, raceName, className }: RaceCountdownProps) {
  const daysUntilRace = differenceInDays(raceDate, new Date());
  const weeksUntilRace = Math.floor(daysUntilRace / 7);
  const remainingDays = daysUntilRace % 7;

  const isPast = daysUntilRace < 0;
  const isToday = daysUntilRace === 0;
  const isClose = daysUntilRace <= 14 && daysUntilRace > 0;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-4',
        isPast && 'border-gray-500/50 bg-gray-500/10',
        isToday && 'border-red-500/50 bg-red-500/20 animate-pulse',
        isClose && !isToday && 'border-purple-500/50 bg-purple-500/10',
        !isPast && !isToday && !isClose && 'border-primary/50 bg-primary/10',
        className
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full',
          isPast && 'bg-gray-500/20',
          isToday && 'bg-red-500/30',
          isClose && !isToday && 'bg-purple-500/20',
          !isPast && !isToday && !isClose && 'bg-primary/20'
        )}
      >
        <Target
          className={cn(
            'h-6 w-6',
            isPast && 'text-gray-400',
            isToday && 'text-red-400',
            isClose && !isToday && 'text-purple-400',
            !isPast && !isToday && !isClose && 'text-primary'
          )}
        />
      </div>

      <div className="flex-1">
        {raceName && (
          <p className="text-sm font-medium text-foreground">{raceName}</p>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">
            {raceDate.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      <div className="text-right">
        {isPast ? (
          <div className="text-gray-400">
            <span className="text-2xl font-bold">Passée</span>
          </div>
        ) : isToday ? (
          <div className="text-red-400">
            <span className="text-2xl font-bold">JOUR J</span>
            <p className="text-xs">C'est maintenant !</p>
          </div>
        ) : (
          <div className={cn(isClose ? 'text-purple-400' : 'text-primary')}>
            <span className="text-3xl font-bold">J-{daysUntilRace}</span>
            <p className="text-xs text-muted-foreground">
              {weeksUntilRace > 0 && `${weeksUntilRace} sem`}
              {weeksUntilRace > 0 && remainingDays > 0 && ' '}
              {remainingDays > 0 && `${remainingDays}j`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
