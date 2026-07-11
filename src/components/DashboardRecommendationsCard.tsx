import { computePotentielEffectif, type PotentielPhysiologiqueEffectif } from "@/lib/potentielPhysiologiqueEffectif";
/**
 * Version compacte des recommandations Wahoo pour le Dashboard
 * Affiche les suggestions prioritaires avec un lien vers la bibliothèque complète
 */

import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sparkles,
  Zap,
  Clock,
  Heart,
  Activity,
  Target,
  TrendingUp,
  ChevronRight,
  Bike,
  PersonStanding,
  Flame,
  Footprints,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getConfidenceLabel, getConfidenceColorClass } from "@/lib/confidenceDisplay";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { useRunningFocusMode } from "@/hooks/useRunningFocusMode";
import { DbSnapshot } from "@/hooks/useCloudData";

import {
  suggestWahooWorkouts,
  SuggestionEngineContext,
  WahooSuggestion,
  needToTargetAxis,
  LowCRRJustification,
} from "@/lib/wahoo/wahooSuggestionEngine";
import { computeVLamaxEffectif, computeTTEEffectif } from "@/engines/diagnostic";
import { computeCAPInjuryRisk } from "@/lib/capInjuryRisk";
import { mapSnapshotToV2 } from "@/lib/mapSnapshotToV2";

const AXIS_CONFIG: Record<string, { icon: typeof Zap; color: string; label: string }> = {
  VLAMAX: { icon: Zap, color: "text-amber-500", label: "VLamax ↓" },
  TTE: { icon: Clock, color: "text-blue-500", label: "TTE ↑" },
  FTP: { icon: Zap, color: "text-orange-500", label: "FTP ↑" },
  VMA: { icon: Footprints, color: "text-green-500", label: "VMA ↑" },       // ✅ Running
  ECONOMY: { icon: Target, color: "text-teal-500", label: "Économie CAP" }, // ✅ Running
  ENDURANCE: { icon: Heart, color: "text-green-500", label: "Endurance" },
  FRESHNESS: { icon: Activity, color: "text-purple-500", label: "Récupération" },
  VO2: { icon: TrendingUp, color: "text-red-500", label: "VO₂max ↑" },
};

interface DashboardRecommendationsCardProps {
  onNavigateToLibrary?: () => void;
  maxSuggestions?: number;
}

