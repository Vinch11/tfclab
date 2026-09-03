/**
 * NextRaceIndicator - Affiche la prochaine course avec compte à rebours
 * Compact pour le header du dashboard
 * Auto-refresh quotidien pour garder J-X et semaines à jour
 */

import { useMemo, useState, useEffect } from "react";
import { differenceInDays, differenceInWeeks, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, Target, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getObjectifLabel, ObjectifType } from "@/types/athlete";

interface RaceGoal {
  id: string;
  race_type: string;
  race_name: string | null;
  race_date: string;
}

interface NextRaceIndicatorProps {
  raceGoals: RaceGoal[];
  currentGoal: string | null;
  className?: string;
  compact?: boolean;
  onClick?: () => void;
}

export function NextRaceIndicator({
  raceGoals,
  currentGoal,
  className,
  compact = false,
  onClick,
}: NextRaceIndicatorProps) {
  // Force re-render every hour to keep countdown fresh.
  // Audit fiabilité UI (retour terrain coach : badge "figé" plusieurs jours) —
  // un setInterval seul ne suffit pas : un onglet laissé en arrière-plan
  // pendant plusieurs jours se fait throttle/suspendre par le navigateur,
  // l'intervalle horaire peut ne jamais refirer tant que l'onglet n'est pas
  // réactivé. Recalcul immédiat au retour au premier plan (visibilitychange)
  // pour rattraper le retard sans attendre la prochaine heure pleine.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") setTick(t => t + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Trouver la prochaine course (future, triée par date)
  const nextRace = useMemo(() => {
    const now = new Date();
    const futureRaces = raceGoals
      .filter(g => new Date(g.race_date) >= now)
      .sort((a, b) => new Date(a.race_date).getTime() - new Date(b.race_date).getTime());
    return futureRaces[0] || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceGoals, tick]);

  const countdown = useMemo(() => {
    if (!nextRace) return null;
    const raceDate = parseISO(nextRace.race_date);
    const now = new Date();
    const days = differenceInDays(raceDate, now);
    const weeks = differenceInWeeks(raceDate, now);
    return { days, weeks };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextRace, tick]);

  // Couleur selon l'urgence
  const urgencyColor = useMemo(() => {
    if (!countdown) return "text-muted-foreground";
    if (countdown.days <= 7) return "text-red-500";
    if (countdown.days <= 30) return "text-amber-500";
    if (countdown.days <= 60) return "text-blue-500";
    return "text-emerald-500";
  }, [countdown]);

  const urgencyBg = useMemo(() => {
    if (!countdown) return "bg-muted/50";
    if (countdown.days <= 7) return "bg-red-500/10 border-red-500/30";
    if (countdown.days <= 30) return "bg-amber-500/10 border-amber-500/30";
    if (countdown.days <= 60) return "bg-blue-500/10 border-blue-500/30";
    return "bg-emerald-500/10 border-emerald-500/30";
  }, [countdown]);

  const countdownLabel = countdown
    ? countdown.weeks > 0
      ? `J-${countdown.days} • ${countdown.weeks} sem.`
      : `J-${countdown.days}`
    : null;

  // Si pas de course planifiée mais un objectif actuel
  if (!nextRace && currentGoal) {
    if (compact) {
      return (
        <Badge variant="outline" className={cn("text-xs gap-1", className)}>
          <Target className="h-3 w-3" />
          {getObjectifLabel(currentGoal as ObjectifType)}
        </Badge>
      );
    }
    return null;
  }

  if (!nextRace) return null;

  const raceName = nextRace.race_name || getObjectifLabel(nextRace.race_type as ObjectifType);
  const raceDate = format(parseISO(nextRace.race_date), "d MMM yyyy", { locale: fr });

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "flex items-center gap-1.5 transition-opacity hover:opacity-80 cursor-pointer",
          className
        )}
        title="Voir les détails de l'objectif"
      >
        <Badge variant="outline" className={cn("text-xs gap-1 border", urgencyBg)}>
          <Timer className={cn("h-3 w-3", urgencyColor)} />
          <span className={cn("font-semibold", urgencyColor)}>{countdownLabel}</span>
        </Badge>
        <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={raceName}>
          {raceName}
        </span>
      </button>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg border",
      urgencyBg,
      className
    )}>
      <div className="flex items-center gap-2">
        <CalendarDays className={cn("h-4 w-4", urgencyColor)} />
        <div className="flex flex-col">
          <span className="text-sm font-medium truncate max-w-[150px]" title={raceName}>
            {raceName}
          </span>
          <span className="text-xs text-muted-foreground">{raceDate}</span>
        </div>
      </div>
      <Badge className={cn("ml-auto", urgencyBg, "border-0")}>
        <Timer className={cn("h-3 w-3 mr-1", urgencyColor)} />
        <span className={cn("font-bold", urgencyColor)}>{countdownLabel}</span>
      </Badge>
    </div>
  );
}
