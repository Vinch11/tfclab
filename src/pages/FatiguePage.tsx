/**
 * FatiguePage – Page dédiée au suivi de fatigue et récupération
 * Tableau de bord complet avec tous les indicateurs TFCL
 */

import { useState, useMemo } from "react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudData } from "@/hooks/useCloudData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DisponibiliteTFCLCard } from "@/components/DisponibiliteTFCLCard";
import { TFCLDailyReadinessCheck } from "@/components/TFCLDailyReadinessCheck";
import { FatigueV2Card } from "@/components/FatigueV2Card";
import { ChargeRecenteCard } from "@/components/ChargeRecenteCard";
import { ChargeInputCard } from "@/components/ChargeInputCard";
import { 
  Battery, 
  Target, 
  Activity, 
  TrendingUp, 
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  LineChart,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computeFatigueV2 } from "@/lib/v2/fatigueV2";
import { computeCRR } from "@/lib/chargeRecenteReference";
import type { TFCLReadinessInput, DisponibiliteTFCL } from "@/lib/v2/disponibiliteTFCL";
import type { DbCheckin, DbSnapshot } from "@/hooks/useCloudData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function FatiguePage() {
  const { athletes, selectedAthleteId, setSelectedAthleteId, currentAthlete } = useAthletes();
  const { checkins, snapshots, addCheckin, updateCheckin, updateSnapshot } = useCloudData();
  const [staffMode, setStaffMode] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Récupérer le snapshot actif de l'athlète sélectionné
  const activeSnapshot = useMemo<DbSnapshot | null>(() => {
    if (!currentAthlete || !currentAthlete.active_snapshot_id) return null;
    return snapshots.find(s => s.id === currentAthlete.active_snapshot_id) || null;
  }, [currentAthlete, snapshots]);

  // Récupérer les check-ins triés par date
  const sortedCheckins = useMemo(() => {
    if (!checkins || !selectedAthleteId) return [];
    return checkins
      .filter(c => c.athlete_id === selectedAthleteId)
      .sort((a, b) => new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime());
  }, [checkins, selectedAthleteId]);

  const latestCheckin = sortedCheckins[0] || null;
  const previousCheckin = sortedCheckins[1] || null;

  // Calculer la fatigue V2
  const fatigueV2 = useMemo(() => {
    if (!activeSnapshot) return null;
    return computeFatigueV2({
      tss7d: activeSnapshot.tss_7d ?? null,
      tssTarget: 450,
      tssTrend: null,
      tteEffectif: activeSnapshot.tte_observed_min ?? null,
      tteTarget: 50,
      tteStability: null,
      raceReadinessFreshness: null,
      checkinFatigue: latestCheckin?.fatigue ?? null,
      checkinStress: latestCheckin?.stress ?? null,
      sleepQuality: latestCheckin?.sleep ?? null,
    });
  }, [activeSnapshot, latestCheckin]);

  // Calculer CRR
  const crr = useMemo(() => {
    return computeCRR({
      tss7d: activeSnapshot?.tss_7d ?? null,
      snapshotDate: activeSnapshot?.date ?? null,
      snapshotUpdatedAt: activeSnapshot?.updated_at ?? null,
    });
  }, [activeSnapshot]);

  // Objectif de l'athlète
  const objectif = useMemo(() => {
    return currentAthlete?.goal ?? "703";
  }, [currentAthlete]);

  // Données objectives pour le calcul de disponibilité
  const objectiveData: TFCLReadinessInput['objective'] = useMemo(() => ({
    tss7d: activeSnapshot?.tss_7d ?? null,
    rhrDeviation: null,
    hrvRmssd: null,
  }), [activeSnapshot]);

  // Handler pour enregistrer un check-in
  const handleCheckinSubmit = async (input: TFCLReadinessInput, result: DisponibiliteTFCL) => {
    if (!selectedAthleteId) return;
    
    const today = new Date().toISOString().split('T')[0];
    const existingCheckin = sortedCheckins.find(c => c.date_iso === today);
    
    if (existingCheckin) {
      // Mettre à jour le check-in existant
      await updateCheckin(existingCheckin.id, {
        sleep: input.sleep,
        fatigue: input.fatigue,
        soreness: input.soreness,
        stress: input.stress,
        motivation: input.motivation,
        pain_flag: input.alerts?.asymmetric_pain || input.alerts?.joint_pain || false,
        readiness: result.score,
      });
    } else {
      // Créer un nouveau check-in
      await addCheckin({
        athlete_id: selectedAthleteId,
        coach_id: '', // sera rempli par useCloudData
        date_iso: today,
        sleep: input.sleep,
        fatigue: input.fatigue,
        soreness: input.soreness,
        stress: input.stress,
        motivation: input.motivation,
        pain_flag: input.alerts?.asymmetric_pain || input.alerts?.joint_pain || false,
        readiness: result.score,
      });
    }
  };

  // Stats rapides
  const quickStats = useMemo(() => {
    const last7Checkins = sortedCheckins.slice(0, 7);
    const avgReadiness = last7Checkins.length > 0
      ? Math.round(last7Checkins.reduce((sum, c) => sum + (c.readiness ?? 0), 0) / last7Checkins.length)
      : null;
    
    const avgSleep = last7Checkins.length > 0
      ? (last7Checkins.reduce((sum, c) => sum + (c.sleep ?? 0), 0) / last7Checkins.length).toFixed(1)
      : null;
    
    const painDays = last7Checkins.filter(c => c.pain_flag).length;
    
    return { avgReadiness, avgSleep, painDays, checkinCount: last7Checkins.length };
  }, [sortedCheckins]);

  return (
    <SidebarLayout
      activeTab="fatigue"
      onTabChange={() => {}}
      staffMode={staffMode}
      onStaffModeChange={setStaffMode}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Battery className="h-6 w-6 text-primary" />
              Fatigue et Gestion
            </h1>
            <p className="text-muted-foreground text-sm">
              Suivi de la charge, fatigue et disponibilité
            </p>
          </div>
          
          {/* Athlete Selector Inline */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedAthleteId || ""} onValueChange={setSelectedAthleteId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sélectionner un athlète" />
              </SelectTrigger>
              <SelectContent>
                {athletes.map((athlete) => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    {athlete.nom || athlete.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!selectedAthleteId ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Sélectionne un athlète pour voir son suivi de fatigue
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Target className="h-4 w-4" />
                    <span className="text-xs font-medium">Disponibilité moy.</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {quickStats.avgReadiness ?? '—'}
                    <span className="text-sm font-normal text-muted-foreground">/100</span>
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-secondary/30 to-secondary/10 border-secondary/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-secondary-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">Sommeil moy.</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {quickStats.avgSleep ?? '—'}
                    <span className="text-sm font-normal text-muted-foreground">/10</span>
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-destructive mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-medium">Jours douleur</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {quickStats.painDays}
                    <span className="text-sm font-normal text-muted-foreground">/7j</span>
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-accent/30 to-accent/10 border-accent/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-accent-foreground mb-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-medium">Check-ins</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {quickStats.checkinCount}
                    <span className="text-sm font-normal text-muted-foreground">/7j</span>
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Vue d'ensemble
                </TabsTrigger>
                <TabsTrigger value="checkin" className="gap-2">
                  <Target className="h-4 w-4" />
                  Check-in du jour
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <LineChart className="h-4 w-4" />
                  Historique
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Disponibilité TFCL */}
                  <DisponibiliteTFCLCard
                    latestCheckin={latestCheckin}
                    previousCheckin={previousCheckin}
                    objectiveData={objectiveData}
                    showDetails={staffMode}
                    showTrend={true}
                  />

                  {/* Fatigue V2 */}
                  {fatigueV2 && (
                    <FatigueV2Card data={fatigueV2} showDetails={staffMode} />
                  )}
                </div>

                {/* Saisie Charge + Charge récente */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Carte de saisie de la charge */}
                  <ChargeInputCard
                    athleteId={selectedAthleteId}
                    athleteName={currentAthlete?.nom || currentAthlete?.name || "Athlète"}
                    currentTss7d={activeSnapshot?.tss_7d ?? null}
                    targetTss={objectif === "IM" ? 550 : objectif === "Marathon" ? 450 : 400}
                    objectif={objectif}
                    onSave={async (tss7d) => {
                      if (activeSnapshot) {
                        await updateSnapshot(activeSnapshot.id, { tss_7d: tss7d });
                      }
                    }}
                  />

                  {/* Charge récente (lecture) */}
                  <ChargeRecenteCard
                    crr={crr}
                    objectif={objectif}
                    staffMode={staffMode}
                  />

                  {/* Synthèse Disponibilité */}
                  {latestCheckin && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Activity className="h-4 w-4 text-primary" />
                          État actuel
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Synthèse Fatigue × Disponibilité
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Disponibilité</span>
                          <Badge variant="outline" className="font-mono">
                            {latestCheckin.readiness ?? '—'}/100
                          </Badge>
                        </div>
                        {fatigueV2 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Fatigue</span>
                            <Badge variant="outline" className="font-mono">
                              {fatigueV2.score}% ({fatigueV2.levelLabel})
                            </Badge>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Charge 7j</span>
                          <Badge variant="secondary">
                            {crr.value ?? '—'} TSS
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Check-in Tab */}
              <TabsContent value="checkin" className="mt-6">
                <div className="max-w-2xl mx-auto">
                  <TFCLDailyReadinessCheck
                    athleteId={selectedAthleteId}
                    athleteName={currentAthlete?.nom || currentAthlete?.name || "Athlète"}
                    objectiveData={objectiveData}
                    onSubmit={handleCheckinSubmit}
                    showStaffAlerts={staffMode}
                  />
                </div>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="mt-6 space-y-6">
                {/* Recent Check-ins Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Historique des check-ins
                    </CardTitle>
                    <CardDescription>
                      Tendance sur les 14 derniers jours
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {sortedCheckins.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Aucun check-in enregistré
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {sortedCheckins.slice(0, 14).map((checkin) => (
                          <CheckinRow key={checkin.id} checkin={checkin} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Trend Summary */}
                {sortedCheckins.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Tendances
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                        <MetricTrend 
                          label="Sommeil" 
                          emoji="🌙" 
                          values={sortedCheckins.slice(0, 7).map(c => c.sleep)} 
                        />
                        <MetricTrend 
                          label="Fatigue" 
                          emoji="⚡" 
                          values={sortedCheckins.slice(0, 7).map(c => c.fatigue)} 
                          inverted
                        />
                        <MetricTrend 
                          label="Douleurs" 
                          emoji="💪" 
                          values={sortedCheckins.slice(0, 7).map(c => c.soreness)} 
                          inverted
                        />
                        <MetricTrend 
                          label="Stress" 
                          emoji="🧠" 
                          values={sortedCheckins.slice(0, 7).map(c => c.stress)} 
                          inverted
                        />
                        <MetricTrend 
                          label="Motivation" 
                          emoji="🔥" 
                          values={sortedCheckins.slice(0, 7).map(c => c.motivation)} 
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </SidebarLayout>
  );
}

// Composant pour une ligne de check-in
function CheckinRow({ checkin }: { checkin: DbCheckin }) {
  const date = new Date(checkin.date_iso);
  const formattedDate = date.toLocaleDateString('fr-FR', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  });

  const readinessColor = 
    (checkin.readiness ?? 0) >= 75 ? 'text-green-600 bg-green-500/10' :
    (checkin.readiness ?? 0) >= 50 ? 'text-yellow-600 bg-yellow-500/10' :
    (checkin.readiness ?? 0) >= 25 ? 'text-orange-600 bg-orange-500/10' :
    'text-red-600 bg-red-500/10';

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium w-24">{formattedDate}</span>
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span title="Sommeil">🌙 {checkin.sleep ?? '—'}</span>
          <span title="Fatigue">⚡ {checkin.fatigue ?? '—'}</span>
          <span title="Douleurs">💪 {checkin.soreness ?? '—'}</span>
          <span title="Stress">🧠 {checkin.stress ?? '—'}</span>
          <span title="Motivation">🔥 {checkin.motivation ?? '—'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {checkin.pain_flag && (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Douleur
          </Badge>
        )}
        <Badge className={cn("text-xs font-semibold", readinessColor)}>
          {checkin.readiness ?? '—'}/100
        </Badge>
      </div>
    </div>
  );
}

// Composant pour afficher une tendance de métrique
function MetricTrend({ 
  label, 
  emoji, 
  values, 
  inverted = false 
}: { 
  label: string; 
  emoji: string; 
  values: (number | null | undefined)[]; 
  inverted?: boolean;
}) {
  const validValues = values.filter((v): v is number => v != null);
  if (validValues.length === 0) {
    return (
      <div className="p-2 rounded-lg bg-muted/30">
        <div className="text-lg">{emoji}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">—</div>
      </div>
    );
  }
  
  const avg = validValues.reduce((a, b) => a + b, 0) / validValues.length;
  const trend = validValues.length >= 2 
    ? validValues[0] - validValues[validValues.length - 1]
    : 0;
  
  const trendPositive = inverted ? trend < 0 : trend > 0;
  const trendIcon = Math.abs(trend) < 0.5 ? '→' : trendPositive ? '↑' : '↓';
  const trendColor = Math.abs(trend) < 0.5 
    ? 'text-muted-foreground' 
    : trendPositive ? 'text-green-600' : 'text-red-600';
  
  return (
    <div className="p-2 rounded-lg bg-muted/30">
      <div className="text-lg">{emoji}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium flex items-center justify-center gap-1">
        {avg.toFixed(1)}
        <span className={cn("text-xs", trendColor)}>{trendIcon}</span>
      </div>
    </div>
  );
}
