/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * USE ATHLETE RACE GOALS — Cloud persistence for athlete objectives
 * 
 * Manages athlete race goals with full CRUD:
 * - Add new race goals
 * - Update current goal
 * - Delete goals
 * - Restore previous goals
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ObjectifType } from "@/types/athlete";
import { deduceSportMainFromGoal, normalizeSportMain } from "@/lib/sportMainDeduction";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type RaceFormat = 'continuous' | 'lcw_3day';

export interface RaceGoal {
  id: string;
  athlete_id: string;
  coach_id: string;
  race_type: string;
  race_name: string | null;
  race_date: string;
  race_format: RaceFormat | null;
  plan_start_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddRaceGoalInput {
  athlete_id: string;
  race_type: string;
  race_name: string | null;
  race_date: string;
  race_format?: RaceFormat | null;
  plan_start_date: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useAthleteRaceGoals(athleteId: string | null) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH RACE GOALS
  // ═══════════════════════════════════════════════════════════════════════════

  const { data: raceGoals = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['athlete-race-goals', athleteId],
    queryFn: async () => {
      if (!athleteId) return [];
      
      const { data, error } = await supabase
        .from('athlete_race_goals')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('race_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching race goals:', error);
        throw error;
      }
      
      return data as RaceGoal[];
    },
    enabled: !!athleteId,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ADD RACE GOAL
  // ═══════════════════════════════════════════════════════════════════════════

  const addRaceGoal = useCallback(async (input: AddRaceGoalInput): Promise<RaceGoal | null> => {
    if (!athleteId) {
      toast.error("Aucun athlète sélectionné");
      return null;
    }

    setSaving(true);
    
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error("Non authentifié");
      }

      const { data, error } = await supabase
        .from('athlete_race_goals')
        .insert({
          athlete_id: input.athlete_id,
          coach_id: userData.user.id,
          race_type: input.race_type,
          race_name: input.race_name,
          race_date: input.race_date,
          race_format: input.race_format ?? null,
          plan_start_date: input.plan_start_date,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding race goal:', error);
        throw error;
      }

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['athlete-race-goals', athleteId] });
      
      return data as RaceGoal;
    } catch (error) {
      console.error('Error adding race goal:', error);
      toast.error("Erreur lors de l'ajout de l'objectif");
      return null;
    } finally {
      setSaving(false);
    }
  }, [athleteId, queryClient]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE RACE GOAL
  // ═══════════════════════════════════════════════════════════════════════════

  const deleteRaceGoal = useCallback(async (goalId: string): Promise<boolean> => {
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('athlete_race_goals')
        .delete()
        .eq('id', goalId);

      if (error) {
        console.error('Error deleting race goal:', error);
        throw error;
      }

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['athlete-race-goals', athleteId] });
      
      return true;
    } catch (error) {
      console.error('Error deleting race goal:', error);
      toast.error("Erreur lors de la suppression");
      return false;
    } finally {
      setSaving(false);
    }
  }, [athleteId, queryClient]);

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE ATHLETE GOAL (main goal field) + ADD TO HISTORY
  // ═══════════════════════════════════════════════════════════════════════════

  const updateAthleteGoal = useCallback(async (goal: ObjectifType, options?: { 
    raceName?: string; 
    raceDate?: string;
    raceFormat?: RaceFormat | null;
    skipHistory?: boolean;
  }): Promise<boolean> => {
    if (!athleteId) {
      toast.error("Aucun athlète sélectionné");
      return false;
    }

    setSaving(true);
    
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error("Non authentifié");
      }

      // 1. Update the athlete's current goal
      const { error } = await supabase
        .from('athletes')
        .update({ goal })
        .eq('id', athleteId);

      if (error) {
        console.error('Error updating athlete goal:', error);
        throw error;
      }

      // 1.b Auto-sync sport_main on the active snapshot if incoherent with the new goal.
      // Avoids the "Sport principal incohérent avec l'objectif" audit warning when a
      // coach changes objectif (e.g. IM → TrailMountain) without touching the snapshot.
      try {
        const deducedSport = deduceSportMainFromGoal(goal);
        if (deducedSport) {
          const { data: athleteRow } = await supabase
            .from('athletes')
            .select('active_snapshot_id')
            .eq('id', athleteId)
            .maybeSingle();
          const snapId = athleteRow?.active_snapshot_id;
          if (snapId) {
            const { data: snap } = await supabase
              .from('snapshots')
              .select('sport_main')
              .eq('id', snapId)
              .maybeSingle();
            const currentSport = normalizeSportMain(snap?.sport_main);
            if (currentSport !== deducedSport) {
              await supabase
                .from('snapshots')
                .update({ sport_main: deducedSport })
                .eq('id', snapId);
              queryClient.invalidateQueries({ queryKey: ['snapshots'] });
            }
          }
        }
      } catch (syncErr) {
        console.warn('[updateAthleteGoal] sport_main sync failed', syncErr);
      }

      // 2. Add to race goals history (unless skipped or already exists recently)
      if (!options?.skipHistory) {
        // Check if this goal type was already added in the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentSameGoal = raceGoals.find(
          g => g.race_type === goal && new Date(g.created_at) > sevenDaysAgo
        );

        const hasExplicitDetails =
          options?.raceName !== undefined ||
          options?.raceDate !== undefined ||
          options?.raceFormat !== undefined;

        if (recentSameGoal && hasExplicitDetails) {
          // UPDATE existing recent goal with explicitly provided fields
          // (sinon, re-sélectionner le même objectif avec un nouveau format
          //  laissait race_format=null en base — bug iPhone Cath LCW)
          const patch: Record<string, unknown> = {};
          if (options?.raceName !== undefined) patch.race_name = options.raceName ?? null;
          if (options?.raceDate !== undefined) patch.race_date = options.raceDate;
          if (options?.raceFormat !== undefined) patch.race_format = options.raceFormat ?? null;
          if (Object.keys(patch).length > 0) {
            await supabase
              .from('athlete_race_goals')
              .update(patch as any)
              .eq('id', recentSameGoal.id);
            queryClient.invalidateQueries({ queryKey: ['athlete-race-goals', athleteId] });
          }
        } else if (!recentSameGoal) {
          // Default race date is 3 months from now if not specified
          const defaultRaceDate = new Date();
          defaultRaceDate.setMonth(defaultRaceDate.getMonth() + 3);
          
          await supabase
            .from('athlete_race_goals')
            .insert({
              athlete_id: athleteId,
              coach_id: userData.user.id,
              race_type: goal,
              race_name: options?.raceName ?? null,
              race_date: options?.raceDate ?? defaultRaceDate.toISOString().split('T')[0],
              race_format: options?.raceFormat ?? null,
              plan_start_date: new Date().toISOString().split('T')[0],
            });
          
          // Invalidate race goals cache
          queryClient.invalidateQueries({ queryKey: ['athlete-race-goals', athleteId] });
        }
      }

      // Invalidate athlete cache
      queryClient.invalidateQueries({ queryKey: ['cloud-data'] });
      
      toast.success(`Objectif mis à jour: ${goal}`);
      return true;
    } catch (error) {
      console.error('Error updating athlete goal:', error);
      toast.error("Erreur lors de la mise à jour de l'objectif");
      return false;
    } finally {
      setSaving(false);
    }
  }, [athleteId, queryClient, raceGoals]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RESTORE RACE GOAL (set as current)
  // ═══════════════════════════════════════════════════════════════════════════

  const restoreRaceGoal = useCallback(async (goal: RaceGoal): Promise<boolean> => {
    // Simply update the athlete's current goal to match this race goal
    return updateAthleteGoal(goal.race_type as ObjectifType);
  }, [updateAthleteGoal]);

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE RACE GOAL DATE
  // ═══════════════════════════════════════════════════════════════════════════

  const updateRaceGoalDate = useCallback(async (goalId: string, newDate: string): Promise<void> => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('athlete_race_goals')
        .update({ race_date: newDate })
        .eq('id', goalId);

      if (error) {
        console.error('Error updating race goal date:', error);
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['athlete-race-goals', athleteId] });
    } catch (error) {
      console.error('Error updating race goal date:', error);
      toast.error("Erreur lors de la mise à jour de la date");
      throw error;
    } finally {
      setSaving(false);
    }
  }, [athleteId, queryClient]);

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE RACE FORMAT (continuous ↔ lcw_3day) — réversible
  // ═══════════════════════════════════════════════════════════════════════════

  const updateRaceGoalFormat = useCallback(async (goalId: string, format: RaceFormat): Promise<void> => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('athlete_race_goals')
        .update({ race_format: format })
        .eq('id', goalId);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['athlete-race-goals', athleteId] });
    } catch (error) {
      console.error('Error updating race goal format:', error);
      toast.error("Erreur lors de la mise à jour du format de course");
      throw error;
    } finally {
      setSaving(false);
    }
  }, [athleteId, queryClient]);


  // ═══════════════════════════════════════════════════════════════════════════
  // GET HISTORY (unique previous objectives)
  // ═══════════════════════════════════════════════════════════════════════════

  const previousObjectifs = useMemo(() => {
    return [...new Set(raceGoals.map(g => g.race_type as ObjectifType))];
  }, [raceGoals]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Data
    raceGoals,
    previousObjectifs,
    
    // Operations
    addRaceGoal,
    deleteRaceGoal,
    updateAthleteGoal,
    restoreRaceGoal,
    updateRaceGoalDate,
    updateRaceGoalFormat,

    refetch,
    
    // State
    loading,
    saving,
  };
}
