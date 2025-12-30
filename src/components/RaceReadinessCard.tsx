import { useMemo } from "react";
import { Target, TrendingUp, Zap, Heart, Activity, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCloudData } from "@/hooks/useCloudData";
import type { DbSnapshot } from "@/hooks/useCloudData";
interface RaceReadinessCardProps {
  athlete: any;
}
function pickEffectiveSnapshot(snapshots: DbSnapshot[], athleteId: string, activeSnapshotId?: string | null) {
  const list = snapshots.filter(s => s.athlete_id === athleteId);
  if (list.length === 0) return null;
  if (activeSnapshotId) {
    const active = list.find(s => s.id === activeSnapshotId);
    if (active) return active;
  }
  return [...list].sort((a, b) => a.date < b.date ? 1 : -1)[0];
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function computeReadiness(snapshot: DbSnapshot, objectif: string) {
  const vlamax = snapshot.vlamax ?? null;
  const ftp = snapshot.ftp ?? null;
  const w = snapshot.weight_kg ?? null;
  const conf = snapshot.confidence ?? 0.7;
  const ftpKg = ftp && w ? ftp / w : null;

  // Targets (à ajuster)
  const ftpTarget = objectif === "IM" ? 4.6 : 4.8;

  // Scores /25
  const vlamaxScore = vlamax == null ? 10 : vlamax >= 0.25 && vlamax <= (objectif === "IM" ? 0.45 : 0.55) ? 25 : vlamax < 0.25 ? 8 : 15;
  const puissanceScore = ftpKg == null ? 10 : ftpKg >= ftpTarget ? 25 : Math.round(clamp(ftpKg / ftpTarget * 25, 5, 24));
  const enduranceScore = snapshot.metabolic_score != null ? Math.round(clamp(snapshot.metabolic_score / 4, 5, 25)) : Math.round(clamp(15 + 10 * (conf - 0.5), 8, 22));
  const fraicheurScore = conf >= 0.85 ? 22 : conf >= 0.7 ? 18 : 12;
  const total = vlamaxScore + puissanceScore + enduranceScore + fraicheurScore;
  const score = Math.round(clamp(total / 100 * 100, 0, 100));
  const color = score >= 80 ? "success" : score >= 60 ? "warning" : "destructive";
  const label = score >= 80 ? "Prêt" : score >= 60 ? "En progression" : "À construire";
  return {
    score,
    color,
    label,
    details: {
      vlamax: vlamaxScore,
      puissance: puissanceScore,
      endurance: enduranceScore,
      fraicheur: fraicheurScore
    }
  };
}
function texteExplicatif(snapshot: DbSnapshot, objectif: string) {
  const lines: string[] = [];
  lines.push(`**Snapshot utilisé : ${snapshot.date}**`);
  lines.push(`Objectif : ${objectif}`);
  if (snapshot.vlamax != null) lines.push(`• VLamax saisie : ${snapshot.vlamax.toFixed(2)}`);
  if (snapshot.vo2max != null) lines.push(`• VO₂max : ${snapshot.vo2max.toFixed(1)}`);
  if (snapshot.ftp != null) lines.push(`• FTP : ${snapshot.ftp} W`);
  if (snapshot.weight_kg != null) lines.push(`• Poids : ${snapshot.weight_kg.toFixed(1)} kg`);
  if (snapshot.confidence != null) lines.push(`• Confiance : ${snapshot.confidence.toFixed(2)}`);
  lines.push("");
  lines.push("Interprétation : ce score combine profil glycolytique (VLamax), puissance spécifique (FTP/kg), endurance (proxy) et qualité des données (confiance).");
  return lines.join("\n");
}
export function RaceReadinessCard({
  athlete
}: RaceReadinessCardProps) {
  const {
    snapshots
  } = useCloudData();
  const snap = useMemo(() => {
    return pickEffectiveSnapshot(snapshots as any, athlete.id, athlete.active_snapshot_id ?? null);
  }, [snapshots, athlete.id, athlete.active_snapshot_id]);
  if (!snap) {
    return <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-warning/10 text-warning">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Race Readiness</h2>
            <p className="text-sm text-muted-foreground">Aucun snapshot disponible</p>
          </div>
        </div>
      </div>;
  }
  const readiness = computeReadiness(snap, athlete.objectif);
  const texte = texteExplicatif(snap, athlete.objectif);
  const scoreColor = {
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive"
  }[readiness.color] || "text-muted-foreground";
  const scoreBg = {
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive"
  }[readiness.color] || "bg-muted";
  const detailItems = [{
    key: "vlamax",
    label: "VLamax",
    icon: Zap,
    value: readiness.details.vlamax,
    color: "text-primary"
  }, {
    key: "endurance",
    label: "Endurance",
    icon: Activity,
    value: readiness.details.endurance,
    color: "text-accent"
  }, {
    key: "puissance",
    label: "Puissance",
    icon: TrendingUp,
    value: readiness.details.puissance,
    color: "text-warning"
  }, {
    key: "fraicheur",
    label: "Fraîcheur",
    icon: Heart,
    value: readiness.details.fraicheur,
    color: "text-success"
  }];
  return <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Forme générale actuelle</h2>
            <p className="text-sm text-muted-foreground">
              Snapshot: {snap.date} {athlete.active_snapshot_id ? "(actif)" : "(plus récent)"}
            </p>
          </div>
        </div>
        <div className={cn("px-4 py-2 rounded-xl", `bg-${readiness.color}/10`)}>
          <span className={cn("font-semibold", scoreColor)}>{readiness.label}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-secondary/30 border border-border">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="80" cy="80" r="70" stroke="hsl(var(--secondary))" strokeWidth="12" fill="none" />
              <circle cx="80" cy="80" r="70" stroke={`hsl(var(--${readiness.color}))`} strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray={`${readiness.score / 100 * 440} 440`} className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-5xl font-bold font-mono", scoreColor)}>{readiness.score}</span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {detailItems.map(item => <div key={item.key} className="p-3 rounded-xl bg-secondary/20 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <item.icon className={cn("w-4 h-4", item.color)} />
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
                <span className={cn("font-mono font-bold", item.color)}>{item.value}/25</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-500", scoreBg)} style={{
              width: `${item.value / 25 * 100}%`,
              opacity: 0.7
            }} />
              </div>
            </div>)}
        </div>
      </div>

      <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-primary" />
          Analyse personnalisée
        </h3>
        <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
          {texte.split("\n").map((line, i) => {
          if (line.includes("**")) {
            const parts = line.split("**");
            return <p key={i} className="mb-2">
                  {parts.map((part, j) => j % 2 === 1 ? <span key={j} className="font-semibold text-foreground">
                        {part}
                      </span> : <span key={j}>{part}</span>)}
                </p>;
          }
          if (line.startsWith("•")) return <p key={i} className="ml-4 mb-1">
                  {line}
                </p>;
          return line ? <p key={i} className="mb-2">
                {line}
              </p> : <br key={i} />;
        })}
        </div>
      </div>
    </div>;
}