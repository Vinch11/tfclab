import { useState, useEffect, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Target, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Timer, Zap, Trophy, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Athlete, getDernierSnapshot } from "@/types/athlete";
import { calculVLamaxSnapshot } from "@/lib/athleteStore";

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

// ✅ TTE PRO (2 modules)
import { computeTTEPro } from "@/lib/ttePro";

interface DanLorangAnalysisProps {
  athlete: Athlete;
}

const prioriteIcons: Record<PrioriteType, typeof TrendingDown> = {
  VLAMAX_DOWN: TrendingDown,
  VLAMAX_UP: TrendingUp,
  TTE_UP: Timer,
  FTP_UTIL: Zap,
  ENDURANCE_UP: Timer,
  VITESSE_UP: TrendingUp,
  "": CheckCircle2,
};

// Recommendations par priorité
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

export function DanLorangAnalysis({ athlete }: DanLorangAnalysisProps) {
  const snapshot = getDernierSnapshot(athlete) as any;

  const [inputs, setInputs] = useState<RaceReadinessInputs>({
    seance_specifique_validee: false,
    fatigue_ok: true,
  });

  // ✅ VLamax depuis snapshot (comme avant)
  const vlamax = useMemo(() => {
    if (!snapshot) return 0.45;
    return calculVLamaxSnapshot(snapshot, athlete.objectif);
  }, [snapshot, athlete.objectif]);

  // ✅ FTP/kg
  const ftp_kg = useMemo(() => {
    if (!snapshot?.ftp || !snapshot?.poids) return 4.0;
    return snapshot.ftp / snapshot.poids;
  }, [snapshot]);

  // ✅ TTE PRO (2 modules)
  // IMPORTANT: chez toi, snapshot.tss_7j contient maintenant la valeur tss_7d (mapping Index.tsx)
  const ttePro = useMemo(() => {
    if (!snapshot) {
      return computeTTEPro({ ftp: null, tss7d: null, tteObservedMin: null, mode: "LOAD" });
    }
    return computeTTEPro({
      ftp: snapshot.ftp ?? null,
      tss7d: snapshot.tss_7j ?? null, // <- ici : tss_7d mappé dans legacy
      tteObservedMin: snapshot.tte_observed_min ?? null,
      mode: snapshot.tte_mode ?? "LOAD",
    });
  }, [snapshot]);

  const tte = ttePro.tteMin ?? 45;

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

  // Targets
  const ftpTarget = athlete.objectif === "IM" ? 4.6 : 4.8;
  const tteTarget = athlete.objectif === "IM" ? 55 : 45;

  // ✅ Race readiness score basé sur TTE PRO
  let raceScore = 0;
  if (vlamax >= 0.25 && vlamax <= 0.45) raceScore += 25;
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

  if (!snapshot) {
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
        <p className="text-center text-muted-foreground py-8">Ajoutez un snapshot pour voir l'analyse</p>
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
            <p className="text-sm text-muted-foreground">Objectif: {athlete.objectif === "IM" ? "Ironman" : "70.3"}</p>
          </div>
        </div>

        {/* Race Ready Badge */}
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

      {/* Race Readiness Score */}
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

      {/* Current Metrics */}
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
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground mb-1">TTE (PRO)</p>
            <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {ttePro.source}
            </span>
          </div>

          <p className={cn("text-lg font-bold font-mono", tte < tteTarget ? "text-warning" : "text-success")}>
            {tte} min
          </p>

          <p className="text-xs text-muted-foreground">
            Cible: ≥{tteTarget} min • Confiance: {Math.round((ttePro.confidence ?? 0) * 100)}%
          </p>
        </div>

        <div className="p-3 rounded-xl bg-secondary/20 border border-border">
          <p className="text-xs text-muted-foreground mb-1">FTP</p>
          <p className={cn("text-lg font-bold font-mono", ftp_kg < ftpTarget ? "text-warning" : "text-success")}>
            {ftp_kg.toFixed(1)} W/kg
          </p>
          <p className="text-xs text-muted-foreground">Cible: ≥{ftpTarget} W/kg</p>
        </div>

        <div className="p-3 rounded-xl bg-secondary/20 border border-border">
          <p className="text-xs text-muted-foreground mb-1">TSS 7d</p>
          <p className="text-lg font-bold font-mono text-primary">{snapshot.tss_7j ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Charge hebdo</p>
        </div>
      </div>

      {/* Checklist Items */}
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

      {/* Alerts */}
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

      {/* Priority & Recommendations */}
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

        {/* Séances Recommandées */}
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
