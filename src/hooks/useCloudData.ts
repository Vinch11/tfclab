// =============================================
// HOOK CLOUD DATA - Load/Save from Lovable Cloud
// =============================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate, Json } from "@/integrations/supabase/types";
import { 
  athleteSchema, 
  snapshotSchema, 
  checkinSchema, 
  testSchema,
  validateOrNull 
} from "@/lib/validationSchemas";
import { enrichSnapshotWithRunEconomy } from "@/lib/runningEconomySimple";
// Types DB from generated types (extended with active_snapshot_id and birth_date)
export interface DbAthlete {
  id: string;
  coach_id: string;
  name: string;
  goal: string | null;
  refs: Json | null;
  vo2max: number | null;
  sex: string | null;
  active_snapshot_id: string | null;
  birth_date: string | null; // Date de naissance pour calcul AAI
  is_hidden: boolean | null; // Masquer dans le sélecteur
  created_at: string;
}
export type DbTest = Tables<"tests">;
export type DbPlan = Tables<"plans">;

// Snapshot type (table created via migration, not yet in generated types)
export interface DbSnapshot {
  id: string;
  athlete_id: string;
  coach_id: string;
  date: string;
  source: string;
  cycle_tag?: string | null;
  confidence?: number | null;
  fc_max?: number | null;
  vma?: number | null;
  ftp?: number | null;
  css?: number | null;
  vo2max?: number | null;
  vlamax?: number | null;
  vlamax_run?: number | null; // VLamax CAP distinct de vlamax (vélo)
  weight_kg?: number | null;
  fat_pct?: number | null;
  pmax_5s?: number | null;
  metabolic_profile?: string | null;
  metabolic_score?: number | null;
  coach_notes?: string | null;
  // TTE PRO fields
  tss_7d?: number | null;
  tte_mode?: string | null;
  tte_observed_min?: number | null;
  // Running Economy (CAP) fields
  run_pace_ref_sec_per_km?: number | null;
  run_hr_ref_bpm?: number | null;
  run_duration_min?: number | null;
  run_hr_drift_pct?: number | null;
  run_economy_score?: number | null;
  run_economy_label?: string | null;
  // Sport & objectif
  sport_main?: string | null;
  objectif?: string | null;
  // V2 Enhanced power indices
  p30s_w?: number | null;
  p60s_w?: number | null;
  map5min_w?: number | null;
  protocol_quality?: number | null;
  // VLamax source fields
  vlamax_source?: string | null;
  vlamax_protocol?: string | null;
  vlamax_is_reference?: boolean | null;
  fatigue_state?: string | null;
  // Low CRR justification for TSS7j < 250
  low_crr_justification?: string | null;
  // Force development mode toggle
  force_development_mode?: boolean | null;
  // Bike fields
  bike_cadence_rpm?: number | null;
  bike_hr_drift_flag?: boolean | null;
  carb_tolerance_band?: string | null;
  gi_issues_flag?: boolean | null;
  // ✅ VLamax CAP estimation fields
  pace_threshold_sec_per_km?: number | null; // Pace seuil CAP (sec/km)
  sprint_15s_distance?: number | null;       // Distance sprint 15s (mètres)
  running_power_max?: number | null;         // Puissance max course (W)
  running_power_threshold?: number | null;   // Puissance seuil course (W)
  running_power_1s?: number | null;          // Peak 1s running power (W)
  running_power_5s?: number | null;          // Peak 5s running power (W)
  running_power_30s?: number | null;         // Best 30s running power (W)
  running_power_60s?: number | null;         // Best 60s running power (W)
  running_power_5min?: number | null;        // Best 5min running power (W)
  created_at?: string;
  updated_at?: string;
}

