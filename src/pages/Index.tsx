import { useState, useEffect, useMemo } from "react";
import { Navigation } from "@/components/Navigation";
import { MetricCard } from "@/components/MetricCard";
import { VLamaxCalculator } from "@/components/VLamaxCalculator";
import { TrainingZones } from "@/components/TrainingZones";
import { TestProtocols } from "@/components/TestProtocols";
import { VLamaxTestingPage } from "@/components/VLamaxTestingPage";
import { RaceChecklist } from "@/components/RaceChecklist";
import { NolioMapping } from "@/components/NolioMapping";
import { AthleteProfile } from "@/components/AthleteProfile";
import { FeedbackNolioManager } from "@/components/FeedbackNolioManager";
import { DanLorangAnalysis } from "@/components/DanLorangAnalysis";
import { TestComparison } from "@/components/TestComparison";
import { SemaineTypeView } from "@/components/SemaineTypeView";
import { RaceReadinessCard } from "@/components/RaceReadinessCard";
import { Bloc3SemainesView } from "@/components/Bloc3SemainesView";
import { PhysiologicalAnalysis } from "@/components/PhysiologicalAnalysis";
import { Planificateur } from "@/components/Planificateur";
import { WorkoutLibrary } from "@/components/WorkoutLibrary";
import { MonitoringDashboard } from "@/components/MonitoringDashboard";
import { ExportTools } from "@/components/ExportTools";
import { SnapshotManager } from "@/components/SnapshotManager";
import { CheckinManager } from "@/components/CheckinManager";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import {
  Zap,
  Target,
  Flame,
  Activity,
  BookOpen,
  Brain,
  Calendar,
  Dumbbell,
  TrendingUp,
  Plus,
  Trash2,
  LogOut,
  Loader2,
  User,
  Camera,
  ClipboardCheck,
} from "lucide-react";

import logo2fc from "@/assets/logo-2fc.png";
import { useAuth } from "@/contexts/AuthContext";
import { useCloudData, DbAthlete, DbSnapshot } from "@/hooks/useCloudData";
import { FeedbackNolio } from "@/types/feedbackNolio";
import { toast } from "sonner";

// ✅ Legacy types/helpers (utilisés par tes composants actuels)
import { getDernierSnapshot } from "@/types/athlete";
import { computeVLamaxEffectif, VLamaxEffectif } from "@/lib/vlamaxEffectif";

// ✅ TTE EFFECTIF - Source unique de vérité
import { computeTTEEffectif, TTEEffectif, getSourceLabel } from "@/lib/tteEffectif";

