/**
 * FatiguePage – Suivi de fatigue centré sur les snapshots physiologiques
 * L'état de fatigue (fresh/ok/fatigued/high/injured) et le TSS 7j
 * sont capturés au moment du snapshot pour une cohérence temporelle totale.
 */

import { useState, useMemo } from "react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudData, DbSnapshot } from "@/hooks/useCloudData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChargeEvolutionChart } from "@/components/ChargeEvolutionChart";
import { ChargeInputCard } from "@/components/ChargeInputCard";
import { ChargeRecenteCard } from "@/components/ChargeRecenteCard";
import { 
  Battery, BatteryFull, BatteryMedium, BatteryLow, BatteryWarning,
  Target, Activity, TrendingUp, Calendar, AlertTriangle, 
  CheckCircle2, BarChart3, Users, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computeCRR } from "@/lib/chargeRecenteReference";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Fatigue state config
const FATIGUE_CONFIG: Record<string, { label: string; description: string; color: string; icon: typeof Battery; bgClass: string }> = {
  fresh: { label: "Frais", description: "Bien récupéré, prêt pour intensité", color: "text-green-500", icon: BatteryFull, bgClass: "bg-green-500/10 border-green-500/30" },
  ok: { label: "Normal", description: "État standard", color: "text-blue-500", icon: BatteryMedium, bgClass: "bg-blue-500/10 border-blue-500/30" },
  fatigued: { label: "Fatigué", description: "Fatigue perceptible", color: "text-amber-500", icon: BatteryLow, bgClass: "bg-amber-500/10 border-amber-500/30" },
  high: { label: "Très fatigué", description: "Fatigue élevée, repos conseillé", color: "text-orange-500", icon: BatteryWarning, bgClass: "bg-orange-500/10 border-orange-500/30" },
  injured: { label: "Blessé", description: "Blessure active", color: "text-red-500", icon: AlertTriangle, bgClass: "bg-red-500/10 border-red-500/30" },
};

