import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, User, Trophy } from "lucide-react";

import { RaceReadinessCard } from "@/components/RaceReadinessCard";
import { AthleteReadinessReport } from "@/components/AthleteReadinessReport";
import { StaffReport } from "@/components/StaffReport";
import { NutritionPredictive } from "@/components/NutritionPredictive";
import { NutritionTimingCard } from "@/components/NutritionTimingCard";
import { RunningEconomyModule } from "@/components/RunningEconomyModule";
import { generateAthleteReadiness } from "@/lib/athleteReadiness";
import { 
  AgeAdjustmentInfo, 
  AgeRiskAlert, 
  VLamaxAgeInterpretation, 
  TTEAgeTarget 
} from "@/components/AgeAdjustmentInfo";
import { TargetSyncVerifier } from "@/components/TargetSyncVerifier";
import { type LorangStrategyInput } from "@/lib/v2/lorangStrategyEngine";

import type { VLamaxEffectif } from "@/lib/vlamaxEffectif";
import type { TTEEffectif } from "@/lib/tteEffectif";
import type { RaceReadinessEffectif } from "@/lib/raceReadinessEffectif";
import type { NutritionEstimate } from "@/lib/nutritionPredictive";
import type { RunningEconomyResult } from "@/lib/runningEconomy";
import type { EnergyDriftResult } from "@/lib/energyDrift";

interface RaceReadinessPageProps {
  athleteName: string;
  objectif: string;
  snapshotDate: string | null;
  birthDate?: string | null;
  legacyAthlete: any;
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  readiness: RaceReadinessEffectif;
  nutritionEstimate: NutritionEstimate;
  runningEconomy: RunningEconomyResult;
  energyDrift: EnergyDriftResult;
  ftp: number;
  poids: number | null;
  fcMax: number | null;
  tss7d?: number | null;
  snapshotUpdatedAt?: string | null;
  athleteAge?: number | null;
  ambition?: import("@/types/ambitionLevel").AmbitionLevel;
  onGoToSnapshots: () => void;
  onGoToMethodology: () => void;
}

export function RaceReadinessPage({
  athleteName,
  objectif,
  snapshotDate,
  birthDate,
  legacyAthlete,
  vlamaxEffectif,
  tteEffectif,
  readiness,
  nutritionEstimate,
  runningEconomy,
  energyDrift,
  ftp,
  poids,
  fcMax,
  tss7d,
  snapshotUpdatedAt,
  athleteAge,
  ambition,
  onGoToSnapshots,
  onGoToMethodology,
}: RaceReadinessPageProps) {
  const [isCoachMode, setIsCoachMode] = useState(true);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header avec toggle */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  Race Readiness
                  <AgeAdjustmentInfo birthDate={birthDate} variant="badge" />
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {athleteName} — {objectif}
                </p>
              </div>
            </div>

            {/* Toggle Coach / Athlète */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-background/80 border border-border">
              <div className="flex items-center gap-2">
                <User className={`w-4 h-4 ${!isCoachMode ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${!isCoachMode ? "text-foreground" : "text-muted-foreground"}`}>
                  Athlète
                </span>
              </div>
              
              <Switch
                checked={isCoachMode}
                onCheckedChange={setIsCoachMode}
                className="data-[state=checked]:bg-primary"
              />
              
              <div className="flex items-center gap-2">
                <Users className={`w-4 h-4 ${isCoachMode ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${isCoachMode ? "text-foreground" : "text-muted-foreground"}`}>
                  Coach
                </span>
              </div>

              <Badge variant={isCoachMode ? "default" : "secondary"} className="ml-2">
                {isCoachMode ? "Mode Expert" : "Mode Simple"}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Contenu selon le mode */}
      {isCoachMode ? (
        <>
          {/* Alerte âge si pertinent */}
          <AgeRiskAlert birthDate={birthDate} raceReadinessScore={readiness.score} />

          {/* Vue Coach - Complète */}
          <RaceReadinessCard
            athlete={legacyAthlete}
            vlamaxEffectif={vlamaxEffectif}
            tteEffectif={tteEffectif}
            readiness={readiness}
            energyDrift={energyDrift}
            athleteAge={athleteAge} // ✅ AJOUT pour badge d'ajustement âge
            onGoToSnapshots={onGoToSnapshots}
            onGoToMethodology={onGoToMethodology}
          />

          {/* ✅ Test visuel de synchronisation des cibles (Staff Mode) */}
          {isCoachMode && athleteAge !== null && (
            <TargetSyncVerifier
              objectif={objectif}
              athleteAge={athleteAge}
              ambition={ambition}
            />
          )}

          {/* Interprétations ajustées par âge */}
          {birthDate && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <VLamaxAgeInterpretation birthDate={birthDate} vlamax={vlamaxEffectif.value} />
              <TTEAgeTarget birthDate={birthDate} objectif={objectif} currentTTE={tteEffectif.tte_min} />
            </div>
          )}

          {/* Nutrition Timing */}
          <NutritionTimingCard
            vlamax={vlamaxEffectif.value}
            tteMin={tteEffectif.tte_min}
            tteTarget={tteEffectif.target ?? 45}
            objectif={objectif}
            sport={objectif.toLowerCase().includes("marathon") || 
                   objectif.toLowerCase().includes("semi") || 
                   objectif.toLowerCase().includes("trail") ? "cap" : "velo"}
            energyDrift={energyDrift}
          />

          {/* Nutrition Prédictive */}
          <NutritionPredictive
            vlamax={vlamaxEffectif.value}
            objectif={objectif}
            tteMin={tteEffectif.tte_min}
            tteTarget={tteEffectif.target}
            confidence={vlamaxEffectif.confidence}
            staffMode={true}
            energyDrift={energyDrift}
          />

          {/* Économie de Course */}
          <RunningEconomyModule
            fcMax={fcMax}
            tteMin={tteEffectif.tte_min}
            objectif={objectif}
            vlamax={vlamaxEffectif.value}
            staffMode={true}
          />

          {/* Rapport Staff Pré-Course */}
          {snapshotDate && (
            <StaffReportWithLorang
              athleteName={athleteName}
              objectif={objectif}
              snapshotDate={snapshotDate}
              vlamaxEffectif={vlamaxEffectif}
              tteEffectif={tteEffectif}
              readiness={readiness}
              nutritionEstimate={nutritionEstimate}
              runningEconomy={runningEconomy}
              ftp={ftp}
              poids={poids}
              fcMax={fcMax}
              tss7d={tss7d}
              snapshotUpdatedAt={snapshotUpdatedAt}
              athleteAge={athleteAge}
              ambition={ambition}
            />
          )}
        </>
      ) : (
        <>
          {/* Vue Athlète - Simplifiée */}
          <AthleteReadinessReport
            report={generateAthleteReadiness(readiness, objectif, runningEconomy)}
            athleteName={athleteName}
            objectif={objectif}
          />
        </>
      )}
    </div>
  );
}