const Index = () => {
  const { user, signOut } = useAuth();

  // ✅ IMPORTANT: on récupère aussi snapshots + tests
  const { athletes, snapshots, tests, loading, addAthlete, updateAthlete, deleteAthlete } = useCloudData();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [showTestLibrary, setShowTestLibrary] = useState(false);
  const [showPhysioAnalysis, setShowPhysioAnalysis] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [showWorkoutLibrary, setShowWorkoutLibrary] = useState(false);
  const [showMonitoring, setShowMonitoring] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showCheckins, setShowCheckins] = useState(false);

  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAthleteName, setNewAthleteName] = useState("");
  const [newAthleteGoal, setNewAthleteGoal] = useState("IM");

  // Feedbacks (localStorage pour l'instant)
  const [feedbacksNolio, setFeedbacksNolio] = useState<FeedbackNolio[]>(() => {
    const saved = localStorage.getItem("loranglab-feedbacks");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // ============================================
  // ✅ FIX 3A — ne jamais setState dans le render
  // ============================================
  useEffect(() => {
    if (!loading && athletes.length > 0 && !selectedAthleteId) {
      setSelectedAthleteId(athletes[0].id);
    }
  }, [loading, athletes, selectedAthleteId]);

  const currentAthlete = useMemo(
    () => athletes.find((a) => a.id === selectedAthleteId) || null,
    [athletes, selectedAthleteId],
  );

  // ============================================
  // ✅ FIX 3B — Snapshot "effectif" (actif sinon dernier)
  // ============================================
  const pickEffectiveSnapshot = (athleteId: string, activeSnapshotId?: string | null): DbSnapshot | null => {
    const list = (snapshots || []).filter((s) => s.athlete_id === athleteId);
    if (list.length === 0) return null;

    if (activeSnapshotId) {
      const active = list.find((s) => s.id === activeSnapshotId);
      if (active) return active;
    }

    // Dernier par date
    return [...list].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  };

  // ============================================
  // ✅ FIX 3C — Convert DbAthlete -> Athlete "legacy" + historique depuis snapshot cloud
  //     + IMPORTANT: map TSS_7d -> tss_7j (compat legacy)
  // ============================================
  const convertToLegacyAthlete = (dbAthlete: DbAthlete) => {
    const refs = (dbAthlete.refs || {}) as Record<string, unknown>;
    const effective = pickEffectiveSnapshot(dbAthlete.id, dbAthlete.active_snapshot_id);

    // Snapshot compat (format SnapshotNolio minimal) pour alimenter tes composants existants
    const legacySnapshot = effective
      ? ({
          id: effective.id,
          date: effective.date,
          sport: "vélo",
          poids: effective.weight_kg ?? 70,
          ftp: effective.ftp ?? 0,
          pmax_5s: effective.pmax_5s ?? undefined,

          // ✅ KEY: tu veux tss_7d -> on le remonte ici pour que tes composants legacy lisent un TSS réel
          // (ils attendent tss_7j, on garde le champ legacy)
          tss_7j: effective.tss_7d ?? 0,

          vo2max: effective.vo2max ?? undefined,
          vma: effective.vma ?? undefined,
          css: effective.css ?? undefined,
          source: (effective.source as any) ?? "manual",

          // (optionnel) on passe aussi les champs PRO si tu veux les exploiter plus tard
          tte_mode: effective.tte_mode ?? undefined,
          tte_observed_min: effective.tte_observed_min ?? undefined,
        } as any)
      : null;

    return {
      id: dbAthlete.id,
      nom: dbAthlete.name,
      sexe: (refs.sexe as "M" | "F") || "M",
      objectif: (dbAthlete.goal as any) || "IM",
      masse_grasse: (refs.masse_grasse as number) || 18,
      historique: legacySnapshot ? [legacySnapshot] : [],
      tests: [],
      refs: {
        fcMax: (refs.fcMax as number) || null,
        vma: (refs.vma as number) || null,
        ftp: (refs.ftp as number) || null,
        css: (refs.css as number) || null,
      },
      vo2max: dbAthlete.vo2max || undefined,
    };
  };

  const legacyAthlete = useMemo(() => {
    if (!currentAthlete) return null;
    return convertToLegacyAthlete(currentAthlete);
  }, [currentAthlete, snapshots]);

  // ============================================
  // ✅ FIX 3B (suite) — métriques dashboard basées sur snapshot cloud, plus mock
  //     + TTE PRO (2 modules) -> redevient pertinent
  // ============================================
  const snapshotLegacy = legacyAthlete ? (getDernierSnapshot(legacyAthlete) as any) : null;

  // On reprend aussi le snapshot cloud effectif pour calculs PRO fiables
  const effectiveCloudSnapshot = useMemo(() => {
    if (!currentAthlete) return null;
    return pickEffectiveSnapshot(currentAthlete.id, currentAthlete.active_snapshot_id);
  }, [currentAthlete, snapshots]);

  // ✅ VLamax EFFECTIF - Source unique de vérité (utilise données Cloud)
  const vlamaxEffectif = useMemo<VLamaxEffectif>(() => {
    if (!currentAthlete) {
      return { value: null, source: "unknown", confidence: 0, label: "VLamax (non disponible)" };
    }
    return computeVLamaxEffectif({
      athleteId: currentAthlete.id,
      objectif: currentAthlete.goal || "IM",
      activeSnapshotId: currentAthlete.active_snapshot_id,
      tests: tests.map(t => ({
        athlete_id: t.athlete_id,
        vlamax: t.vlamax,
        date: t.date,
      })),
      snapshots: snapshots.map(s => ({
        id: s.id,
        athlete_id: s.athlete_id,
        date: s.date,
        vlamax: s.vlamax,
        ftp: s.ftp,
        pmax_5s: s.pmax_5s,
        weight_kg: s.weight_kg,
      })),
    });
  }, [currentAthlete, tests, snapshots]);

  const vlamax = vlamaxEffectif.value ?? 0;

  const ftp = useMemo(() => {
    if (!legacyAthlete) return 0;
    // priorité: snapshot ftp sinon refs ftp
    return (snapshotLegacy?.ftp || legacyAthlete.refs?.ftp || 0) as number;
  }, [legacyAthlete, snapshotLegacy]);

  const poids = useMemo(() => (snapshotLegacy?.poids || 70) as number, [snapshotLegacy]);
  const ftp_kg = useMemo(() => (poids > 0 ? ftp / poids : 0), [ftp, poids]);

  // ✅ TTE EFFECTIF - Source unique de vérité
  const tteEffectif = useMemo<TTEEffectif>(() => {
    if (!effectiveCloudSnapshot || !currentAthlete) {
      return {
        tte_min: 45,
        source: "unknown",
        confidence: 0,
        label: "TTE (non disponible)",
        target: 45,
        status: "warning",
        status_message: "Aucune donnée"
      };
    }
    return computeTTEEffectif({
      ftp: effectiveCloudSnapshot.ftp ?? null,
      tss_7d: effectiveCloudSnapshot.tss_7d ?? null,
      tte_mode: effectiveCloudSnapshot.tte_mode ?? "LOAD",
      tte_observed_min: effectiveCloudSnapshot.tte_observed_min ?? null,
      objectif: currentAthlete.goal || "IM",
    });
  }, [effectiveCloudSnapshot, currentAthlete]);

  // ✅ Valeur TTE affichée partout (Index) - fallback 0 pour compatibilité
  const tte = useMemo(() => {
    return tteEffectif?.tte_min ?? 0;
  }, [tteEffectif]);

  // Handlers
  const handleAddAthlete = async () => {
    if (!newAthleteName.trim()) {
      toast.error("Nom requis");
      return;
    }
    const athlete = await addAthlete(newAthleteName.trim(), newAthleteGoal, {});
    if (athlete) {
      setSelectedAthleteId(athlete.id);
      setNewAthleteName("");
      setNewAthleteGoal("IM");
      setIsAddDialogOpen(false);
    }
  };

  const handleDeleteAthlete = async () => {
    if (!currentAthlete) return;
    const confirmed = confirm(`Supprimer ${currentAthlete.name} ?`);
    if (!confirmed) return;

    await deleteAthlete(currentAthlete.id);

    // reselect proprement
    const remaining = athletes.filter((a) => a.id !== currentAthlete.id);
    setSelectedAthleteId(remaining[0]?.id || null);
  };

  const handleFeedbacksChange = (feedbacks: FeedbackNolio[]) => {
    setFeedbacksNolio(feedbacks);
    localStorage.setItem("loranglab-feedbacks", JSON.stringify(feedbacks));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des données...</p>
        </div>
      </div>
    );
  }

  const renderAthleteSelector = () => (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Athlète
          </CardTitle>
          <div className="flex items-center gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvel athlète</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium">Nom</label>
                    <Input
                      value={newAthleteName}
                      onChange={(e) => setNewAthleteName(e.target.value)}
                      placeholder="Nom de l'athlète"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Objectif</label>
                    <Select value={newAthleteGoal} onValueChange={setNewAthleteGoal}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IM">Ironman</SelectItem>
                        <SelectItem value="703">70.3 / Half</SelectItem>
                        <SelectItem value="Marathon">Marathon</SelectItem>
                        <SelectItem value="Semi">Semi-Marathon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddAthlete} className="w-full">
                    Créer l'athlète
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {athletes.length > 0 && (
              <Button size="sm" variant="ghost" onClick={handleDeleteAthlete}>
                <Trash2 className="h-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {athletes.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucun athlète. Cliquez sur Ajouter pour commencer.</p>
        ) : (
          <Select value={selectedAthleteId || ""} onValueChange={setSelectedAthleteId}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un athlète" />
            </SelectTrigger>
            <SelectContent>
              {athletes.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} ({a.goal || "IM"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    if (!legacyAthlete || athletes.length === 0) {
      return (
        <div className="space-y-8 animate-fade-in">
          <Card className="border-dashed border-2 border-primary/20">
            <CardContent className="py-16 text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Aucun athlète</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Crée un athlète pour commencer à utiliser Vince’s Lab.
                </p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Créer mon premier athlète
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nouvel athlète</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="text-sm font-medium">Nom</label>
                      <Input
                        value={newAthleteName}
                        onChange={(e) => setNewAthleteName(e.target.value)}
                        placeholder="Nom de l'athlète"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Objectif</label>
                      <Select value={newAthleteGoal} onValueChange={setNewAthleteGoal}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IM">Ironman</SelectItem>
                          <SelectItem value="703">70.3 / Half</SelectItem>
                          <SelectItem value="Marathon">Marathon</SelectItem>
                          <SelectItem value="Semi">Semi-Marathon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddAthlete} className="w-full">
                      Créer l'athlète
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-8 animate-fade-in">
            {renderAthleteSelector()}

            {/* Boutons */}
            <div className="flex flex-wrap gap-3">
              <Button
                variant={showTestLibrary ? "default" : "outline"}
                onClick={() => {
                  setShowTestLibrary(!showTestLibrary);
                  setShowPhysioAnalysis(false);
                  setShowPlanner(false);
                  setShowWorkoutLibrary(false);
                  setShowMonitoring(false);
                  setShowSnapshots(false);
                  setShowCheckins(false);
                }}
                className="flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                📚 Tests
              </Button>

              <Button
                variant={showPhysioAnalysis ? "default" : "outline"}
                onClick={() => {
                  setShowPhysioAnalysis(!showPhysioAnalysis);
                  setShowTestLibrary(false);
                  setShowPlanner(false);
                  setShowWorkoutLibrary(false);
                  setShowMonitoring(false);
                  setShowSnapshots(false);
                  setShowCheckins(false);
                }}
                className="flex items-center gap-2"
              >
                <Brain className="h-4 w-4" />
                🧠 Analyse Physio
              </Button>

              <Button
                variant={showPlanner ? "default" : "outline"}
                onClick={() => {
                  setShowPlanner(!showPlanner);
                  setShowTestLibrary(false);
                  setShowPhysioAnalysis(false);
                  setShowWorkoutLibrary(false);
                  setShowMonitoring(false);
                  setShowSnapshots(false);
                  setShowCheckins(false);
                }}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                📅 Planificateur
              </Button>

              <Button
                variant={showWorkoutLibrary ? "default" : "outline"}
                onClick={() => {
                  setShowWorkoutLibrary(!showWorkoutLibrary);
                  setShowTestLibrary(false);
                  setShowPhysioAnalysis(false);
                  setShowPlanner(false);
                  setShowMonitoring(false);
                  setShowSnapshots(false);
                  setShowCheckins(false);
                }}
                className="flex items-center gap-2"
              >
                <Dumbbell className="h-4 w-4" />
                🏋️ Séances
              </Button>

              <Button
                variant={showMonitoring ? "default" : "outline"}
                onClick={() => {
                  setShowMonitoring(!showMonitoring);
                  setShowTestLibrary(false);
                  setShowPhysioAnalysis(false);
                  setShowPlanner(false);
                  setShowWorkoutLibrary(false);
                  setShowSnapshots(false);
                  setShowCheckins(false);
                }}
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                📈 Suivi
              </Button>

              <Button
                variant={showSnapshots ? "default" : "outline"}
                onClick={() => {
                  setShowSnapshots(!showSnapshots);
                  setShowTestLibrary(false);
                  setShowPhysioAnalysis(false);
                  setShowPlanner(false);
                  setShowWorkoutLibrary(false);
                  setShowMonitoring(false);
                  setShowCheckins(false);
                }}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                📸 Snapshots
              </Button>

              <Button
                variant={showCheckins ? "default" : "outline"}
                onClick={() => {
                  setShowCheckins(!showCheckins);
                  setShowTestLibrary(false);
                  setShowPhysioAnalysis(false);
                  setShowPlanner(false);
                  setShowWorkoutLibrary(false);
                  setShowMonitoring(false);
                  setShowSnapshots(false);
                }}
                className="flex items-center gap-2"
              >
                <ClipboardCheck className="h-4 w-4" />✅ Check-ins
              </Button>

              <ExportTools athlete={legacyAthlete} />
            </div>

            {/* Contenu conditionnel */}
            {showTestLibrary && <TestProtocols athlete={legacyAthlete} />}
            {showPhysioAnalysis && <PhysiologicalAnalysis athlete={legacyAthlete} vlamaxEffectif={vlamaxEffectif} tteEffectif={tteEffectif} />}
            {showPlanner && <Planificateur athlete={legacyAthlete} />}
            {showWorkoutLibrary && <WorkoutLibrary athlete={legacyAthlete} />}
            {showMonitoring && (
              legacyAthlete ? (
                <MonitoringDashboard athlete={legacyAthlete} />
              ) : (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardContent className="py-12 text-center">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Sélectionnez ou créez un athlète pour accéder au suivi.</p>
                  </CardContent>
                </Card>
              )
            )}
            {showSnapshots && currentAthlete && (
              <SnapshotManager
                athleteId={currentAthlete.id}
                athleteName={currentAthlete.name}
                athleteGoal={currentAthlete.goal || "IM"}
                activeSnapshotId={currentAthlete.active_snapshot_id}
              />
            )}
            {showCheckins && currentAthlete && (
              <CheckinManager athleteId={currentAthlete.id} athleteName={currentAthlete.name} />
            )}

            {/* ✅ METRICS: plus mock — basé snapshot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="VLamax Effectif"
                value={vlamaxEffectif.value !== null ? vlamaxEffectif.value.toFixed(2) : "—"}
                unit="mmol/L/s"
                icon={Zap}
                trend="neutral"
                trendValue={`${vlamaxEffectif.label} • conf ${Math.round(vlamaxEffectif.confidence * 100)}%`}
                accentColor="primary"
              />

              <MetricCard
                title="FTP"
                value={ftp ? ftp.toString() : "—"}
                unit="watts"
                icon={Flame}
                trend="neutral"
                trendValue={ftp_kg ? `${ftp_kg.toFixed(1)} W/kg` : "—"}
                accentColor="accent"
              />

              <MetricCard
                title="TTE Effectif"
                value={tteEffectif.tte_min !== null ? tteEffectif.tte_min.toString() : "—"}
                unit="min"
                icon={Activity}
                trend="neutral"
                trendValue={
                  tteEffectif.source !== "unknown" 
                    ? `${getSourceLabel(tteEffectif.source)} • conf ${Math.round(tteEffectif.confidence * 100)}%`
                    : "Ajouter TSS_7d ou TTE mesuré"
                }
                accentColor={tteEffectif.source === "unknown" ? "warning" : "success"}
              />

              <MetricCard
                title="Race Readiness"
                value={snapshotLegacy ? "—" : "—"}
                unit="%"
                icon={Target}
                trend="neutral"
                trendValue="calculé plus bas"
                accentColor="warning"
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <VLamaxCalculator athlete={legacyAthlete} />
              <TrainingZones />
            </div>

            <RaceReadinessCard 
              athlete={legacyAthlete} 
              vlamaxEffectif={vlamaxEffectif} 
              tteEffectif={tteEffectif} 
              onGoToSnapshots={() => {
                setShowSnapshots(true);
                setShowTestLibrary(false);
                setShowPhysioAnalysis(false);
                setShowPlanner(false);
                setShowWorkoutLibrary(false);
                setShowMonitoring(false);
                setShowCheckins(false);
              }}
            />
            <DanLorangAnalysis 
              athlete={legacyAthlete} 
              vlamaxEffectif={vlamaxEffectif} 
              tteEffectif={tteEffectif} 
              onGoToSnapshots={() => {
                setShowSnapshots(true);
                setShowTestLibrary(false);
                setShowPhysioAnalysis(false);
                setShowPlanner(false);
                setShowWorkoutLibrary(false);
                setShowMonitoring(false);
                setShowCheckins(false);
              }}
            />
            <SemaineTypeView athlete={legacyAthlete} />
            <Bloc3SemainesView athlete={legacyAthlete} />
          </div>
        );

      case "vlamax":
        return (
          <div className="space-y-6 animate-fade-in">
            {renderAthleteSelector()}
            <AthleteProfile athlete={legacyAthlete} onUpdate={() => {}} />
            <VLamaxCalculator athlete={legacyAthlete} />
            <DanLorangAnalysis athlete={legacyAthlete} vlamaxEffectif={vlamaxEffectif} tteEffectif={tteEffectif} onGoToSnapshots={() => setShowSnapshots(true)} />
            <TrainingZones />
          </div>
        );

      case "tests":
        return (
          <div className="space-y-6 animate-fade-in">
            {renderAthleteSelector()}
            <VLamaxTestingPage athlete={legacyAthlete} onSaveTests={() => {}} />
            <TestComparison athlete={legacyAthlete} />
            <TestProtocols athlete={legacyAthlete} />
          </div>
        );

      case "nolio":
        return (
          <div className="space-y-6 animate-fade-in">
            <FeedbackNolioManager feedbacks={feedbacksNolio} onFeedbacksChange={handleFeedbacksChange} />
            <NolioMapping />
          </div>
        );

      case "checklist":
        return (
          <div className="animate-fade-in">
            <RaceChecklist />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Header user */}
      <div className="container mx-auto px-4 pt-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">Connecté: {user?.email}</div>
          <Button variant="ghost" size="sm" onClick={async () => signOut()}>
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 relative">
        <div className="flex justify-center mb-8">
          <img src={logo2fc} alt="Two For Coaching - Vince's Lab" className="h-24 md:h-32 w-auto object-contain" />
        </div>

        {renderContent()}
      </main>

      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Vince’s Lab • Two For Coaching • Données Cloud</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
