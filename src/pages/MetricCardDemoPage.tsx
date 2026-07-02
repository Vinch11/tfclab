import { MetricCard } from "@/components/MetricCard";
import { ScientificDashboard } from "@/components/ScientificDashboard";
import { SnapshotNolio } from "@/types/snapshotNolio";
import { Activity, Zap, Timer } from "lucide-react";

const fakeSnapshots: SnapshotNolio[] = [
  {
    id: "demo-velo",
    date: new Date().toISOString(),
    sport: "vélo",
    poids: 70,
    vo2max: 58,
    fc_max: 185,
    fc_repos: 48,
    ftp: 280,
    pmax_5s: 1100,
    p30s_w: 650,
    p60s_w: 520,
    map5min_w: 340,
    tss_7j: 450,
    tss_28j: 1200,
    source: "nolio",
  },
  {
    id: "demo-course",
    date: new Date().toISOString(),
    sport: "course",
    poids: 70,
    vo2max: 56,
    fc_max: 185,
    fc_repos: 48,
    vma: 17.5,
    allure_seuil: 4.2,
    source: "nolio",
  },
  {
    id: "demo-natation",
    date: new Date().toISOString(),
    sport: "natation",
    poids: 70,
    vo2max: 50,
    pace100: 85,
    css: 88,
    source: "nolio",
  },
];

export default function MetricCardDemoPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-8">
      <h1 className="text-2xl font-bold font-display">Avant / Après MetricCard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Avant (ancien style)</h2>
          <div className="glass-card p-3 sm:p-4 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-primary/10 text-primary">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <p className="metric-label mb-1 sm:mb-2 text-xs sm:text-sm">VO2max</p>
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className="metric-value text-lg sm:text-2xl text-primary">58.5</span>
              <span className="text-muted-foreground text-[10px] sm:text-xs">ml/min/kg</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Après (Space Grotesk)</h2>
          <MetricCard
            title="VO2max"
            value="58.5"
            unit="ml/min/kg"
            icon={Zap}
            accentColor="primary"
          />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">ScientificDashboard (3 cartes métriques)</h2>
        <ScientificDashboard
          snapshots={fakeSnapshots}
          objectif="Marathon"
          athleteNom="Démo Athlète"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard title="VLa.max" value="0.62" unit="mmol/L/s" icon={Zap} accentColor="warning" trend="up" trendValue="+0.05" />
        <MetricCard title="TTE" value="42" unit="min" icon={Timer} accentColor="success" />
        <MetricCard title="FC max" value="185" unit="bpm" icon={Activity} accentColor="accent" />
      </div>
    </div>
  );
}