// Composant wrapper pour générer lorangInput et le passer au StaffReport
function StaffReportWithLorang({
  athleteName,
  objectif,
  snapshotDate,
  vlamaxEffectif,
  tteEffectif,
  readiness,
  nutritionEstimate,
  runningEconomy,
  ftp,
  poids,
  fcMax,
  tss7d,
  snapshotUpdatedAt,
  athleteAge,
  ambition,
}: {
  athleteName: string;
  objectif: string;
  snapshotDate: string;
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  readiness: RaceReadinessEffectif;
  nutritionEstimate: NutritionEstimate;
  runningEconomy: RunningEconomyResult;
  ftp: number;
  poids: number | null;
  fcMax: number | null;
  tss7d?: number | null;
  snapshotUpdatedAt?: string | null;
  athleteAge?: number | null;
  ambition?: import("@/types/ambitionLevel").AmbitionLevel;
}) {
  // Construire le lorangInput
  const lorangInput = useMemo((): LorangStrategyInput | null => {
    const currentAmbition = ambition || 'age_group';
    
    // Cibles selon ambition
    const vlamaxTarget = currentAmbition === "elite" ? 0.35 : currentAmbition === "competitor" ? 0.45 : 0.55;
    const vo2maxTarget = currentAmbition === "elite" ? 70 : currentAmbition === "competitor" ? 62 : 55;
    const tteTarget = currentAmbition === "elite" ? 50 : currentAmbition === "competitor" ? 40 : 35;
    const fatmaxTarget = currentAmbition === "elite" ? 60 : currentAmbition === "competitor" ? 55 : 50;
    
    // Mapper discipline
    const disciplineMap: Record<string, 'IM' | '703' | 'marathon' | 'semi' | '10k' | 'cycling' | 'trail'> = {
      'IM': 'IM',
      '703': '703',
      'Marathon': 'marathon',
      'Semi': 'semi',
    };
    const discipline = disciplineMap[objectif] || '703';
    
    return {
      physiology: {
        vo2max: null, // Not available in this context
        vo2maxTarget,
        vlamax: vlamaxEffectif.value,
        vlamaxTarget,
        tte: tteEffectif.tte_min,
        tteTarget,
        fatmax: null,
        fatmaxTarget,
        economy: null,
      },
      athlete: {
        age: athleteAge ?? null,
        discipline,
        ambition: currentAmbition,
        hasGIIssues: false,
      },
      availability: {
        score: readiness.score ?? 50,
        level: readiness.score >= 75 ? 'high' : readiness.score >= 50 ? 'moderate' : readiness.score >= 25 ? 'low' : 'critical',
        hasAlerts: false,
        hrvOutOfRange2Days: false,
      },
      context: {
        daysToRace: null,
        isRaceWeek: false,
        currentPhase: 'build',
      },
      load: {
        tss7d: tss7d ?? null,
        tss28d: null,
      },
    };
  }, [vlamaxEffectif, tteEffectif, readiness, ambition, objectif, athleteAge, tss7d]);
  
  return (
    <StaffReport
      athleteName={athleteName}
      objectif={objectif}
      snapshotDate={snapshotDate}
      vlamaxEffectif={vlamaxEffectif}
      tteEffectif={tteEffectif}
      readiness={readiness}
      nutritionEstimate={nutritionEstimate}
      runningEconomy={runningEconomy}
      ftp={ftp}
      poids={poids}
      fcMax={fcMax}
      tss7d={tss7d}
      snapshotUpdatedAt={snapshotUpdatedAt}
      athleteAge={athleteAge}
      ambition={ambition}
      lorangInput={lorangInput}
    />
  );
}
