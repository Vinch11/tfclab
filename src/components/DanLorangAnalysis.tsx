import { useState, useEffect, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Target, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Timer, Zap, Trophy, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCloudData } from "@/hooks/useCloudData";
import type { DbSnapshot } from "@/hooks/useCloudData";
import {
  reglesDanLorang,
  ReglesDanLorangResult,
  RaceReadinessInputs,
  getPrioriteLabel,
  getPrioriteColor,
  getSeancesRecommandees,
  getSeancesSpecifiques,
  PrioriteType,
} from "@/types/reglesDanLorang";
import { SEANCES } from "@/types/seances";

// 👉 On garde Athlete en props pour compat UI, mais on ne dépend plus de SnapshotNolio
interface DanLorangAnalysisProps {
  athlete: any; // (ancien Athlete) ou "athlete ui" venant du nouveau AthleteContext cloud
}

// Icônes
const prioriteIcons: Record<PrioriteType, typeof TrendingDown> = {
  VLAMAX_DOWN: TrendingDown,
  VLAMAX_UP: TrendingUp,
  TTE_UP: Timer,
  FTP_UTIL: Zap,
  ENDURANCE_UP: Timer,
  VITESSE_UP: TrendingUp,
  "": CheckCircle2,
};

// Recos par priorité
const getRecommandationsPriorite = (priorite: PrioriteType): string[] => {
  switch (priorite) {
    case "VLAMAX_DOWN":
      return [
        "Privilégier les sorties longues Z2 (4-6h)",
        "Éviter les sprints et intervalles courts",
        "Séances tempo longues (sweet spot 2x30-40min)",
      ];
    case "VLAMAX_UP":
      return [
        "Ajouter des sprints courts (5-10s max)",
        "Intervalles courts haute intensité",
        "Séances de force explosive",
      ];
    case "TTE_UP":
      return ["Séances au seuil prolongées (2x20-30min)", "Intervalles longs à 95-105% FTP", "Sorties tempo soutenues"];
    case "FTP_UTIL":
      return [
        "Blocs de travail au seuil (sweet spot)",
        "Intervalles VO2max (3-5min à 105-115% FTP)",
        "Progression du volume au seuil",
      ];
    default:
      return ["Maintenir l'équilibre actuel", "Affûtage pré-compétition", "Récupération et fraîcheur"];
  }
};

// --- Helpers calculs cloud-friendly (sans Nolio) ---
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function pickEffectiveSnapshot(
  snapshots: DbSnapshot[],
  athleteId: string,
  activeSnapshotId?: string | null,
): DbSnapshot | null {
  const list = snapshots.filter((s) => s.athlete_id === athleteId);
  if (list.length === 0) return null;
  if (activeSnapshotId) {
    const active = list.find((s) => s.id === activeSnapshotId);
    if (active) return active;
  }
  // fallback : plus récent (date ISO)
  return [...list].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
}

/**
 * TTE proxy :
 * - si on a un champ metabolic_score ou confidence, on peut ajuster
 * - sinon base sur ftp + objectif
 * C’est un proxy (pas un TTE de labo). L’idée est de rester cohérent et stable.
 */
function estimateTteMinutes(snapshot: DbSnapshot, objectif: string): number {
  const ftp = snapshot.ftp ?? null;
  if (!ftp) return objectif === "IM" ? 45 : 40;

  // base simple : plus ftp est élevé (absolu), plus TTE tend à monter, mais plafonné.
  // on ajuste légèrement avec confidence si renseignée.
  const conf = snapshot.confidence ?? 0.7; // défaut 0.7
  const base = objectif === "IM" ? 50 : 45;
  const ftpFactor = clamp((ftp - 200) / 250, 0, 1); // 200W->0, 450W->1
  const confFactor = clamp(conf, 0, 1);

  const tte = base + 20 * ftpFactor + 10 * (confFactor - 0.5);
  return Math.round(clamp(tte, 30, 80));
}

function computeFtpKg(snapshot: DbSnapshot): number {
  const ftp = snapshot.ftp ?? null;
  const w = snapshot.weight_kg ?? null;
  if (!ftp || !w || w <= 0) return 0;
  return ftp / w;
}

