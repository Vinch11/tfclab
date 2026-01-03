import { useState } from "react";
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
  onGoToSnapshots: () => void;
  onGoToMethodology: () => void;
}

export function RaceReadinessPage({
  athleteName,
  objectif,
  snapshotDate,
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
                <CardTitle className="text-xl">Race Readiness</CardTitle>
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
          {/* Vue Coach - Complète */}
          <RaceReadinessCard
            athlete={legacyAthlete}
            vlamaxEffectif={vlamaxEffectif}
            tteEffectif={tteEffectif}
            readiness={readiness}
            energyDrift={energyDrift}
            onGoToSnapshots={onGoToSnapshots}
            onGoToMethodology={onGoToMethodology}
          />

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
