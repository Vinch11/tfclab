// Hook pour gérer les données du Planner

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  WorkoutLibraryItem,
  AthleteRaceGoal,
  TrainingPlanDay,
  DailyCheckin,
  RaceType,
} from '@/types/planner';
import { generateTrainingPlan } from '@/lib/plannerLogic';
import { format, parseISO } from 'date-fns';

export function usePlanner(athleteId: string | null) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<WorkoutLibraryItem[]>([]);
  const [raceGoal, setRaceGoal] = useState<AthleteRaceGoal | null>(null);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlanDay[]>([]);
  const [todayCheckin, setTodayCheckin] = useState<DailyCheckin | null>(null);

  const coachId = user?.id;

  // Charger la bibliothèque de séances
  const loadWorkouts = useCallback(async () => {
    const { data, error } = await supabase
      .from('workouts_library')
      .select('*')
      .order('phase_tag', { ascending: true });

    if (!error && data) {
      setWorkouts(data as WorkoutLibraryItem[]);
    }
  }, []);

  // Charger l'objectif de course pour l'athlète
  const loadRaceGoal = useCallback(async () => {
    if (!athleteId || !coachId) return;

    const { data, error } = await supabase
      .from('athlete_race_goals')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('coach_id', coachId)
      .order('race_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!error) {
      setRaceGoal(data as AthleteRaceGoal | null);
    }
  }, [athleteId, coachId]);

  // Charger le plan d'entraînement
  const loadTrainingPlan = useCallback(async () => {
    if (!athleteId || !coachId) return;

    const { data, error } = await supabase
      .from('training_plan')
      .select(`
        *,
        workout:workouts_library(*)
      `)
      .eq('athlete_id', athleteId)
      .eq('coach_id', coachId)
      .order('date', { ascending: true });

    if (!error && data) {
      setTrainingPlan(data as TrainingPlanDay[]);
    }
  }, [athleteId, coachId]);

  // Charger le check-in du jour
  const loadTodayCheckin = useCallback(async () => {
    if (!athleteId || !coachId) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('coach_id', coachId)
      .eq('date', today)
      .maybeSingle();

    if (!error) {
      setTodayCheckin(data as DailyCheckin | null);
    }
  }, [athleteId, coachId]);

  // Sauvegarder un objectif de course
  const saveRaceGoal = async (
    raceDate: string,
    raceType: RaceType,
    raceName?: string,
    planStartDate?: string
  ) => {
    if (!athleteId || !coachId) return null;

    // Supprimer l'ancien objectif s'il existe
    if (raceGoal) {
      await supabase
        .from('athlete_race_goals')
        .delete()
        .eq('id', raceGoal.id);
    }

    const { data, error } = await supabase
      .from('athlete_race_goals')
      .insert({
        athlete_id: athleteId,
        coach_id: coachId,
        race_date: raceDate,
        race_type: raceType,
        race_name: raceName || null,
        plan_start_date: planStartDate || null,
      })
      .select()
      .single();

    if (!error && data) {
      setRaceGoal(data as AthleteRaceGoal);
      return data as AthleteRaceGoal;
    }
    return null;
  };

  // Générer et sauvegarder le plan
  const generateAndSavePlan = async (raceDate: string, startDate?: string) => {
    if (!athleteId || !coachId || workouts.length === 0) return;

    const start = startDate ? parseISO(startDate) : new Date();
    const race = parseISO(raceDate);

    // Supprimer l'ancien plan (seulement les PLANNED, garder DONE)
    await supabase
      .from('training_plan')
      .delete()
      .eq('athlete_id', athleteId)
      .eq('coach_id', coachId)
      .eq('status', 'PLANNED');

    // Générer le nouveau plan
    const plan = generateTrainingPlan(start, race, workouts, athleteId, coachId);

    if (plan.length > 0) {
      // Insérer par lots de 100
      for (let i = 0; i < plan.length; i += 100) {
        const batch = plan.slice(i, i + 100);
        await supabase.from('training_plan').insert(batch);
      }
    }

    await loadTrainingPlan();
  };

  // Sauvegarder un check-in
  const saveCheckin = async (stressScore: number, sleepQuality?: number, energyLevel?: number, notes?: string) => {
    if (!athleteId || !coachId) return null;

    const today = format(new Date(), 'yyyy-MM-dd');

    // Upsert le check-in
    const { data, error } = await supabase
      .from('daily_checkins')
      .upsert(
        {
          athlete_id: athleteId,
          coach_id: coachId,
          date: today,
          stress_score: stressScore,
          sleep_quality: sleepQuality || null,
          energy_level: energyLevel || null,
          notes: notes || null,
        },
        { onConflict: 'athlete_id,date' }
      )
      .select()
      .single();

    if (!error && data) {
      setTodayCheckin(data as DailyCheckin);

      // Si stress > 7, ajuster la séance du jour
      if (stressScore > 7) {
        await adjustTodayWorkout(today, stressScore);
      }

      return data as DailyCheckin;
    }
    return null;
  };

  // Ajuster la séance du jour pour stress élevé
  const adjustTodayWorkout = async (date: string, stressScore: number) => {
    if (!athleteId || !coachId) return;

    await supabase
      .from('training_plan')
      .update({
        adjusted: true,
        adjusted_reason: `Stress élevé (${stressScore}/10) - Life-First: séance adaptée en récupération active`,
        custom_workout_title: 'Endurance Z2 – Récupération active',
        custom_workout_description: 'Niveau de stress élevé détecté. Principe Life-First : on ne construit pas la performance sur un corps stressé. Séance adaptée à 45 minutes en zone 2 facile.',
        workout_id: null,
      })
      .eq('athlete_id', athleteId)
      .eq('coach_id', coachId)
      .eq('date', date);

    await loadTrainingPlan();
  };

  // Mettre à jour le statut d'une séance
  const updateWorkoutStatus = async (planId: string, status: 'DONE' | 'SKIPPED', notes?: string) => {
    const { error } = await supabase
      .from('training_plan')
      .update({ status, notes: notes || null })
      .eq('id', planId);

    if (!error) {
      await loadTrainingPlan();
    }
  };

  // Chargement initial
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await loadWorkouts();
      if (athleteId) {
        await Promise.all([loadRaceGoal(), loadTrainingPlan(), loadTodayCheckin()]);
      }
      setLoading(false);
    };
    loadAll();
  }, [athleteId, loadWorkouts, loadRaceGoal, loadTrainingPlan, loadTodayCheckin]);

  return {
    loading,
    workouts,
    raceGoal,
    trainingPlan,
    todayCheckin,
    saveRaceGoal,
    generateAndSavePlan,
    saveCheckin,
    updateWorkoutStatus,
    refreshPlan: loadTrainingPlan,
    refreshCheckin: loadTodayCheckin,
  };
}