// Checkin type (table created via migration)
export interface DbCheckin {
  id: string;
  athlete_id: string;
  coach_id: string;
  date_iso: string;
  week_tag?: string | null;
  sleep?: number | null;
  fatigue?: number | null;
  soreness?: number | null;
  stress?: number | null;
  motivation?: number | null;
  rpe_key1?: number | null;
  rpe_key2?: number | null;
  pain_flag?: boolean | null;
  readiness?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function useCloudData() {
  const { user } = useAuth();
  const [athletes, setAthletes] = useState<DbAthlete[]>([]);
  const [tests, setTests] = useState<DbTest[]>([]);
  const [plans, setPlans] = useState<DbPlan[]>([]);
  const [snapshots, setSnapshots] = useState<DbSnapshot[]>([]);
  const [checkins, setCheckins] = useState<DbCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all data
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [athletesRes, testsRes, plansRes, snapshotsRes, checkinsRes] = await Promise.all([
        supabase.from("athletes").select("*").eq("coach_id", user.id).order("created_at", { ascending: false }),
        supabase.from("tests").select("*").eq("coach_id", user.id).order("date", { ascending: false }),
        supabase.from("plans").select("*").eq("coach_id", user.id),
        supabase.from("snapshots").select("*").eq("coach_id", user.id).order("date", { ascending: false }),
        supabase.from("checkins").select("*").eq("coach_id", user.id).order("date_iso", { ascending: false }),
      ]);

      if (athletesRes.error) throw athletesRes.error;
      if (testsRes.error) throw testsRes.error;
      if (plansRes.error) throw plansRes.error;
      if (snapshotsRes.error) throw snapshotsRes.error;
      if (checkinsRes.error) throw checkinsRes.error;

      setAthletes(athletesRes.data || []);
      setTests(testsRes.data || []);
      setPlans(plansRes.data || []);
      // Enrichissement transparent : si run_economy_score absent mais VMA dispo,
      // on l'estime via Léger/Di Prampero. Préserve traçabilité via run_economy_score_source.
      // → Tous les consommateurs (Compass, MLSS, AI Plan, Exports…) bénéficient automatiquement.
      const enrichedSnapshots = ((snapshotsRes.data as DbSnapshot[]) || []).map((s) =>
        enrichSnapshotWithRunEconomy(s) as DbSnapshot,
      );
      setSnapshots(enrichedSnapshots);
      setCheckins((checkinsRes.data as DbCheckin[]) || []);
    } catch (error: unknown) {
      // Log sanitized error in development only
      if (import.meta.env.DEV) {
        console.error("Error loading data");
      }
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ========== ATHLETES ==========
  const addAthlete = async (name: string, goal: string, refs: Json = {}, vo2max: number | null = null, sex: string | null = null) => {
    if (!user) return null;
    
    // Validate input data
    const { data: validated, error: validationError } = validateOrNull(athleteSchema, { name, goal, vo2max, sex, refs });
    if (validationError) {
      toast.error(`Données invalides: ${validationError}`);
      return null;
    }
    
    const insertData: TablesInsert<"athletes"> = {
      coach_id: user.id,
      name: validated.name,
      goal: validated.goal ?? null,
      refs: (validated.refs as Json) ?? {},
      vo2max: (validated.vo2max as number | null) ?? null,
      sex: validated.sex ?? null,
    };
    const { data, error } = await supabase
      .from("athletes")
      .insert(insertData)
      .select()
      .single();
    if (error) {
      toast.error("Erreur lors de l'ajout de l'athlète");
      return null;
    }
    setAthletes((prev) => [data, ...prev]);
    toast.success("Athlète ajouté");
    return data;
  };

  const updateAthlete = async (id: string, updates: TablesUpdate<"athletes">) => {
    const { error } = await supabase.from("athletes").update(updates).eq("id", id);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      if (import.meta.env.DEV) console.error("Update athlete error");
      return false;
    }
    setAthletes((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    return true;
  };

  const deleteAthlete = async (id: string) => {
    const { error } = await supabase.from("athletes").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
      if (import.meta.env.DEV) console.error("Delete athlete error");
      return false;
    }
    setAthletes((prev) => prev.filter((a) => a.id !== id));
    setTests((prev) => prev.filter((t) => t.athlete_id !== id));
    setPlans((prev) => prev.filter((p) => p.athlete_id !== id));
    setSnapshots((prev) => prev.filter((s) => s.athlete_id !== id));
    toast.success("Athlète supprimé");
    return true;
  };

  // ========== TESTS ==========
  const addTest = async (
    athleteId: string,
    type: string,
    name: string,
    sport: string | null,
    reliability: number | null,
    vlamax: number | null,
    raw: Json = {},
    note: string | null = null
  ) => {
    if (!user) return null;
    
    // Validate input data
    const { data: validated, error: validationError } = validateOrNull(testSchema, { 
      athlete_id: athleteId, type, name, sport, reliability, vlamax, raw, note 
    });
    if (validationError) {
      toast.error(`Données invalides: ${validationError}`);
      return null;
    }
    
    const insertData: TablesInsert<"tests"> = {
      coach_id: user.id,
      athlete_id: validated.athlete_id,
      type: validated.type,
      name: validated.name,
      sport: validated.sport ?? null,
      reliability: (validated.reliability as number | null) ?? null,
      vlamax: (validated.vlamax as number | null) ?? null,
      raw: (validated.raw as Json) ?? {},
      note: validated.note ?? null,
    };
    const { data, error } = await supabase
      .from("tests")
      .insert(insertData)
      .select()
      .single();
    if (error) {
      toast.error("Erreur lors de l'ajout du test");
      return null;
    }
    setTests((prev) => [data, ...prev]);
    toast.success("Test enregistré");
    return data;
  };

  const deleteTest = async (id: string) => {
    const { error } = await supabase.from("tests").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
      if (import.meta.env.DEV) console.error("Delete test error");
      return false;
    }
    setTests((prev) => prev.filter((t) => t.id !== id));
    return true;
  };

