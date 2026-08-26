/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RUNNING GUIDANCE PAGE — Écran "Guidance Coach — semaine en cours"
 * 
 * Double carte : Profil verrouillé + Décision hebdomadaire + Potentiel Physiologique
 * Objectif : Décision en 30 secondes.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo, useState, useCallback, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  RefreshCw, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  Info
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudData } from "@/contexts/CloudDataContext";
import { useRunningFocusMode } from "@/hooks/useRunningFocusMode";
import { RunningFocusModeIndicator } from "@/components/RunningFocusModeIndicator";
import { LockedProfileCard } from "./LockedProfileCard";
import { WeeklyDecisionCard } from "./WeeklyDecisionCard";
import {
  createRunningPhysioProfile,
  computeWeeklyDecision,
  checkRecalibrationAlerts,
  type RunningPhysioProfile,
  type RunningWeeklyDecision,
  type RunningObjectiveDistance,
  type WeeklyInputs,
} from "@/lib/v2/runningDoubleLoop";
import { type AvailabilityRun, type PotentielRun, computePotentielRun, applyReadinessToDecision } from "@/lib/v2/potentielTypes";
import { computeVLamaxEffectif } from "@/engines/diagnostic";
import { computeDisponibiliteTFCL } from "@/lib/v2/disponibiliteTFCL";
import { fatigueStateToAvailability } from "@/lib/fatigueStateMapping";
import { AvailabilityForm } from "./AvailabilityForm";

