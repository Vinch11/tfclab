/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOOK — useCalibrationEvidence
 * 
 * Gestion du CalibrationEvidenceStore via Lovable Cloud.
 * CRUD preuves terrain + snapshots calibration.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import {
  CalibrationEvidence,
  CalibrationSnapshot,
  produceCalibratedVLamax,
  CALIBRATION_WINDOW_DAYS,
  isProfileLocked,
  computeLockEndDate,
  EvidenceType,
  EvidenceSourceType,
  ValidityStatus,
} from "@/lib/calibration/vlamaxContinuous";

// ═══════════════════════════════════════════════════════════════════════════════
// DB TYPES MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

type DbCalibrationEvidence = Tables<"calibration_evidence">;
type DbCalibrationSnapshot = Tables<"calibration_snapshots">;
type DbCoachOverride = Tables<"coach_overrides">;

function mapDbToEvidence(db: DbCalibrationEvidence): CalibrationEvidence {
  return {
    id: db.id,
    athlete_id: db.athlete_id,
    coach_id: db.coach_id,
    date: db.date,
    source_type: db.source_type as EvidenceSourceType,
    evidence_type: db.evidence_type as EvidenceType,
    raw_values: db.raw_values as Record<string, number | string | boolean>,
    protocol_quality: db.protocol_quality as 1 | 2 | 3 | 4 | 5,
    validity: db.validity as ValidityStatus,
    confidence_evidence: Number(db.confidence_evidence),
    fatigue_index: db.fatigue_index,
    notes: db.notes,
    used_in_calibration: db.used_in_calibration,
    calibration_weight: db.calibration_weight ? Number(db.calibration_weight) : undefined,
  };
}

