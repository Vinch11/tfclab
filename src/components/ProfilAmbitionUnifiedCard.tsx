/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROFIL & AMBITION UNIFIED CARD — Phase 1f UX
 * Consolidation de:
 * - AthleteRefsPanel (Profil & Données)
 * - AthleteObjectiveManager (Objectif & Historique)
 * - AmbitionProgressChart (Évolution vers les cibles)
 * 
 * 3 onglets: Profil | Objectif | Progression
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedTabsContent } from "@/components/ui/animated-tabs-content";
import { cn } from "@/lib/utils";
import { LazyTabsContent } from "@/components/ui/lazy-tabs-content";
import { SwipeableTabsContent } from "@/components/ui/swipeable-tabs";
import { User, Target, TrendingUp, CalendarIcon } from "lucide-react";

import { AthleteRefsPanel } from "./AthleteRefsPanel";
import { AthleteObjectiveManager } from "./AthleteObjectiveManager";
import { AmbitionProgressChart } from "./charts";

import type { DbAthlete, DbSnapshot } from "@/hooks/useCloudData";
import type { ObjectifType } from "@/types/athlete";
import { getObjectifLabel } from "@/types/athlete";
import { getAmbitionDefinition, DEFAULT_AMBITION, type AmbitionLevel } from "@/types/ambitionLevel";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RaceGoal {
  id: string;
  athlete_id: string;
  coach_id: string;
  race_type: string;
  race_name: string | null;
  race_date: string;
  race_format: 'continuous' | 'lcw_3day' | null;
  plan_start_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfilAmbitionUnifiedCardProps {
  // Athlete & data
  athlete: DbAthlete;
  snapshots: DbSnapshot[];
  effectiveCloudSnapshot?: {
    ftp?: number | null;
    weight_kg?: number | null;
    vlamax?: number | null;
    vlamax_run?: number | null;
    tte_observed_min?: number | null;
    vo2max?: number | null;
    pmax_5s?: number | null;
    p30s_w?: number | null;
    vma?: number | null;
    css?: number | null;
    fc_max?: number | null;
  } | null;
  
  // Objective management
  raceGoals: RaceGoal[];
  onGoalChange: (goal: ObjectifType) => Promise<void>;
  onAddRaceGoal: (goal: Omit<RaceGoal, 'id' | 'coach_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onDeleteRaceGoal: (goalId: string) => Promise<boolean | void>;
  onRestoreRaceGoal: (goal: RaceGoal) => Promise<boolean | void>;
  onUpdateRaceGoalDate?: (goalId: string, newDate: string) => Promise<void>;
  raceGoalsLoading?: boolean;
  
  // Ambition
  ambition?: AmbitionLevel;
  weightKg?: number | null;
  
  // Navigation callbacks
  onNavigateToProfile?: () => void;
  onNavigateToCAPTest?: () => void;
  onNavigateToTFCLTest?: () => void;
  onUpdate?: () => void;
  
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function ProfilAmbitionUnifiedCard({
  athlete,
  snapshots,
  effectiveCloudSnapshot,
  raceGoals,
  onGoalChange,
  onAddRaceGoal,
  onDeleteRaceGoal,
  onRestoreRaceGoal,
  onUpdateRaceGoalDate,
  raceGoalsLoading = false,
  ambition = DEFAULT_AMBITION,
  weightKg,
  onNavigateToProfile,
  onNavigateToCAPTest,
  onNavigateToTFCLTest,
  onUpdate,
  className,
}: ProfilAmbitionUnifiedCardProps) {
  const [activeTab, setActiveTab] = useState("profil");
  const ambDef = getAmbitionDefinition(ambition);
  
  // Next race countdown
  const nextRace = useMemo(() => {
    const now = new Date();
    const futureRaces = raceGoals
      .filter(g => new Date(g.race_date) >= now)
      .sort((a, b) => new Date(a.race_date).getTime() - new Date(b.race_date).getTime());
    return futureRaces[0] || null;
  }, [raceGoals]);
  
  const daysRemaining = useMemo(() => {
    if (!nextRace) return null;
    const diff = Math.ceil((new Date(nextRace.race_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : null;
  }, [nextRace]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header synthétique */}
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <span>Profil & Ambition</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Données • Objectif • Progression
            </p>
          </div>
          
          {/* Summary badges */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <Badge variant="outline" className={cn("text-[10px] gap-1", ambDef.color)}>
              <span>{ambDef.icon}</span>
              {ambDef.label}
            </Badge>
            {athlete.goal && (
              <Badge variant="outline" className="text-[10px]">
                {getObjectifLabel(athlete.goal as ObjectifType)}
              </Badge>
            )}
            {daysRemaining !== null && nextRace && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] gap-1",
                  daysRemaining <= 7 ? "border-red-500 text-red-600" :
                  daysRemaining <= 30 ? "border-amber-500 text-amber-600" :
                  "border-emerald-500 text-emerald-600"
                )}
              >
                <CalendarIcon className="h-3 w-3" />
                J-{daysRemaining}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4 pt-2">
            <TabsTrigger value="profil" className="text-xs sm:text-sm gap-1.5 min-h-[44px]">
              <User className="h-3.5 w-3.5" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="objectif" className="text-xs sm:text-sm gap-1.5 min-h-[44px]">
              <Target className="h-3.5 w-3.5" />
              Objectif
            </TabsTrigger>
            <TabsTrigger value="progression" className="text-xs sm:text-sm gap-1.5 min-h-[44px]">
              <TrendingUp className="h-3.5 w-3.5" />
              Progression
            </TabsTrigger>
          </TabsList>

          <SwipeableTabsContent tabs={["profil", "objectif", "progression"]} activeTab={activeTab} onTabChange={setActiveTab}>

          {/* Profil Tab — default, always mounted */}
          <AnimatedTabsContent value="profil" activeValue={activeTab} className="px-4 pb-4 mt-0">
            <AthleteRefsPanel
              athlete={athlete}
              snapshots={snapshots}
              snapshot={effectiveCloudSnapshot}
              athleteGoal={athlete.goal || "IM"}
              onNavigateToProfile={onNavigateToProfile}
              onNavigateToCAPTest={onNavigateToCAPTest}
              onNavigateToTFCLTest={onNavigateToTFCLTest}
              onUpdate={onUpdate}
              compact
            />
          </AnimatedTabsContent>

          {/* Objectif Tab — deferred */}
          <LazyTabsContent value="objectif" activeValue={activeTab} className="px-4 pb-4 mt-0">
            <AthleteObjectiveManager
              athleteId={athlete.id}
              currentGoal={athlete.goal}
              raceGoals={raceGoals}
              onGoalChange={onGoalChange}
              onAddRaceGoal={onAddRaceGoal}
              onDeleteRaceGoal={onDeleteRaceGoal}
              onRestoreRaceGoal={onRestoreRaceGoal}
              onUpdateRaceGoalDate={onUpdateRaceGoalDate}
              loading={raceGoalsLoading}
              compact
              className="border-0 shadow-none"
            />
          </LazyTabsContent>

          {/* Progression Tab — deferred (heavy chart) */}
          <LazyTabsContent value="progression" activeValue={activeTab} showLoader className="px-4 pb-4 mt-0">
            <AmbitionProgressChart
              snapshots={snapshots.filter(s => s.athlete_id === athlete.id)}
              objectif={athlete.goal || "IM"}
              ambition={ambition}
              weightKg={weightKg}
              className="border-0 shadow-none"
            />
          </LazyTabsContent>
          </SwipeableTabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default ProfilAmbitionUnifiedCard;