export function RunningGuidancePage() {
  const navigate = useNavigate();
  const { currentAthlete } = useAthletes();
  const { snapshots, tests } = useCloudData();
  const { isRunningOnly, raceType, raceLabel } = useRunningFocusMode();
  
  // État local pour simulation (en prod, viendrait de la DB)
  const [showRecalibrationDialog, setShowRecalibrationDialog] = useState(false);
  
  // Récupérer le snapshot actif
  const activeSnapshot = useMemo(() => {
    if (!currentAthlete) return null;
    const athleteSnapshots = snapshots.filter(s => s.athlete_id === currentAthlete.id);
    if (currentAthlete.active_snapshot_id) {
      return athleteSnapshots.find(s => s.id === currentAthlete.active_snapshot_id) || null;
    }
    return athleteSnapshots.sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  }, [currentAthlete, snapshots]);
  
  // Calculer VLamax effectif
  const vlamaxEffectif = useMemo(() => {
    if (!currentAthlete) return null;
    return computeVLamaxEffectif({
      athleteId: currentAthlete.id,
      objectif: currentAthlete.goal || "Marathon",
      activeSnapshotId: currentAthlete.active_snapshot_id,
      tests,
      snapshots,
    });
  }, [currentAthlete, tests, snapshots]);
  
  // Créer le profil verrouillé (en prod, stocké en DB)
  const lockedProfile = useMemo((): RunningPhysioProfile | null => {
    if (!currentAthlete || !raceType) return null;
    
    // Mapper le raceType vers RunningObjectiveDistance
    const objectiveMap: Record<string, RunningObjectiveDistance> = {
      "5K": "5K",
      "10K": "10K",
      "Semi": "Semi",
      "Marathon": "Marathon",
      "Trail": "Trail",
      "TrailShort": "Trail",
      "TrailMountain": "Trail",
      "TrailUltra": "Trail",
    };
    
    const objective = objectiveMap[raceType] || "Marathon";
    
    // F41 — insufficient-data guard : plus de fake defaults (vo2 50 / vla 0.38 / tte 60).
    // Si les valeurs sont absentes → value=0 + confidence=0 pour laisser l'UI/moteur
    // afficher "Données insuffisantes" au lieu d'un profil déguisé.
    const vo2Value = activeSnapshot?.vo2max ?? currentAthlete.vo2max ?? null;
    const vlaValue = vlamaxEffectif?.value ?? null;
    const tteValue = activeSnapshot?.tte_observed_min ?? null;
    return createRunningPhysioProfile({
      athlete_id: currentAthlete.id,
      objective_distance: objective,
      vo2max: vo2Value ?? 0,
      vo2max_confidence: vo2Value != null ? 0.7 : 0,
      vo2max_source: activeSnapshot?.vo2max ? "snapshot" : "estimation",
      vlamax_cap: vlaValue ?? 0,
      vlamax_confidence: vlaValue != null ? (vlamaxEffectif?.confidence ?? 0.6) : 0,
      vlamax_source: vlamaxEffectif?.source === "test" ? "field_test" : "estimation",
      durability_min: tteValue ?? 0,
      durability_confidence: tteValue != null ? 0.8 : 0,
      economy_score: activeSnapshot?.run_economy_score ?? undefined,
      lock_duration_days: 28,
    });
  }, [currentAthlete, raceType, activeSnapshot, vlamaxEffectif]);
  
  // Disponibilité du jour dérivée de fatigue_state — sert de valeur initiale
  // avant toute correction manuelle via le formulaire (cf. `availability` ci-dessous).
  const snapshotAvailability = useMemo(
    () => fatigueStateToAvailability(activeSnapshot?.fatigue_state),
    [activeSnapshot?.fatigue_state],
  );

  // État pour le Potentiel Physiologique (formulaire) — initialisé depuis
  // fatigue_state, corrigeable par le coach/l'athlète via AvailabilityForm.
  const [availability, setAvailability] = useState<AvailabilityRun>(snapshotAvailability);
  useEffect(() => {
    setAvailability(snapshotAvailability);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAthlete?.id, activeSnapshot?.fatigue_state]);

  // Récupérer les inputs hebdomadaires — dérivés de la disponibilité éditable
  // (fatigue_state par défaut, ou correction manuelle du jour) + charge réelle.
  const weeklyInputs = useMemo((): WeeklyInputs => {
    if (!currentAthlete) return {};

    // computeDisponibiliteTFCL attend une échelle 0-10 "plus haut = mieux"
    // (cf. TFCL_READINESS_QUESTIONS), à l'opposé du sens standard
    // "plus haut = pire" de AvailabilityRun — conversion explicite ici.
    const dispo = computeDisponibiliteTFCL({
      sleep: (availability.sleep_quality - 1) * 2.5,
      fatigue: (6 - availability.fatigue_level) * 2,
      soreness: 10 - availability.muscle_soreness,
      stress: (6 - availability.mental_stress) * 2,
      motivation: (availability.motivation - 1) * 2.5,
      alerts: {},
      objective: {
        tss7d: activeSnapshot?.tss_7d ?? null,
      },
    });

    return {
      availability_score: dispo.score,
      sleep_quality: availability.sleep_quality,
      fatigue_level: availability.fatigue_level,
      stress_level: availability.mental_stress,
      motivation: availability.motivation,
      pain_flag: availability.pain_flag,
      tss_7d: activeSnapshot?.tss_7d ?? undefined,
      hr_drift_pct: activeSnapshot?.run_hr_drift_pct ?? undefined,
    };
  }, [currentAthlete, activeSnapshot, availability]);
  
  // Calculer le Potentiel Physiologique
  const potentielPhysiologique = useMemo((): PotentielRun | null => {
    if (!lockedProfile) return null;
    return computePotentielRun(lockedProfile, availability);
  }, [lockedProfile, availability]);
  
  // Calculer la décision hebdomadaire (modifiée par le readiness)
  const weeklyDecision = useMemo((): RunningWeeklyDecision | null => {
    if (!lockedProfile) return null;
    const baseDecision = computeWeeklyDecision(lockedProfile, weeklyInputs);
    
    // Appliquer le readiness à la décision
    if (potentielPhysiologique) {
      return applyReadinessToDecision(baseDecision, potentielPhysiologique) as RunningWeeklyDecision;
    }
    
    return baseDecision;
  }, [lockedProfile, weeklyInputs, potentielPhysiologique]);
  
  // Handler pour mise à jour de la disponibilité
  const handleAvailabilityUpdate = useCallback((newAvailability: AvailabilityRun) => {
    setAvailability(newAvailability);
  }, []);
  
  // Vérifier les alertes de recalibration
  const recalibrationAlerts = useMemo(() => {
    if (!lockedProfile) return [];
    return checkRecalibrationAlerts(lockedProfile);
  }, [lockedProfile]);
  
  // Note: on n'exige plus l'activation explicite du Running Focus Mode pour
  // afficher la page — l'utilisateur arrive ici depuis /running-profile ou la
  // section Planification, le gating provoquait une perception "ne dirige vers rien".
  // Si raceType est absent, la page affiche un message contextuel plus bas.

  
  // Si pas d'athlète sélectionné
  if (!currentAthlete) {
    return (
      <AppLayout title="Guidance Coach">
        <div className="max-w-2xl mx-auto p-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Aucun athlète sélectionné</AlertTitle>
            <AlertDescription>
              Sélectionnez un athlète pour accéder à la guidance de semaine.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout title="Guidance Coach">
      <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RunningFocusModeIndicator showDetails />
            <div>
              <h1 className="text-lg font-semibold">{currentAthlete.name}</h1>
              <p className="text-sm text-muted-foreground">
                Guidance semaine • {raceLabel}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Décision en 30s
          </Badge>
        </div>
        
        {/* Alertes recalibration */}
        {recalibrationAlerts.length > 0 && (
          <div className="space-y-2">
            {recalibrationAlerts.map((alert, i) => (
              <Alert 
                key={i} 
                variant={alert.severity === "urgent" ? "destructive" : "default"}
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center gap-2">
                  Recalibration recommandée
                  <Badge variant="outline" className="text-xs">
                    {alert.severity}
                  </Badge>
                </AlertTitle>
                <AlertDescription>
                  {alert.message}
                  <p className="mt-1 text-sm font-medium">{alert.suggested_action}</p>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
        
        {/* Section Disponibilité CAP */}
        <div className="grid gap-4 md:grid-cols-2">
          <AvailabilityForm value={availability} onChange={handleAvailabilityUpdate} />
        </div>

        <Separator />
        
        {/* Double carte : Profil + Décision */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Carte Profil verrouillé */}
          {lockedProfile && (
            <LockedProfileCard
              profile={lockedProfile}
              onRequestRecalibration={() => setShowRecalibrationDialog(true)}
            />
          )}
          
          {/* Carte Décision hebdo */}
          {weeklyDecision && (
            <WeeklyDecisionCard
              decision={weeklyDecision}
              onViewSuggestions={() => navigate("/templates")}
            />
          )}
        </div>
        
        {/* Message méthodologique */}
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  Méthode TFCL™ — Double Boucle CAP
                </p>
                <p className="text-muted-foreground mt-1">
                  Les paramètres physiologiques évoluent lentement (4-6 semaines). 
                  TFCL pilote l'exécution semaine par semaine sans modifier le profil verrouillé.
                  Le coach reste décisionnaire.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Actions rapides */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/tests")}
          >
            Ajouter un test CAP
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