export default function FatiguePage() {
  const { athletes, selectedAthleteId, setSelectedAthleteId, currentAthlete } = useAthletes();
  const { snapshots, updateSnapshot } = useCloudData();
  const [staffMode, setStaffMode] = useState(false);

  // Snapshot actif
  const activeSnapshot = useMemo<DbSnapshot | null>(() => {
    if (!currentAthlete || !currentAthlete.active_snapshot_id) return null;
    return snapshots.find(s => s.id === currentAthlete.active_snapshot_id) || null;
  }, [currentAthlete, snapshots]);

  // Historique des snapshots triés par date
  const athleteSnapshots = useMemo(() => {
    if (!selectedAthleteId) return [];
    return snapshots
      .filter(s => s.athlete_id === selectedAthleteId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [snapshots, selectedAthleteId]);

  // CRR
  const crr = useMemo(() => {
    return computeCRR({
      tss7d: activeSnapshot?.tss_7d ?? null,
      snapshotDate: activeSnapshot?.date ?? null,
      snapshotUpdatedAt: activeSnapshot?.updated_at ?? null,
    });
  }, [activeSnapshot]);

  const objectif = currentAthlete?.goal ?? "703";
  const fatigueState = activeSnapshot?.fatigue_state || "ok";
  const fatigueInfo = FATIGUE_CONFIG[fatigueState] || FATIGUE_CONFIG.ok;
  const FatigueIcon = fatigueInfo.icon;

  // Quick update fatigue state on active snapshot
  const handleFatigueUpdate = async (newState: string) => {
    if (!activeSnapshot) return;
    await updateSnapshot(activeSnapshot.id, { fatigue_state: newState });
  };

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
              Fatigue et Forme
            </h1>
            <p className="text-muted-foreground text-sm">
              État de forme capturé au moment de chaque profil physiologique
            </p>
          </div>
          
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
        ) : !activeSnapshot ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Aucun profil physiologique actif. Crée un snapshot pour suivre la fatigue.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Current Fatigue State - Hero Card */}
            <Card className={cn("border-2", fatigueInfo.bgClass)}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <FatigueIcon className={cn("h-8 w-8", fatigueInfo.color)} />
                    <div>
                      <h2 className={cn("text-xl font-bold", fatigueInfo.color)}>{fatigueInfo.label}</h2>
                      <p className="text-sm text-muted-foreground">{fatigueInfo.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Snapshot du</p>
                    <p className="text-sm font-medium">
                      {new Date(activeSnapshot.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Quick fatigue state selector */}
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Mettre à jour l'état de forme :</p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(FATIGUE_CONFIG).map(([key, config]) => (
                      <Button
                        key={key}
                        variant={fatigueState === key ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleFatigueUpdate(key)}
                        className={cn(
                          "text-xs",
                          fatigueState === key && "ring-2 ring-primary"
                        )}
                      >
                        {config.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats from Snapshot */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Activity className="h-4 w-4" />
                    <span className="text-xs font-medium">Charge 7j</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {activeSnapshot.tss_7d ?? '—'}
                    <span className="text-sm font-normal text-muted-foreground"> TSS</span>
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-secondary/30 to-secondary/10 border-secondary/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-secondary-foreground mb-1">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-xs font-medium">TTE</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {activeSnapshot.tte_observed_min ?? '—'}
                    <span className="text-sm font-normal text-muted-foreground"> min</span>
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-accent/30 to-accent/10 border-accent/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-accent-foreground mb-1">
                    <Zap className="h-4 w-4" />
                    <span className="text-xs font-medium">FTP</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {activeSnapshot.ftp ?? '—'}
                    <span className="text-sm font-normal text-muted-foreground"> W</span>
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-destructive mb-1">
                    <Battery className="h-4 w-4" />
                    <span className="text-xs font-medium">État</span>
                  </div>
                  <p className={cn("text-2xl font-bold", fatigueInfo.color)}>
                    {fatigueInfo.label}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charge Evolution Chart */}
            <ChargeEvolutionChart
              snapshots={snapshots}
              athleteId={selectedAthleteId}
              objectif={objectif}
              currentTss7d={activeSnapshot?.tss_7d ?? null}
            />

            {/* Charge Input + CRR */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

              <ChargeRecenteCard
                crr={crr}
                objectif={objectif}
                staffMode={staffMode}
              />
            </div>

            {/* Snapshot Fatigue History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Historique fatigue (snapshots)
                </CardTitle>
                <CardDescription>
                  État de forme enregistré à chaque profil physiologique
                </CardDescription>
              </CardHeader>
              <CardContent>
                {athleteSnapshots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucun snapshot enregistré
                  </p>
                ) : (
                  <div className="space-y-2">
                    {athleteSnapshots.slice(0, 20).map((snap) => (
                      <SnapshotFatigueRow key={snap.id} snapshot={snap} isActive={snap.id === activeSnapshot?.id} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fatigue Trend */}
            {athleteSnapshots.length >= 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Tendance de charge
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 flex-wrap">
                    {athleteSnapshots.slice(0, 8).reverse().map((snap) => {
                      const cfg = FATIGUE_CONFIG[snap.fatigue_state || "ok"] || FATIGUE_CONFIG.ok;
                      return (
                        <div key={snap.id} className="flex flex-col items-center gap-1">
                          <Badge variant="outline" className={cn("text-xs", cfg.color)}>
                            {cfg.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(snap.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="text-xs font-mono">
                            {snap.tss_7d ?? '—'} TSS
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </SidebarLayout>
  );
}

// Row component for snapshot fatigue history
function SnapshotFatigueRow({ snapshot, isActive }: { snapshot: DbSnapshot; isActive: boolean }) {
  const state = snapshot.fatigue_state || "ok";
  const config = FATIGUE_CONFIG[state] || FATIGUE_CONFIG.ok;
  const Icon = config.icon;
  const date = new Date(snapshot.date);
  const formattedDate = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg transition-colors",
      isActive ? "bg-primary/10 border border-primary/30" : "bg-muted/30 hover:bg-muted/50"
    )}>
      <div className="flex items-center gap-4">
        <Icon className={cn("h-5 w-5", config.color)} />
        <span className="text-sm font-medium w-28">{formattedDate}</span>
        <Badge variant="outline" className={cn("text-xs", config.color)}>
          {config.label}
        </Badge>
        {isActive && (
          <Badge variant="default" className="text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Actif
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>TSS 7j: <strong>{snapshot.tss_7d ?? '—'}</strong></span>
        <span>FTP: <strong>{snapshot.ftp ?? '—'}</strong></span>
        {snapshot.cycle_tag && <Badge variant="secondary" className="text-xs">{snapshot.cycle_tag}</Badge>}
      </div>
    </div>
  );
}
