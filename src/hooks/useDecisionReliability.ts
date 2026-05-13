/**
 * useDecisionReliability Hook
 * 
 * Calcule et persiste automatiquement le Decision Reliability Engine™ (DRE)
 * à chaque modification de snapshot.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { DbSnapshot } from "@/hooks/useCloudData";
import type { Json } from "@/integrations/supabase/types";
import {
  computeFullDRE,
  type DecisionReliabilityResult,
  type ProtocolQualityInput,
  type FullDREInput
} from "@/engines/diagnostic";
import { resolveVlamaxForGoal } from "@/lib/vlamaxResolver";

export interface ReliabilityScore {
  id: string;
  snapshot_id: string;
  athlete_id: string;
  coach_id: string;
  decision_confidence_score: number;
  decision_level: string;
  protocol_quality_score: number;
  is_reference_week: boolean;
  vlamax_median: number | null;
  vlamax_dispersion: number | null;
  vlamax_range_low: number | null;
  vlamax_range_high: number | null;
  vlamax_multi_confidence: number | null;
  vlamax_indices: Record<string, unknown> | null;
  durability_consistency_score: number | null;
  consistency_score: number | null;
  consistency_flags: string[] | null;
  incoherence_detected: boolean | null;
  economy_score: number | null;
  reference_week_confidence_boost: number | null;
  coach_validation_status: string | null;
  raw_calculation_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface UseDecisionReliabilityResult {
  // État
  reliabilityScore: ReliabilityScore | null;
  dreResult: DecisionReliabilityResult | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  calculateAndPersist: (
    snapshot: DbSnapshot,
    protocolQuality?: ProtocolQualityInput,
    isReferenceWeek?: boolean
  ) => Promise<ReliabilityScore | null>;
  
  markAsReferenceWeek: (snapshotId: string) => Promise<boolean>;
  
  loadForSnapshot: (snapshotId: string) => Promise<ReliabilityScore | null>;
}

// Extended snapshot type with optional fields from DB
interface ExtendedSnapshot extends DbSnapshot {
  p30s_w?: number | null;
  p60s_w?: number | null;
  map5min_w?: number | null;
  vlamax_is_reference?: boolean | null;
  objectif?: string | null;
  fatigue_state?: string | null;
}

export function useDecisionReliability(
  athleteId: string | null,
  snapshotId: string | null
): UseDecisionReliabilityResult {
  const { user } = useAuth();
  const [reliabilityScore, setReliabilityScore] = useState<ReliabilityScore | null>(null);
  const [dreResult, setDreResult] = useState<DecisionReliabilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Charger le score existant pour le snapshot actif
  const loadForSnapshot = useCallback(async (snapId: string): Promise<ReliabilityScore | null> => {
    if (!user) return null;
    
    try {
      const { data, error: fetchError } = await supabase
        .from("reliability_scores")
        .select("*")
        .eq("snapshot_id", snapId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (fetchError) {
        console.error("Erreur chargement reliability_score:", fetchError.message);
        return null;
      }
      
      if (data) {
        setReliabilityScore(data as unknown as ReliabilityScore);
        return data as unknown as ReliabilityScore;
      }
      
      return null;
    } catch (err) {
      console.error("Exception loadForSnapshot:", err);
      return null;
    }
  }, [user]);
  
  // Calculer et persister le DRE
  const calculateAndPersist = useCallback(async (
    snapshot: DbSnapshot,
    protocolQuality?: ProtocolQualityInput,
    isReferenceWeek?: boolean
  ): Promise<ReliabilityScore | null> => {
    if (!user || !snapshot.id) {
      setError("Utilisateur non connecté ou snapshot invalide");
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Cast to extended snapshot to access optional DB fields
      const extSnapshot = snapshot as ExtendedSnapshot;

      // ✅ VLamax adaptée à l'objectif (run/trail → vlamax_run, sinon vlamax vélo)
      const goalVlamax = resolveVlamaxForGoal(
        snapshot as any,
        { goal: extSnapshot.objectif ?? null }
      ).value;

      // Build full DRE input
      const dreInput: FullDREInput = {
        snapshotId: snapshot.id,
        athleteId: snapshot.athlete_id,
        coachId: user.id,
        objective: extSnapshot.objectif ?? "IM",
        vlamax: goalVlamax,
        vlamaxConfidence: 0.7, // Default confidence
        tteMin: snapshot.tte_observed_min ?? null,
        tteConfidence: 0.7, // Default confidence
        fatmaxPct: null, // Non disponible dans le snapshot standard
        vo2max: snapshot.vo2max ?? null,
        ftp: snapshot.ftp ?? null,
        weightKg: snapshot.weight_kg ?? null,
        p30s: extSnapshot.p30s_w ?? null,
        p1min: extSnapshot.p60s_w ?? null,
        map5min: extSnapshot.map5min_w ?? null,
        pmax5s: snapshot.pmax_5s ?? null,
        isReferenceWeek: isReferenceWeek ?? extSnapshot.vlamax_is_reference === true,
        fatigueState: (extSnapshot.fatigue_state as 'fresh' | 'normal' | 'fatigued') ?? 'normal',
        protocolQuality: protocolQuality ?? undefined
      };
      
      // Calculer le DRE complet
      const dre = computeFullDRE(dreInput);
      
      setDreResult(dre);
      
      // Préparer les données pour insertion (convert to JSON-safe format)
      const rawData: Json = {
        version: dre.version,
        calculatedAt: dre.calculatedAt,
        recommendations: dre.recommendations,
        warnings: dre.warnings,
        scenarios: dre.scenarios.map(s => ({
          type: s.type,
          label: s.label,
          objective: s.objective,
          expectedBenefit: s.expectedBenefit,
          risks: {
            fatigue: s.risks.fatigue,
            injury: s.risks.injury,
            glycogenDepletion: s.risks.glycogenDepletion
          },
          recommendation: s.recommendation
        }))
      };
      
      const insertData = {
        snapshot_id: snapshot.id,
        athlete_id: snapshot.athlete_id,
        coach_id: user.id,
        decision_confidence_score: dre.decisionConfidenceScore,
        decision_level: dre.decisionLevel,
        protocol_quality_score: dre.protocolQuality.score,
        is_reference_week: dre.isReferenceWeek,
        reference_week_confidence_boost: dre.referenceWeekBoost,
        vlamax_median: dre.multiIndexVlamax?.median ?? null,
        vlamax_dispersion: dre.multiIndexVlamax?.dispersion ?? null,
        vlamax_range_low: dre.multiIndexVlamax?.rangeLow ?? null,
        vlamax_range_high: dre.multiIndexVlamax?.rangeHigh ?? null,
        vlamax_multi_confidence: dre.multiIndexVlamax?.confidence ?? null,
        vlamax_indices: JSON.parse(JSON.stringify(dre.multiIndexVlamax?.indices ?? [])) as Json,
        durability_consistency_score: dre.durability?.consistencyScore ?? null,
        consistency_score: dre.physioConsistency.score,
        consistency_flags: dre.physioConsistency.flags.map(f => f.flag) as Json,
        incoherence_detected: dre.physioConsistency.incoherenceDetected,
        economy_score: dre.economy?.score ?? null,
        raw_calculation_data: rawData,
        calculation_version: dre.version
      };
      
      // Upsert: mettre à jour si existe, sinon créer
      const { data: existingRecord } = await supabase
        .from("reliability_scores")
        .select("id")
        .eq("snapshot_id", snapshot.id)
        .maybeSingle();
      
      let result;
      
      if (existingRecord) {
        // Update
        const { data, error: updateError } = await supabase
          .from("reliability_scores")
          .update(insertData)
          .eq("id", existingRecord.id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        result = data;
      } else {
        // Insert
        const { data, error: insertError } = await supabase
          .from("reliability_scores")
          .insert(insertData)
          .select()
          .single();
        
        if (insertError) throw insertError;
        result = data;
      }
      
      const savedScore = result as unknown as ReliabilityScore;
      setReliabilityScore(savedScore);
      
      return savedScore;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      console.error("Erreur calculateAndPersist DRE:", message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  // Marquer comme semaine de référence
  const markAsReferenceWeek = useCallback(async (snapId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Update le snapshot
      const { error: snapshotError } = await supabase
        .from("snapshots")
        .update({ vlamax_is_reference: true })
        .eq("id", snapId);
      
      if (snapshotError) throw snapshotError;
      
      // Update le reliability_score si existe
      const { error: reliabilityError } = await supabase
        .from("reliability_scores")
        .update({ 
          is_reference_week: true,
          reference_week_confidence_boost: 0.10 
        })
        .eq("snapshot_id", snapId);
      
      if (reliabilityError) {
        // Pas grave si le reliability_score n'existe pas encore
        console.log("Reliability score pas encore créé pour ce snapshot");
      }
      
      toast.success("Marqué comme semaine de référence TFCL");
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error("Erreur: " + message);
      return false;
    }
  }, [user]);
  
  // Charger automatiquement au changement de snapshot
  useEffect(() => {
    if (snapshotId && user) {
      loadForSnapshot(snapshotId);
    } else {
      setReliabilityScore(null);
      setDreResult(null);
    }
  }, [snapshotId, user, loadForSnapshot]);
  
  return {
    reliabilityScore,
    dreResult,
    loading,
    error,
    calculateAndPersist,
    markAsReferenceWeek,
    loadForSnapshot
  };
}