export function DashboardRecommendationsCard({
  onNavigateToLibrary,
  maxSuggestions = 4,
}: DashboardRecommendationsCardProps) {
  const navigate = useNavigate();
  const { currentAthlete } = useAthletes();
  const { snapshots, tests, checkins, updateSnapshot } = useCloudDataContext();
  const { isRunningOnly, raceLabel } = useRunningFocusMode();

  // Get active snapshot
  const activeSnapshot = useMemo((): DbSnapshot | null => {
    if (!currentAthlete) return null;
    const athleteSnapshots = snapshots.filter((s) => s.athlete_id === currentAthlete.id);
    let snapshot = athleteSnapshots.find((s) => s.id === currentAthlete.active_snapshot_id);
    if (!snapshot && athleteSnapshots.length > 0) {
      snapshot = [...athleteSnapshots].sort((a, b) => b.date.localeCompare(a.date))[0];
    }
    return snapshot || null;
  }, [currentAthlete, snapshots]);

  // Local state for force development mode, synced with snapshot
  const [forceDevelopmentMode, setForceDevelopmentMode] = useState(
    activeSnapshot?.force_development_mode ?? false
  );

  // Sync local state when active snapshot changes (use useEffect, not useMemo)
  useEffect(() => {
    const persistedValue = activeSnapshot?.force_development_mode ?? false;
    setForceDevelopmentMode(persistedValue);
  }, [activeSnapshot?.id, activeSnapshot?.force_development_mode]);

  // Handler to update force development mode and persist to database
  const handleForceDevelopmentModeChange = async (checked: boolean) => {
    setForceDevelopmentMode(checked);
    
    if (activeSnapshot) {
      await updateSnapshot(activeSnapshot.id, { force_development_mode: checked });
    }
  };

  // Build recommendations
  const recommendations = useMemo(() => {
    if (!currentAthlete || !activeSnapshot) return null;

    const athleteId = currentAthlete.id;
    const objectif = currentAthlete.objectif || "IM";
    const athleteSnapshots = snapshots.filter((s) => s.athlete_id === athleteId);

    // Compute VLamax Effectif
    const vlamaxEffectif = computeVLamaxEffectif({
      athleteId,
      objectif,
      activeSnapshotId: activeSnapshot.id,
      tests: tests.map((t) => ({
        athlete_id: t.athlete_id,
        vlamax: t.vlamax,
        date: t.date,
        type: t.type,
        name: t.name,
      })),
      snapshots: athleteSnapshots.map(mapSnapshotToV2),
    });

    // Compute TTE Effectif
    const tteEffectif = computeTTEEffectif({
      ftp: activeSnapshot.ftp,
      tss_7d: activeSnapshot.tss_7d,
      tte_mode: activeSnapshot.tte_mode,
      tte_observed_min: activeSnapshot.tte_observed_min,
      tte_observed_min_run: (activeSnapshot as any).tte_observed_min_run ?? null,
      objectif,
    });

    // Compute Potentiel Physiologique
    const potentielPhysiologique = computePotentielEffectif({
      objectif,
      vlamaxEffectif,
      tteEffectif,
      ftp: activeSnapshot.ftp ?? null,
      poids: activeSnapshot.weight_kg ?? null,
      fatigue_ok: true,
      seance_specifique_validee: false,
    });

    // Determine sport focus
    let sportFocus: "run" | "bike" | "tri" = "bike";
    if (["Marathon", "Semi", "Trail", "TrailLong", "TrailCourt", "Ultra", "Course"].includes(objectif)) {
      sportFocus = "run";
    } else if (["IM", "Ironman", "703", "70.3", "Half", "Olympic", "Sprint"].includes(objectif)) {
      sportFocus = "tri";
    }

    // Compute injury risk for runners
    let injuryRiskRun = undefined;
    if (sportFocus === "run" || sportFocus === "tri") {
      const capRisk = computeCAPInjuryRisk({
        vlamaxValue: vlamaxEffectif.value,
        tteValue: tteEffectif.tte_min,
        objectif,
      });
      const levelMap: Record<number, "faible" | "modéré" | "élevé"> = {
        0: "faible",
        1: "faible",
        2: "modéré",
        3: "élevé",
      };
      injuryRiskRun = {
        level: levelMap[capRisk.level] || "faible",
        score: capRisk.totalScore,
      };
    }

    // Get recent fatigue from checkins
    const athleteCheckins = checkins
      .filter((c) => c.athlete_id === athleteId)
      .sort((a, b) => b.date_iso.localeCompare(a.date_iso));
    const recentCheckin = athleteCheckins[0];
    const fatigueScore = recentCheckin?.fatigue ?? undefined;

    // Compute FTP/kg
    const ftpKg = (activeSnapshot.ftp && activeSnapshot.weight_kg)
      ? activeSnapshot.ftp / activeSnapshot.weight_kg
      : null;

    // Get low CRR justification from snapshot
    const lowCRRJustification = activeSnapshot.low_crr_justification as LowCRRJustification | undefined;

    // Build context
    const context: SuggestionEngineContext = {
      objectif,
      sportFocus,
      vlamaxEffectif: {
        value: vlamaxEffectif.value,
        confidence: vlamaxEffectif.confidence,
        source: vlamaxEffectif.source,
      },
      tteEffectif: {
        value: tteEffectif.tte_min,
        confidence: tteEffectif.confidence,
        source: tteEffectif.source,
      },
      ftpKg,
      potentielPhysiologique: {
        score: potentielPhysiologique.score,
        details: potentielPhysiologique.details,
      },
      CRR: {
        value: activeSnapshot.tss_7d ?? null,
        confidence: activeSnapshot.tss_7d ? 0.8 : 0.3,
      },
      injuryRiskRun,
      fatigueScore,
      forceDevelopmentMode,
      lowCRRJustification,
    };

    return suggestWahooWorkouts(context);
  }, [currentAthlete, activeSnapshot, snapshots, tests, checkins, forceDevelopmentMode]);

  if (!currentAthlete || !recommendations) {
    return null;
  }

  // Get top suggestions from phase 1 (priority phase)
  const topSuggestions = recommendations.phasedSuggestions.phase1.slice(0, maxSuggestions);

  const primaryNeed = recommendations.needAnalysis.priorityOrder[0];
  const primaryAxis = primaryNeed ? needToTargetAxis(primaryNeed) : null;
  const axisConfig = primaryAxis ? AXIS_CONFIG[primaryAxis] : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Recommandations</span>
          </div>
          {primaryAxis && axisConfig && (
            <Badge variant="outline" className={cn("text-xs", axisConfig.color)}>
              Priorité : {axisConfig.label}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Force Development Mode Toggle */}
        <div className="flex items-center justify-between gap-3 p-2 rounded-md bg-muted/30 border border-dashed">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Flame className="h-4 w-4 text-orange-500 flex-shrink-0" />
            <Label htmlFor="force-dev-mode-dashboard" className="text-xs font-medium cursor-pointer truncate">
              Forcer développement
            </Label>
          </div>
          <Switch
            id="force-dev-mode-dashboard"
            checked={forceDevelopmentMode}
            onCheckedChange={handleForceDevelopmentModeChange}
            disabled={!activeSnapshot}
          />
        </div>

        {/* Running Profile Link - visible only in Running Focus Mode */}
        {isRunningOnly && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/running-profile")}
            className="w-full justify-between text-primary border-primary/30 hover:bg-primary/5"
          >
            <span className="flex items-center gap-2">
              <Footprints className="h-4 w-4" />
              Profil Running {raceLabel && `(${raceLabel})`}
            </span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {topSuggestions.length > 0 ? (
          <>
            <div className="space-y-2">
              {topSuggestions.map((suggestion) => (
                <SuggestionRow key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>

            {onNavigateToLibrary && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigateToLibrary}
                className="w-full justify-between text-muted-foreground hover:text-foreground"
              >
                <span>Voir toutes les recommandations</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune recommandation disponible. Complétez le profil de l'athlète.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SuggestionRow({ suggestion }: { suggestion: WahooSuggestion }) {
  const axisConfig = AXIS_CONFIG[suggestion.targetAxis];
  const Icon = axisConfig?.icon || Target;
  const colorClass = axisConfig?.color || "text-primary";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-3 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors cursor-default">
            <div className={cn("p-1.5 rounded-md bg-background", colorClass)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{suggestion.wahoo_name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Bike className="h-3 w-3" />
                <span>Priorité {suggestion.priority}</span>
              </div>
            </div>
            <Badge variant="outline" className={cn("text-[10px] shrink-0", getConfidenceColorClass(suggestion.confidence))}>
              {getConfidenceLabel(suggestion.confidence)}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <p className="text-sm">{suggestion.why}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
