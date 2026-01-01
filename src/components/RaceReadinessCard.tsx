import { useMemo } from "react";
import { Target, TrendingUp, Zap, Heart, Activity, ChevronRight, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCloudData } from "@/hooks/useCloudData";
import type { DbSnapshot } from "@/hooks/useCloudData";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { VLamaxEffectif, getSourceColor as getVLamaxSourceColor, getConfidenceLabel } from "@/lib/vlamaxEffectif";
import { TTEEffectif, getSourceColor as getTTESourceColor, getSourceLabel } from "@/lib/tteEffectif";
import { RaceReadinessEffectif, getScoreColor, getScoreBgColor } from "@/lib/raceReadinessEffectif";
import { TTEGuard, isTTEUnavailable } from "@/components/TTEGuard";

interface RaceReadinessCardProps {
  athlete: any;
  vlamaxEffectif?: VLamaxEffectif;
  tteEffectif?: TTEEffectif;
  readiness?: RaceReadinessEffectif;
  onGoToSnapshots?: () => void;
}
// Fonction utilitaire pour récupérer le snapshot effectif
function pickEffectiveSnapshot(snapshots: DbSnapshot[], athleteId: string, activeSnapshotId?: string | null) {
  const list = snapshots.filter(s => s.athlete_id === athleteId);
  if (list.length === 0) return null;
  if (activeSnapshotId) {
    const active = list.find(s => s.id === activeSnapshotId);
    if (active) return active;
  }
  return [...list].sort((a, b) => a.date < b.date ? 1 : -1)[0];
}
export function RaceReadinessCard({
  athlete,
  vlamaxEffectif: vlamaxEffectifProp,
  tteEffectif: tteEffectifProp,
  readiness: readinessProp,
  onGoToSnapshots
}: RaceReadinessCardProps) {
  const {
    snapshots
  } = useCloudData();
  const snap = useMemo(() => {
    return pickEffectiveSnapshot(snapshots as any, athlete.id, athlete.active_snapshot_id ?? null);
  }, [snapshots, athlete.id, athlete.active_snapshot_id]);
  
  // ✅ VLamax EFFECTIF - Utilise la prop si fournie, sinon fallback
  const vlamaxEffectif = vlamaxEffectifProp ?? { 
    value: null, 
    source: "unknown" as const, 
    confidence: 0.2, 
    label: "VLamax (non disponible)" 
  };

  // ✅ TTE EFFECTIF - Utilise la prop si fournie
  const tteEffectif = tteEffectifProp ?? {
    tte_min: null,
    source: "unknown" as const,
    confidence: 0,
    label: "TTE (non disponible)",
    target: 45,
    status: "critical" as const,
    status_message: "Données manquantes"
  };
  
  // ✅ RACE READINESS EFFECTIF - Utilise la prop si fournie (plus de calcul local!)
  const readiness = readinessProp ?? {
    score: 0,
    label: "Non disponible",
    color: "warning" as const,
    details: { vlamax: 0, endurance: 0, puissance: 0, fraicheur: 0 },
    confidence: 0,
    reasonsMissing: ["Données manquantes"],
    inputsUsed: {
      vlamax: { value: null, source: "unknown" },
      tte: { value: null, source: "unknown" },
      ftpKg: null,
      fatigue_ok: true,
      seance_specifique: false,
    },
  };
  
  const scoreColor = getScoreColor(readiness.score);
  const scoreBg = getScoreBgColor(readiness.score);

  // Gérer le cas où il n'y a pas de snapshot
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
        {readiness.reasonsMissing.length > 0 && (
          <div className="text-sm text-muted-foreground space-y-1 mt-4">
            {readiness.reasonsMissing.map((reason, i) => (
              <p key={i}>• {reason}</p>
            ))}
          </div>
        )}
      </div>;
  }

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
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">Forme générale actuelle</h2>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="p-1 rounded-full hover:bg-secondary/50 transition-colors">
                    <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-primary" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-4 bg-card border-border">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Target className="w-4 h-4" />
                      </div>
                      <h4 className="font-semibold text-foreground">Race Readiness Global</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ce score représente l'état de préparation <strong className="text-foreground">général</strong> de l'athlète.
                    </p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">Calculé à partir de :</p>
                      <ul className="list-disc list-inside pl-2 space-y-0.5">
                        <li>VLamax (profil métabolique)</li>
                        <li>Endurance / TTE (capacité à soutenir l'effort)</li>
                        <li>Puissance relative (FTP / kg)</li>
                        <li>Fraîcheur (équilibre charge / récupération)</li>
                      </ul>
                    </div>
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs text-muted-foreground">
                        👉 Répond à : <span className="font-medium text-foreground">"Suis-je globalement prêt à performer aujourd'hui ?"</span>
                      </p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-sm text-muted-foreground">
              Snapshot: {snap.date} {athlete.active_snapshot_id ? "(actif)" : "(plus récent)"}
            </p>
          </div>
        </div>
        <div className={cn("px-4 py-2 rounded-xl", `bg-${readiness.color}/10`)}>
          <span className={cn("font-semibold", scoreColor)}>{readiness.label}</span>
        </div>
      </div>

      {/* Debug VLamax + TTE source */}
      <div className="flex flex-wrap gap-4 mb-4">
        {vlamaxEffectif.value !== null && (
          <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-secondary/30 border border-border">
            <span className="text-muted-foreground">VLamax:</span>
            <span className="font-mono font-bold">{vlamaxEffectif.value.toFixed(2)}</span>
            <span className={cn("px-2 py-0.5 rounded text-xs", getVLamaxSourceColor(vlamaxEffectif.source))}>
              {vlamaxEffectif.source}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              conf {Math.round(vlamaxEffectif.confidence * 100)}%
            </span>
          </div>
        )}
        
        {/* TTE - Afficher garde-fou compact si indisponible */}
        {isTTEUnavailable(tteEffectif) ? (
          <TTEGuard 
            tteEffectif={tteEffectif} 
            athleteName={athlete.nom || athlete.name || "Athlète"} 
            onGoToSnapshots={onGoToSnapshots} 
            compact 
          />
        ) : tteEffectif.tte_min !== null && (
          <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-secondary/30 border border-border">
            <span className="text-muted-foreground">TTE:</span>
            <span className="font-mono font-bold">{tteEffectif.tte_min} min</span>
            <span className={cn("px-2 py-0.5 rounded text-xs", getTTESourceColor(tteEffectif.source))}>
              {getSourceLabel(tteEffectif.source)}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              conf {Math.round(tteEffectif.confidence * 100)}%
            </span>
          </div>
        )}
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
        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong className="text-foreground">Snapshot :</strong> {snap.date} {athlete.active_snapshot_id ? "(actif)" : "(plus récent)"}</p>
          <p><strong className="text-foreground">Objectif :</strong> {athlete.objectif}</p>
          
          {vlamaxEffectif.value !== null && (
            <p>• <strong className="text-foreground">VLamax effectif</strong> : {vlamaxEffectif.value.toFixed(2)} ({vlamaxEffectif.label}) — Confiance : {Math.round(vlamaxEffectif.confidence * 100)}%</p>
          )}
          
          {tteEffectif.tte_min !== null && (
            <p>• <strong className="text-foreground">TTE</strong> : {tteEffectif.tte_min} min ({getSourceLabel(tteEffectif.source)})</p>
          )}
          
          {readiness.inputsUsed.ftpKg !== null && (
            <p>• <strong className="text-foreground">FTP/kg</strong> : {readiness.inputsUsed.ftpKg.toFixed(1)} W/kg</p>
          )}
          
          {readiness.reasonsMissing.length > 0 && (
            <div className="mt-3 p-2 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-xs font-medium text-warning mb-1">Données manquantes :</p>
              {readiness.reasonsMissing.map((reason, i) => (
                <p key={i} className="text-xs text-warning/80">• {reason}</p>
              ))}
            </div>
          )}
          
          <p className="mt-2 text-xs">Ce score combine profil glycolytique (VLamax), puissance spécifique (FTP/kg), endurance (TTE) et fraîcheur.</p>
        </div>
      </div>
    </div>;
}