// =============================================
// HOOK CLOUD DATA - Load/Save from Lovable Cloud
// =============================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate, Json } from "@/integrations/supabase/types";

// Types DB from generated types
export type DbAthlete = Tables<"athletes">;
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
  weight_kg?: number | null;
  fat_pct?: number | null;
  pmax_5s?: number | null;
  metabolic_profile?: string | null;
  metabolic_score?: number | null;
  coach_notes?: string | null;
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
      setSnapshots((snapshotsRes.data as DbSnapshot[]) || []);
      setCheckins((checkinsRes.data as DbCheckin[]) || []);
    } catch (error: unknown) {
      console.error("Error loading data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ========== ATHLETES ==========
  const addAthlete = async (name: string, goal: string, refs: Json = {}, vo2max: number | null = null) => {
    if (!user) return null;
    const insertData: TablesInsert<"athletes"> = {
      coach_id: user.id,
      name,
      goal,
      refs,
      vo2max,
    };
    const { data, error } = await supabase
      .from("athletes")
      .insert(insertData)
      .select()
      .single();
    if (error) {
      toast.error("Erreur lors de l'ajout de l'athlète");
      console.error(error);
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
      console.error(error);
      return false;
    }
    setAthletes((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    return true;
  };

  const deleteAthlete = async (id: string) => {
    const { error } = await supabase.from("athletes").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
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
    const insertData: TablesInsert<"tests"> = {
      coach_id: user.id,
      athlete_id: athleteId,
      type,
      name,
      sport,
      reliability,
      vlamax,
      raw,
      note,
    };
    const { data, error } = await supabase
      .from("tests")
      .insert(insertData)
      .select()
      .single();
    if (error) {
      toast.error("Erreur lors de l'ajout du test");
      console.error(error);
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
      console.error(error);
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
      console.error(error);
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

  const addSnapshot = async (snapshot: Omit<DbSnapshot, "id" | "created_at" | "updated_at">) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("snapshots")
      .insert({ ...snapshot, coach_id: user.id })
      .select()
      .single();
    if (error) {
      toast.error("Erreur lors de l'ajout du snapshot");
      console.error(error);
      return null;
    }
    setSnapshots((prev) => [data as DbSnapshot, ...prev]);
    toast.success("Snapshot créé");
    return data as DbSnapshot;
  };

  const updateSnapshot = async (id: string, updates: Partial<DbSnapshot>) => {
    const { error } = await supabase.from("snapshots").update(updates).eq("id", id);
    if (error) {
      toast.error("Erreur lors de la mise à jour du snapshot");
      console.error(error);
      return false;
    }
    setSnapshots((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    toast.success("Snapshot mis à jour");
    return true;
  };

  const deleteSnapshot = async (id: string) => {
    const { error } = await supabase.from("snapshots").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
      return false;
    }
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
    toast.success("Snapshot supprimé");
    return true;
  };

  // ========== CHECKINS ==========
  const getCheckinsForAthlete = (athleteId: string) => {
    return checkins.filter((c) => c.athlete_id === athleteId);
  };

  const addCheckin = async (checkin: Omit<DbCheckin, "id" | "created_at" | "updated_at">) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("checkins")
      .insert({ ...checkin, coach_id: user.id })
      .select()
      .single();
    if (error) {
      toast.error("Erreur lors de l'ajout du check-in");
      console.error(error);
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
      console.error(error);
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
      console.error(error);
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
    getCheckinsForAthlete,
    addCheckin,
    updateCheckin,
    deleteCheckin,
  };
}