  // ========== PLANS ==========
  const savePlan = async (athleteId: string, planJson: Json) => {
    if (!user) return false;
    const upsertData: TablesInsert<"plans"> = {
      athlete_id: athleteId,
      coach_id: user.id,
      plan_json: planJson,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("plans")
      .upsert(upsertData, { onConflict: "athlete_id" });
    if (error) {
      toast.error("Erreur lors de la sauvegarde du plan");
      if (import.meta.env.DEV) console.error("Save plan error");
      return false;
    }
    setPlans((prev) => {
      const exists = prev.find((p) => p.athlete_id === athleteId);
      if (exists) {
        return prev.map((p) =>
          p.athlete_id === athleteId
            ? { ...p, plan_json: planJson, updated_at: new Date().toISOString() }
            : p
        );
      }
      return [
        ...prev,
        {
          athlete_id: athleteId,
          coach_id: user.id,
          plan_json: planJson,
          updated_at: new Date().toISOString(),
        },
      ];
    });
    return true;
  };

  const getPlan = (athleteId: string) => {
    return plans.find((p) => p.athlete_id === athleteId);
  };

  const getTestsForAthlete = (athleteId: string) => {
    return tests.filter((t) => t.athlete_id === athleteId);
  };

  // ========== SNAPSHOTS ==========
  const getSnapshotsForAthlete = (athleteId: string) => {
    return snapshots.filter((s) => s.athlete_id === athleteId);
  };

  const addSnapshot = async (
    snapshot: Omit<DbSnapshot, "id" | "created_at" | "updated_at">
  ) => {
    if (!user) {
      toast.error("Session expirée — reconnectez-vous");
      return null;
    }

    const zodResult = snapshotSchema.safeParse(snapshot);
    if (!zodResult.success) {
      console.error("❌ Zod validation failed dans addSnapshot");
      console.error("Champs fautifs :", zodResult.error.flatten().fieldErrors);
      zodResult.error.issues.forEach((i) =>
        console.error(
          `→ "${i.path.join('.')}" : ${i.message} | reçu :`,
          (snapshot as any)?.[i.path[0]]
        )
      );
      toast.error("Données invalides — voir console");
      return null;
    }



    // P0 — Auto-déduction sport_main depuis l'objectif athlète si non fourni / défaut bike
    const validated = zodResult.data as any;
    const athleteForSport = athletes.find((a) => a.id === validated.athlete_id);
    const goal = athleteForSport?.goal;
    const providedSport = validated.sport_main as string | undefined;
    const { deduceSportMainFromGoal } = await import("@/lib/sportMainDeduction");
    const deduced = deduceSportMainFromGoal(goal);
    // Si pas fourni, ou si fourni 'bike' (défaut DB) alors que l'objectif est run/tri, on corrige
    let finalSport = providedSport;
    if (!providedSport && deduced) {
      finalSport = deduced;
    } else if (providedSport === "bike" && deduced === "run") {
      finalSport = "run";
    }

    const insertPayload: TablesInsert<"snapshots"> = {
      ...validated,
      ...(finalSport ? { sport_main: finalSport } : {}),
      coach_id: user.id,
    };

    const { data: inserted, error } = await supabase
      .from("snapshots")
      .insert(insertPayload)
      .select("*");

    if (error) {
      // Log only error message (no user data)
      console.error("Add snapshot error:", error.message);
      toast.error(`Erreur lors de l'ajout du snapshot: ${error.message}`);
      return null;
    }

    // PostgREST can sometimes return 0 rows on insert+select; fallback fetch.
    const row = inserted?.[0] as DbSnapshot | undefined;
    if (!row) {
      const { data: fetched, error: fetchError } = await supabase
        .from("snapshots")
        .select("*")
        .eq("coach_id", user.id)
        .eq("athlete_id", snapshot.athlete_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError || !fetched) {
        if (import.meta.env.DEV) console.error("Fetch inserted snapshot error:", fetchError);
        toast.error("Snapshot créé, mais impossible de le récupérer");
        return null;
      }

      setSnapshots((prev) => [enrichSnapshotWithRunEconomy(fetched as DbSnapshot) as DbSnapshot, ...prev]);
      toast.success("Snapshot créé");
      return fetched as DbSnapshot;
    }

    setSnapshots((prev) => [enrichSnapshotWithRunEconomy(row) as DbSnapshot, ...prev]);
    toast.success("Snapshot créé");
    return row;
  };

  const updateSnapshot = async (id: string, updates: Partial<DbSnapshot>) => {
    // Strip non-DB fields before sending to Supabase
    const { id: _id, created_at: _ca, updated_at: _ua, ...cleanUpdates } = updates as any;
    const { error } = await supabase.from("snapshots").update(cleanUpdates).eq("id", id);
    if (error) {
      const detail = error.details || error.message || "Erreur inconnue";
      toast.error(`Mise à jour snapshot échouée : ${detail}`);
      console.error("Update snapshot error:", error.message, error.details, error.code, JSON.stringify(cleanUpdates));
      return false;
    }
    setSnapshots((prev) => prev.map((s) => (s.id === id ? enrichSnapshotWithRunEconomy({ ...s, ...updates }) as DbSnapshot : s)));
    toast.success("Profil mis à jour");
    return true;
  };

  const deleteSnapshot = async (id: string) => {
    const { error } = await supabase.from("snapshots").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
      if (import.meta.env.DEV) console.error("Delete snapshot error");
      return false;
    }
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
    // Also clear active_snapshot_id if this was the active snapshot
    setAthletes((prev) => prev.map((a) => 
      a.active_snapshot_id === id ? { ...a, active_snapshot_id: null } : a
    ));
    toast.success("Profil supprimé");
    return true;
  };