function mapDbToSnapshot(db: DbCalibrationSnapshot): CalibrationSnapshot {
  return {
    id: db.id,
    athlete_id: db.athlete_id,
    coach_id: db.coach_id,
    date: db.date,
    vlamax_modelled: db.vlamax_modelled ? Number(db.vlamax_modelled) : null,
    vlamax_calibrated: db.vlamax_calibrated ? Number(db.vlamax_calibrated) : null,
    vlamax_range_p25: db.vlamax_range_p25 ? Number(db.vlamax_range_p25) : null,
    vlamax_range_p75: db.vlamax_range_p75 ? Number(db.vlamax_range_p75) : null,
    confidence: Number(db.confidence),
    evidence_ids: db.evidence_ids ?? [],
    is_locked: db.is_locked,
    lock_until: db.lock_until,
    recalibration_recommended: db.recalibration_recommended,
    recalibration_reason: db.recalibration_reason,
    calibration_window_start: db.calibration_window_start,
    calibration_window_end: db.calibration_window_end,
    notes: db.notes,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useCalibrationEvidence(athleteId: string | null) {
  const { user } = useAuth();
  const [evidences, setEvidences] = useState<CalibrationEvidence[]>([]);
  const [snapshots, setSnapshots] = useState<CalibrationSnapshot[]>([]);
  const [overrides, setOverrides] = useState<DbCoachOverride[]>([]);
  const [loading, setLoading] = useState(true);

  // ========== LOAD DATA ==========
  const loadData = useCallback(async () => {
    if (!user || !athleteId) {
      setEvidences([]);
      setSnapshots([]);
      setOverrides([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [evidenceRes, snapshotRes, overrideRes] = await Promise.all([
        supabase
          .from("calibration_evidence")
          .select("*")
          .eq("athlete_id", athleteId)
          .order("date", { ascending: false }),
        supabase
          .from("calibration_snapshots")
          .select("*")
          .eq("athlete_id", athleteId)
          .order("date", { ascending: false }),
        supabase
          .from("coach_overrides")
          .select("*")
          .eq("athlete_id", athleteId)
          .order("date", { ascending: false }),
      ]);

      if (evidenceRes.error) throw evidenceRes.error;
      if (snapshotRes.error) throw snapshotRes.error;
      if (overrideRes.error) throw overrideRes.error;

      setEvidences((evidenceRes.data || []).map(mapDbToEvidence));
      setSnapshots((snapshotRes.data || []).map(mapDbToSnapshot));
      setOverrides(overrideRes.data || []);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error loading calibration data");
      toast.error("Erreur lors du chargement des données calibration");
    } finally {
      setLoading(false);
    }
  }, [user, athleteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ========== ADD EVIDENCE ==========
  const addEvidence = useCallback(async (
    evidence: Omit<CalibrationEvidence, "id" | "coach_id">
  ): Promise<CalibrationEvidence | null> => {
    if (!user || !athleteId) return null;

    const insertData: TablesInsert<"calibration_evidence"> = {
      athlete_id: athleteId,
      coach_id: user.id,
      date: evidence.date,
      source_type: evidence.source_type,
      evidence_type: evidence.evidence_type,
      raw_values: evidence.raw_values as any,
      protocol_quality: evidence.protocol_quality,
      validity: evidence.validity,
      confidence_evidence: evidence.confidence_evidence,
      fatigue_index: evidence.fatigue_index ?? null,
      notes: evidence.notes ?? null,
      used_in_calibration: false,
      calibration_weight: 0,
    };

    const { data, error } = await supabase
      .from("calibration_evidence")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de l'ajout de la preuve");
      return null;
    }

    const newEvidence = mapDbToEvidence(data);
    setEvidences(prev => [newEvidence, ...prev]);
    toast.success("Preuve terrain ajoutée");
    return newEvidence;
  }, [user, athleteId]);

  // ========== UPDATE EVIDENCE ==========
  const updateEvidence = useCallback(async (
    id: string,
    updates: Partial<CalibrationEvidence>
  ): Promise<boolean> => {
    const updateData: TablesUpdate<"calibration_evidence"> = {
      ...(updates.protocol_quality && { protocol_quality: updates.protocol_quality }),
      ...(updates.validity && { validity: updates.validity }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
      ...(updates.fatigue_index !== undefined && { fatigue_index: updates.fatigue_index }),
    };

    const { error } = await supabase
      .from("calibration_evidence")
      .update(updateData)
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return false;
    }

    setEvidences(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    return true;
  }, []);

  // ========== DELETE EVIDENCE ==========
  const deleteEvidence = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from("calibration_evidence")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression");
      return false;
    }

    setEvidences(prev => prev.filter(e => e.id !== id));
    toast.success("Preuve supprimée");
    return true;
  }, []);

  // ========== CREATE CALIBRATION SNAPSHOT ==========
  const createCalibrationSnapshot = useCallback(async (
    modelledVlamax: number,
    modelledConfidence: number,
    lockProfile: boolean = false
  ): Promise<CalibrationSnapshot | null> => {
    if (!user || !athleteId) return null;

    // Calculer calibration
    const result = produceCalibratedVLamax(
      modelledVlamax,
      modelledConfidence,
      evidences
    );

    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - CALIBRATION_WINDOW_DAYS);

    const insertData: TablesInsert<"calibration_snapshots"> = {
      athlete_id: athleteId,
      coach_id: user.id,
      date: now.toISOString(),
      vlamax_modelled: modelledVlamax,
      vlamax_calibrated: result.vlamax_calibrated,
      vlamax_range_p25: result.vlamax_range.p25,
      vlamax_range_p75: result.vlamax_range.p75,
      confidence: result.confidence,
      evidence_ids: result.evidence_ids,
      is_locked: lockProfile,
      lock_until: lockProfile ? computeLockEndDate(now).toISOString().split('T')[0] : null,
      recalibration_recommended: result.recalibration_recommended,
      recalibration_reason: result.recalibration_reason,
      calibration_window_start: windowStart.toISOString().split('T')[0],
      calibration_window_end: now.toISOString().split('T')[0],
      notes: result.notes.join("; "),
    };

    const { data, error } = await supabase
      .from("calibration_snapshots")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de la création du snapshot calibration");
      return null;
    }

    // Marquer les preuves comme utilisées
    const usedIds = result.evidence_ids;
    if (usedIds.length > 0) {
      await supabase
        .from("calibration_evidence")
        .update({ used_in_calibration: true })
        .in("id", usedIds);

      setEvidences(prev => prev.map(e => 
        usedIds.includes(e.id) ? { ...e, used_in_calibration: true } : e
      ));
    }

    const newSnapshot = mapDbToSnapshot(data);
    setSnapshots(prev => [newSnapshot, ...prev]);
    toast.success(lockProfile ? "Profil calibré et verrouillé" : "Calibration enregistrée");
    return newSnapshot;
  }, [user, athleteId, evidences]);

  // ========== COACH OVERRIDE ==========
  const addCoachOverride = useCallback(async (
    module: string,
    action: string,
    reason: string,
    beforeValue: any,
    afterValue: any
  ): Promise<boolean> => {
    if (!user || !athleteId) return false;

    const insertData: TablesInsert<"coach_overrides"> = {
      athlete_id: athleteId,
      coach_id: user.id,
      module,
      action,
      reason,
      before_value: beforeValue,
      after_value: afterValue,
    };

    const { data, error } = await supabase
      .from("coach_overrides")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de l'enregistrement de l'override");
      return false;
    }

    setOverrides(prev => [data, ...prev]);
    toast.success("Override enregistré");
    return true;
  }, [user, athleteId]);

  // ========== COMPUTED VALUES ==========
  
  // Dernier snapshot calibration
  const latestSnapshot = useMemo(() => {
    if (snapshots.length === 0) return null;
    return snapshots[0];
  }, [snapshots]);

  // Profil verrouillé?
  const isLocked = useMemo(() => {
    return isProfileLocked(latestSnapshot);
  }, [latestSnapshot]);

  // Preuves dans la fenêtre
  const windowEvidences = useMemo(() => {
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - CALIBRATION_WINDOW_DAYS);
    
    return evidences.filter(e => {
      const evidenceDate = new Date(e.date);
      return evidenceDate >= windowStart && evidenceDate <= now;
    });
  }, [evidences]);

  // Calibration live (sans snapshot)
  const liveCalibration = useMemo(() => {
    if (!latestSnapshot?.vlamax_modelled) return null;
    
    return produceCalibratedVLamax(
      latestSnapshot.vlamax_modelled,
      latestSnapshot.confidence,
      windowEvidences
    );
  }, [latestSnapshot, windowEvidences]);

  return {
    // Data
    evidences,
    snapshots,
    overrides,
    loading,
    
    // Actions
    loadData,
    addEvidence,
    updateEvidence,
    deleteEvidence,
    createCalibrationSnapshot,
    addCoachOverride,
    
    // Computed
    latestSnapshot,
    isLocked,
    windowEvidences,
    liveCalibration,
  };
}