function computeVlamax(snapshot: DbSnapshot, objectif: string): number {
  // 1) si coach a saisi vlamax dans snapshot => priorité à ça
  if (snapshot.vlamax != null) return Number(snapshot.vlamax.toFixed(2));

  // 2) fallback : heuristique très prudente basée sur profil sprint vs ftp si pmax_5s existe
  const ftp = snapshot.ftp ?? null;
  const pmax = snapshot.pmax_5s ?? null;
  const w = snapshot.weight_kg ?? null;

  if (ftp && pmax && w) {
    const G = pmax / w;
    const O = ftp / w;
    // index simplifié (sans TSS)
    const idx = 0.45 * G - 0.3 * O;
    let v = 0.25 + 0.2 * clamp(idx / 3, 0, 1);
    if (objectif === "IM") v = Math.min(v, 0.45);
    if (objectif === "703") v = Math.min(v, 0.55);
    return Number(clamp(v, 0.25, 0.7).toFixed(2));
  }

  // 3) sinon valeur neutre
  return objectif === "IM" ? 0.4 : 0.45;
}

export function DanLorangAnalysis({ athlete }: DanLorangAnalysisProps) {
  const { snapshots } = useCloudData();

  const effectiveSnapshot = useMemo(() => {
    return pickEffectiveSnapshot(snapshots as any, athlete.id, athlete.active_snapshot_id ?? null);
  }, [snapshots, athlete.id, athlete.active_snapshot_id]);

  const [inputs, setInputs] = useState<RaceReadinessInputs>({
    seance_specifique_validee: false,
    fatigue_ok: true,
  });

  const vlamax = effectiveSnapshot ? computeVlamax(effectiveSnapshot, athlete.objectif) : 0;
  const tte = effectiveSnapshot ? estimateTteMinutes(effectiveSnapshot, athlete.objectif) : 0;
  const ftp_kg = effectiveSnapshot ? computeFtpKg(effectiveSnapshot) : 0;

  const [analysis, setAnalysis] = useState<ReglesDanLorangResult>({
    priorite: "",
    alertes: [],
    race_ready: false,
  });

  useEffect(() => {
    const result = reglesDanLorang(athlete, vlamax, tte, ftp_kg, inputs.seance_specifique_validee, inputs.fatigue_ok);
    setAnalysis(result);
  }, [athlete, vlamax, tte, ftp_kg, inputs]);

  const PrioriteIcon = prioriteIcons[analysis.priorite] || CheckCircle2;
  const recommendations = getRecommandationsPriorite(analysis.priorite);
  const seancesRecommandees = getSeancesRecommandees(analysis.priorite);
  const tteTarget = athlete.objectif === "IM" ? 55 : 45;
  const ftpTarget = athlete.objectif === "IM" ? 4.6 : 4.8;

  // score readiness (même logique, mais basée sur snapshot effectif)
  let raceScore = 0;
  if (vlamax >= 0.25 && vlamax <= (athlete.objectif === "IM" ? 0.45 : 0.55)) raceScore += 25;
  if (tte >= tteTarget) raceScore += 25;
  if (ftp_kg >= ftpTarget) raceScore += 25;
  if (inputs.seance_specifique_validee) raceScore += 15;
  if (inputs.fatigue_ok) raceScore += 10;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Race Ready!";
    if (score >= 80) return "Presque prêt";
    if (score >= 60) return "En progression";
    return "Préparation requise";
  };

  if (!effectiveSnapshot) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-warning/10 text-warning">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Analyse Dan Lorang</h2>
            <p className="text-sm text-muted-foreground">Aucun snapshot disponible</p>
          </div>
        </div>
        <p className="text-center text-muted-foreground py-8">Ajoutez un snapshot (manuel) pour voir l'analyse.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-warning/10 text-warning">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Analyse Dan Lorang</h2>
            <p className="text-sm text-muted-foreground">
              Objectif: {athlete.objectif === "IM" ? "Ironman" : athlete.objectif}
              {" • "}
              Snapshot utilisé: {effectiveSnapshot.date}
              {athlete.active_snapshot_id ? " (actif)" : " (plus récent)"}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "px-4 py-2 rounded-xl flex items-center gap-2",
            analysis.race_ready ? "bg-success/10 border border-success/30" : "bg-secondary/50 border border-border",
          )}
        >
          {analysis.race_ready ? (
            <>
              <Trophy className="w-5 h-5 text-success" />
              <span className="font-semibold text-success">Race Ready</span>
            </>
          ) : (
            <>
              <Target className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground">En préparation</span>
            </>
          )}
        </div>
      </div>

      <div className="mb-6 p-4 rounded-xl bg-secondary/30 border border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Score Race Readiness</span>
          <span className={cn("text-2xl font-bold font-mono", getScoreColor(raceScore))}>{raceScore}%</span>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden mb-2">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              raceScore >= 80 ? "bg-success" : raceScore >= 60 ? "bg-warning" : "bg-destructive",
            )}
            style={{ width: `${raceScore}%` }}
          />
        </div>
        <p className={cn("text-sm font-medium", getScoreColor(raceScore))}>{getScoreLabel(raceScore)}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-3 rounded-xl bg-secondary/20 border border-border">
          <p className="text-xs text-muted-foreground mb-1">VLamax</p>
          <p
            className={cn(
              "text-lg font-bold font-mono",
              vlamax > 0.45 ? "text-warning" : vlamax < 0.28 ? "text-destructive" : "text-success",
            )}
          >
            {vlamax.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">Cible: 0.25-0.{athlete.objectif === "IM" ? "40" : "45"}</p>
        </div>

        <div className="p-3 rounded-xl bg-secondary/20 border border-border">
          <p className="text-xs text-muted-foreground mb-1">TTE (proxy)</p>
          <p className={cn("text-lg font-bold font-mono", tte < tteTarget ? "text-warning" : "text-success")}>
            {tte} min
          </p>
          <p className="text-xs text-muted-foreground">Cible: ≥{tteTarget} min</p>
        </div>

        <div className="p-3 rounded-xl bg-secondary/20 border border-border">
          <p className="text-xs text-muted-foreground mb-1">FTP</p>
          <p className={cn("text-lg font-bold font-mono", ftp_kg < ftpTarget ? "text-warning" : "text-success")}>
            {ftp_kg ? ftp_kg.toFixed(1) : "—"} W/kg
          </p>
          <p className="text-xs text-muted-foreground">Cible: ≥{ftpTarget} W/kg</p>
        </div>

        <div className="p-3 rounded-xl bg-secondary/20 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Confiance</p>
          <p className="text-lg font-bold font-mono text-primary">
            {effectiveSnapshot.confidence != null ? effectiveSnapshot.confidence.toFixed(2) : "—"}
          </p>
          <p className="text-xs text-muted-foreground">Qualité données</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border">
          <div className="flex items-center gap-3">
            <CheckCircle2
              className={cn("w-5 h-5", inputs.seance_specifique_validee ? "text-success" : "text-muted-foreground")}
            />
            <Label htmlFor="seance" className="text-foreground cursor-pointer">
              Séance spécifique validée
            </Label>
          </div>
          <Switch
            id="seance"
            checked={inputs.seance_specifique_validee}
            onCheckedChange={(checked) => setInputs((prev) => ({ ...prev, seance_specifique_validee: checked }))}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border">
          <div className="flex items-center gap-3">
            <CheckCircle2 className={cn("w-5 h-5", inputs.fatigue_ok ? "text-success" : "text-muted-foreground")} />
            <Label htmlFor="fatigue" className="text-foreground cursor-pointer">
              Fatigue maîtrisée
            </Label>
          </div>
          <Switch
            id="fatigue"
            checked={inputs.fatigue_ok}
            onCheckedChange={(checked) => setInputs((prev) => ({ ...prev, fatigue_ok: checked }))}
          />
        </div>
      </div>

      {analysis.alertes.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-warning/10 border border-warning/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <span className="font-medium text-warning">Alertes</span>
          </div>
          <ul className="space-y-2">
            {analysis.alertes.map((alerte, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-warning">
                <span>•</span>
                {alerte}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("p-2 rounded-lg bg-secondary", getPrioriteColor(analysis.priorite))}>
            <PrioriteIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Priorité Entraînement</p>
            <p className={cn("text-lg font-semibold", getPrioriteColor(analysis.priorite))}>
              {getPrioriteLabel(analysis.priorite)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            Recommandations
          </p>
          <ul className="space-y-1.5">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-primary">→</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>

        {seancesRecommandees.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm font-medium text-foreground mb-2">Séances Recommandées</p>
            <div className="flex flex-wrap gap-2">
              {seancesRecommandees.map((code) => {
                const seance = SEANCES[code as keyof typeof SEANCES];
                return seance ? (
                  <div key={code} className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                    <span className="text-sm font-mono font-semibold text-primary">{code}</span>
                    <span className="text-xs text-muted-foreground ml-2">{seance.objectif}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
