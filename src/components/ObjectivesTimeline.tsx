/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OBJECTIVES TIMELINE — Timeline visuelle des objectifs de course
 * Two For Coaching Lab™
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo } from "react";
import { format, formatDistanceToNow, isPast, isFuture, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Target, 
  Trophy, 
  Calendar, 
  Clock, 
  ChevronRight,
  Flag,
  CheckCircle2,
  Circle,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getObjectifLabel } from "@/types/athlete";
import type { RaceGoal } from "@/hooks/useAthleteRaceGoals";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ObjectivesTimelineProps {
  raceGoals: RaceGoal[];
  currentGoal: string | null;
  onRestoreGoal?: (goal: RaceGoal) => void;
  onDeleteGoal?: (goalId: string) => void;
  compact?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const OBJECTIF_ICONS: Record<string, string> = {
  IM: "🏊",
  "703": "🏊",
  Marathon: "🏃",
  Semi: "🏃",
  "10K": "🏃",
  "5K": "🏃",
  TrailShort: "⛰️",
  TrailMountain: "⛰️",
  TrailUltra: "⛰️",
};

const getGoalStatus = (raceDate: string): "past" | "upcoming" | "soon" => {
  const date = new Date(raceDate);
  const daysUntil = differenceInDays(date, new Date());
  
  if (isPast(date)) return "past";
  if (daysUntil <= 30) return "soon";
  return "upcoming";
};

const getStatusColor = (status: "past" | "upcoming" | "soon") => {
  switch (status) {
    case "past": return "text-muted-foreground";
    case "soon": return "text-warning";
    case "upcoming": return "text-primary";
  }
};

const getStatusBadge = (status: "past" | "upcoming" | "soon") => {
  switch (status) {
    case "past": return { label: "Passée", variant: "secondary" as const };
    case "soon": return { label: "Bientôt", variant: "warning" as const };
    case "upcoming": return { label: "À venir", variant: "default" as const };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ObjectivesTimeline({
  raceGoals,
  currentGoal,
  onRestoreGoal,
  onDeleteGoal,
  compact = false,
  className,
}: ObjectivesTimelineProps) {
  // Sort goals by date (most recent first for past, closest first for future)
  const sortedGoals = useMemo(() => {
    return [...raceGoals].sort((a, b) => {
      const dateA = new Date(a.race_date);
      const dateB = new Date(b.race_date);
      // Future goals: closest first
      // Past goals: most recent first
      return dateB.getTime() - dateA.getTime();
    });
  }, [raceGoals]);

  const { upcomingGoals, pastGoals } = useMemo(() => {
    const now = new Date();
    return {
      upcomingGoals: sortedGoals.filter(g => new Date(g.race_date) >= now),
      pastGoals: sortedGoals.filter(g => new Date(g.race_date) < now),
    };
  }, [sortedGoals]);

  if (raceGoals.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <Target className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Aucun objectif enregistré</p>
        <p className="text-xs mt-1">Change d'objectif pour créer un historique</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        {sortedGoals.slice(0, 3).map((goal) => {
          const status = getGoalStatus(goal.race_date);
          const isCurrent = goal.race_type === currentGoal;
          
          return (
            <div
              key={goal.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg border transition-colors",
                isCurrent ? "border-primary/50 bg-primary/5" : "border-border bg-secondary/20",
              )}
            >
              <span className="text-lg">{OBJECTIF_ICONS[goal.race_type] || "🎯"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {goal.race_name || getObjectifLabel(goal.race_type as any)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(goal.race_date), "d MMM yyyy", { locale: fr })}
                </p>
              </div>
              {isCurrent && (
                <Badge variant="default" className="text-[10px] h-5">Actif</Badge>
              )}
            </div>
          );
        })}
        {sortedGoals.length > 3 && (
          <p className="text-xs text-muted-foreground text-center">
            +{sortedGoals.length - 3} autres objectifs
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Upcoming Goals */}
      {upcomingGoals.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Flag className="w-4 h-4" />
            Objectifs à venir ({upcomingGoals.length})
          </h4>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-8 bottom-4 w-0.5 bg-gradient-to-b from-primary to-primary/20" />
            
            <div className="space-y-4">
              {upcomingGoals.map((goal, index) => {
                const status = getGoalStatus(goal.race_date);
                const statusBadge = getStatusBadge(status);
                const isCurrent = goal.race_type === currentGoal;
                const daysUntil = differenceInDays(new Date(goal.race_date), new Date());
                
                return (
                  <div key={goal.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className={cn(
                      "absolute left-2 top-4 w-4 h-4 rounded-full border-2 flex items-center justify-center",
                      isCurrent 
                        ? "bg-primary border-primary" 
                        : status === "soon" 
                          ? "bg-warning border-warning"
                          : "bg-background border-primary"
                    )}>
                      {isCurrent && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    
                    <div className={cn(
                      "p-4 rounded-xl border transition-all",
                      isCurrent 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-border bg-secondary/20 hover:border-primary/30"
                    )}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{OBJECTIF_ICONS[goal.race_type] || "🎯"}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-semibold">
                                {goal.race_name || getObjectifLabel(goal.race_type as any)}
                              </h5>
                              {isCurrent && (
                                <Badge variant="default" className="text-xs">Actif</Badge>
                              )}
                              {status === "soon" && !isCurrent && (
                                <Badge variant="outline" className="text-xs text-warning border-warning">
                                  J-{daysUntil}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {getObjectifLabel(goal.race_type as any)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right shrink-0">
                          <p className="font-medium">
                            {format(new Date(goal.race_date), "d MMMM yyyy", { locale: fr })}
                          </p>
                          <p className={cn("text-sm", getStatusColor(status))}>
                            {formatDistanceToNow(new Date(goal.race_date), { 
                              locale: fr, 
                              addSuffix: true 
                            })}
                          </p>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      {(!isCurrent || onDeleteGoal) && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                          {!isCurrent && onRestoreGoal && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => onRestoreGoal(goal)}
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Définir comme actif
                            </Button>
                          )}
                          {onDeleteGoal && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 text-destructive hover:text-destructive"
                              onClick={() => onDeleteGoal(goal.id)}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Supprimer
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Past Goals */}
      {pastGoals.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Objectifs passés ({pastGoals.length})
          </h4>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-8 bottom-4 w-0.5 bg-muted" />
            
            <div className="space-y-3">
              {pastGoals.map((goal) => {
                const isCurrent = goal.race_type === currentGoal;
                
                return (
                  <div key={goal.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className="absolute left-2 top-3 w-4 h-4 rounded-full border-2 bg-background border-muted flex items-center justify-center">
                      <Circle className="w-2 h-2 text-muted-foreground" />
                    </div>
                    
                    <div className="p-3 rounded-lg border border-border/50 bg-secondary/10">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg opacity-60">{OBJECTIF_ICONS[goal.race_type] || "🎯"}</span>
                          <div>
                            <p className="font-medium text-sm text-muted-foreground">
                              {goal.race_name || getObjectifLabel(goal.race_type as any)}
                            </p>
                            <p className="text-xs text-muted-foreground/70">
                              {format(new Date(goal.race_date), "d MMM yyyy", { locale: fr })}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {onRestoreGoal && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-6 px-2"
                              onClick={() => onRestoreGoal(goal)}
                            >
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                          )}
                          {onDeleteGoal && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-6 px-2 text-destructive/70 hover:text-destructive"
                              onClick={() => onDeleteGoal(goal.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
