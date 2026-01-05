// Page principale du Planner - Reverse Periodization (Life-First)

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { useAthletes } from '@/contexts/AthleteContext';
import { usePlanner } from '@/hooks/usePlanner';
import { RaceGoalForm } from '@/components/planner/RaceGoalForm';
import { RaceCountdown } from '@/components/planner/RaceCountdown';
import { PhaseBadge } from '@/components/planner/PhaseBadge';
import { LifeFirstCheckin } from '@/components/planner/LifeFirstCheckin';
import { TodayWorkoutCard } from '@/components/planner/TodayWorkoutCard';
import { PlannerCalendar } from '@/components/planner/PlannerCalendar';
import { calculateCurrentPhase } from '@/lib/plannerLogic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { RaceType, PHASE_CONFIGS } from '@/types/planner';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar,
  Target,
  Dumbbell,
  Settings,
  ArrowLeft,
  User,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PlannerPage() {
  const navigate = useNavigate();
  const { currentAthlete } = useAthletes();
  const athleteId = currentAthlete?.id || null;

  const {
    loading,
    raceGoal,
    trainingPlan,
    todayCheckin,
    saveRaceGoal,
    generateAndSavePlan,
    saveCheckin,
    updateWorkoutStatus,
  } = usePlanner(athleteId);

  const [activeTab, setActiveTab] = useState<'today' | 'calendar' | 'settings'>('today');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculer la phase actuelle et la séance du jour
  const { currentPhase, todayPlan, raceDate } = useMemo(() => {
    if (!raceGoal) {
      return { currentPhase: null, todayPlan: null, raceDate: null };
    }

    const raceDate = parseISO(raceGoal.race_date);
    const phase = calculateCurrentPhase(raceDate);
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayPlan = trainingPlan.find((p) => p.date === today) || null;

    return { currentPhase: phase, todayPlan, raceDate };
  }, [raceGoal, trainingPlan]);

  // Handler pour sauvegarder l'objectif et générer le plan
  const handleSaveGoal = async (
    raceDateStr: string,
    raceType: RaceType,
    raceName?: string,
    planStartDate?: string
  ) => {
    setIsSubmitting(true);
    try {
      const goal = await saveRaceGoal(raceDateStr, raceType, raceName, planStartDate);
      if (goal) {
        await generateAndSavePlan(raceDateStr, planStartDate);
        toast.success('Plan d\'entraînement généré avec succès !');
        setActiveTab('today');
      }
    } catch (error) {
      toast.error('Erreur lors de la génération du plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler pour le check-in
  const handleCheckin = async (
    stressScore: number,
    sleepQuality?: number,
    energyLevel?: number,
    notes?: string
  ) => {
    setIsSubmitting(true);
    try {
      await saveCheckin(stressScore, sleepQuality, energyLevel, notes);
      toast.success('Check-in enregistré !');
      if (stressScore > 7) {
        toast.info('Séance adaptée selon le principe Life-First', {
          duration: 5000,
        });
      }
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler pour marquer une séance
  const handleMarkDone = async (id: string) => {
    await updateWorkoutStatus(id, 'DONE');
    toast.success('Séance marquée comme terminée !');
  };

  const handleMarkSkipped = async (id: string) => {
    await updateWorkoutStatus(id, 'SKIPPED');
    toast.info('Séance sautée');
  };

  // Si pas d'athlète sélectionné
  if (!currentAthlete) {
    return (
      <AppLayout title="Planner" showBack>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">Aucun athlète sélectionné</h3>
            <p className="text-muted-foreground mb-4">
              Sélectionnez un athlète pour accéder au planner
            </p>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au dashboard
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Reverse Periodization Planner"
      subtitle={`${currentAthlete.name} • inspiré de principes d'entraînement endurance`}
      showBack
    >
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header avec compte à rebours et phase */}
          {raceGoal && raceDate && (
            <div className="space-y-3">
              <RaceCountdown
                raceDate={raceDate}
                raceName={raceGoal.race_name || undefined}
              />
              
              {currentPhase && currentPhase !== 'RACE' && (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Phase actuelle</p>
                        <PhaseBadge phase={currentPhase} size="lg" showFocus />
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Type</p>
                        <p className="font-medium">{raceGoal.race_type.toUpperCase()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Tabs de navigation */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="today" className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4" />
                <span className="hidden sm:inline">Aujourd'hui</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Calendrier</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Objectif</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Aujourd'hui */}
            <TabsContent value="today" className="space-y-4 mt-4">
              {!raceGoal ? (
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardContent className="py-8 text-center">
                    <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium mb-2">Configurez votre objectif</h3>
                    <p className="text-muted-foreground mb-4">
                      Définissez votre prochaine course pour générer un plan personnalisé
                    </p>
                    <Button onClick={() => setActiveTab('settings')}>
                      <Settings className="h-4 w-4 mr-2" />
                      Configurer
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Check-in du jour */}
                  {!todayCheckin ? (
                    <LifeFirstCheckin onSubmit={handleCheckin} isSubmitting={isSubmitting} />
                  ) : (
                    <Card className="border-green-500/50 bg-green-500/10">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-400" />
                          <div>
                            <p className="font-medium text-green-400">Check-in effectué</p>
                            <p className="text-sm text-muted-foreground">
                              Stress: {todayCheckin.stress_score}/10
                              {todayCheckin.stress_score > 7 && ' • Séance adaptée'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Séance du jour */}
                  <TodayWorkoutCard
                    planDay={todayPlan}
                    onMarkDone={handleMarkDone}
                    onMarkSkipped={handleMarkSkipped}
                    isLoading={isSubmitting}
                  />

                  {/* Alerte si pas de check-in */}
                  {!todayCheckin && todayPlan && (
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
                      <AlertCircle className="h-5 w-5 text-yellow-400 shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        Effectuez votre check-in Life-First avant de commencer votre séance
                      </p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Tab Calendrier */}
            <TabsContent value="calendar" className="mt-4">
              {trainingPlan.length > 0 ? (
                <PlannerCalendar
                  trainingPlan={trainingPlan}
                  raceDate={raceDate || undefined}
                />
              ) : (
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardContent className="py-8 text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      Aucun plan généré. Configurez d'abord votre objectif de course.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tab Settings */}
            <TabsContent value="settings" className="mt-4">
              <RaceGoalForm
                onSubmit={handleSaveGoal}
                isSubmitting={isSubmitting}
                existingGoal={raceGoal ? {
                  race_date: raceGoal.race_date,
                  race_type: raceGoal.race_type,
                  race_name: raceGoal.race_name,
                  plan_start_date: raceGoal.plan_start_date,
                } : undefined}
              />

              {raceGoal && (
                <Card className="mt-4 border-border/50 bg-card/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Plan actuel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Séances planifiées</p>
                        <p className="font-medium">
                          {trainingPlan.filter((p) => p.status === 'PLANNED').length}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Séances terminées</p>
                        <p className="font-medium text-green-400">
                          {trainingPlan.filter((p) => p.status === 'DONE').length}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Séances sautées</p>
                        <p className="font-medium text-gray-400">
                          {trainingPlan.filter((p) => p.status === 'SKIPPED').length}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Séances ajustées</p>
                        <p className="font-medium text-orange-400">
                          {trainingPlan.filter((p) => p.adjusted).length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </AppLayout>
  );
}