  // Set active snapshot for an athlete (effective profile)
  const setActiveSnapshot = async (athleteId: string, snapshotId: string | null) => {
    const { error } = await supabase
      .from("athletes")
      .update({ active_snapshot_id: snapshotId })
      .eq("id", athleteId);
    if (error) {
      toast.error("Erreur lors de la mise à jour du snapshot actif");
      if (import.meta.env.DEV) console.error("Set active snapshot error");
      return false;
    }
    setAthletes((prev) => prev.map((a) => 
      a.id === athleteId ? { ...a, active_snapshot_id: snapshotId } : a
    ));
    toast.success(snapshotId ? "Snapshot défini comme actif" : "Snapshot actif retiré");
    return true;
  };

  // ========== CHECKINS ==========
  const getCheckinsForAthlete = (athleteId: string) => {
    return checkins.filter((c) => c.athlete_id === athleteId);
  };

  const addCheckin = async (checkin: Omit<DbCheckin, "id" | "created_at" | "updated_at">) => {
    if (!user) return null;
    
    // Validate input data
    const { error: validationError } = validateOrNull(checkinSchema, checkin);
    if (validationError) {
      toast.error(`Données invalides: ${validationError}`);
      return null;
    }
    
    const { data, error } = await supabase
      .from("checkins")
      .insert({ ...checkin, coach_id: user.id })
      .select()
      .single();
    if (error) {
      toast.error("Erreur lors de l'ajout du check-in");
      return null;
    }
    setCheckins((prev) => [data as DbCheckin, ...prev]);
    toast.success("Check-in ajouté");
    return data as DbCheckin;
  };

  const updateCheckin = async (id: string, updates: Partial<DbCheckin>) => {
    const { error } = await supabase.from("checkins").update(updates).eq("id", id);
    if (error) {
      toast.error("Erreur lors de la mise à jour du check-in");
      if (import.meta.env.DEV) console.error("Update checkin error");
      return false;
    }
    setCheckins((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    toast.success("Check-in mis à jour");
    return true;
  };

  const deleteCheckin = async (id: string) => {
    const { error } = await supabase.from("checkins").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
      if (import.meta.env.DEV) console.error("Delete checkin error");
      return false;
    }
    setCheckins((prev) => prev.filter((c) => c.id !== id));
    toast.success("Check-in supprimé");
    return true;
  };

  return {
    athletes,
    tests,
    plans,
    snapshots,
    checkins,
    loading,
    loadData,
    addAthlete,
    updateAthlete,
    deleteAthlete,
    addTest,
    deleteTest,
    savePlan,
    getPlan,
    getTestsForAthlete,
    getSnapshotsForAthlete,
    addSnapshot,
    updateSnapshot,
    deleteSnapshot,
    setActiveSnapshot,
    getCheckinsForAthlete,
    addCheckin,
    updateCheckin,
    deleteCheckin,
  };
}
