// Badge de phase avec couleur

import { PhaseType, PHASE_CONFIGS } from '@/types/planner';
import { cn } from '@/lib/utils';

interface PhaseBadgeProps {
  phase: PhaseType;
  size?: 'sm' | 'md' | 'lg';
  showFocus?: boolean;
}

export function PhaseBadge({ phase, size = 'md', showFocus = false }: PhaseBadgeProps) {
  const config = PHASE_CONFIGS[phase];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <div className={cn('inline-flex flex-col items-start', showFocus && 'gap-0.5')}>
      <span
        className={cn(
          'inline-flex items-center rounded-full font-medium border',
          config.bgColor,
          config.borderColor,
          config.color,
          sizeClasses[size]
        )}
      >
        {config.shortName}
      </span>
      {showFocus && (
        <span className="text-xs text-muted-foreground">{config.focus}</span>
      )}
    </div>
  );
}
