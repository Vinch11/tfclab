/**
 * TriathlonFullRaceSimulationCard
 *
 * Combine les 2 segments (vélo + course) pour estimer la performance et
 * les risques sur la course COMPLÈTE (70.3 ou IM), pas un seul segment.
 *
 * Modélise pour chaque scénario (Robuste / Ambitieux / Agressif) appliqué
 * AU VÉLO :
 *  - Le temps vélo (modulé par le scénario)
 *  - La pénalité run induite par le choix vélo (fatigue résiduelle)
 *  - Le temps total = swim + T1 + bike + T2 + run
 *  - La probabilité d'échec combinée
 *  - Le coût métabolique global
 *  - Le drapeau de risque le plus saillant
 */

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Activity,
  Bike,
  Footprints,
  Waves,
  Timer,
  TrendingUp,
  AlertTriangle,
  Flame,
  Target,
  Info,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type FullRaceScenarioKey = "ROBUST" | "AMBITIOUS" | "AGGRESSIVE";

interface FullRaceScenario {
  key: FullRaceScenarioKey;
  emoji: string;
  label: string;
  description: string;
  // Time breakdown (minutes)
  swimMin: number;
  t1Min: number;
  bikeMin: number;
  t2Min: number;
  runMin: number;
  totalMin: number;
  // Risk
  bikeFailurePct: number;
  runFailurePct: number;
  combinedFailurePct: number;
  metabolicCost: number; // 0-100
  robustness: "ROBUST" | "FRAGILE" | "VERY_FRAGILE";
  // Narrative
  bikeStrategy: string;
  runStrategy: string;
  redFlag: string;
  forWho: string;
  // Fatigue & transitions
  residualFatigue: number; // 0-100, fatigue accumulée fin de vélo
  t1ImpactSec: number; // surcoût T1 induit par disponibilité
  t2ImpactSec: number; // "jelly legs" : surcoût des 2 premiers km de course
  couplingPenaltyPct: number; // pénalité de couplage vélo→course (% sur les 5 premiers km)
  transitionNote: string; // explication concrète T1/T2
  fatigueNote: string; // explication concrète fatigue accumulée
}

interface Props {
  raceObjective: "IM" | "70.3";
  bikeBaselineMin: number;
  runBaselineMin: number;
  disponibiliteScore?: number | null;
  vlamaxValue?: number | null;
  fatigueState?: "fresh" | "ok" | "fatigued" | "high" | "injured" | null;
  className?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function fmtDuration(min: number): string {
  const totalMin = Math.round(min);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}min`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

function combineFailure(...probs: number[]): number {
  // 1 - ∏(1 - p_i)
  const p = probs.reduce((acc, x) => acc * (1 - Math.max(0, Math.min(100, x)) / 100), 1);
  return Math.round((1 - p) * 100);
}

function buildScenarios(props: Props): FullRaceScenario[] {
  const { raceObjective, bikeBaselineMin, runBaselineMin, vlamaxValue, disponibiliteScore, fatigueState } = props;
  const isIM = raceObjective === "IM";

  // Hypothèses temps natation + transitions de base selon format
  const swimMin = isIM ? 65 : 33;
  const t1BaseMin = isIM ? 6 : 3;
  const t2BaseMin = isIM ? 4 : 2;

  // ── Modificateurs contextuels ──────────────────────────────────────────────
  // Disponibilité : score 0–100. <60 = pénalisant, >80 = bonus.
  const dispo = disponibiliteScore ?? 70;
  const dispoFactor = (75 - dispo) / 100; // ex. dispo 60 → +0.15, dispo 90 → -0.15

  // État de fatigue déclaré (échelle TFCL 1-10 mappée)
  const fatigueMap: Record<NonNullable<Props["fatigueState"]>, number> = {
    fresh: 0.0,
    ok: 0.02,
    fatigued: 0.06,
    high: 0.10,
    injured: 0.15,
  };
  const fatigueAdd = fatigueState ? fatigueMap[fatigueState] : 0.02;

  // VLamax élevé → glycogène cramé plus vite, accentue les pénalités agressives
  const vlamaxHigh = (vlamaxValue ?? 0.4) >= 0.5;

  // Modulation segment vélo selon scénario (% baseline)
  const bikeMod: Record<FullRaceScenarioKey, number> = {
    ROBUST: 1.06,
    AMBITIOUS: 1.0,
    AGGRESSIVE: 0.97,
  };

  // Pénalité au run induite par le choix vélo (fatigue résiduelle)
  // Augmentée par : dispo basse, fatigue de départ, vlamax élevé
  const baseRunPenalty: Record<FullRaceScenarioKey, number> = {
    ROBUST: 1.00,
    AMBITIOUS: 1.03,
    AGGRESSIVE: isIM ? 1.15 : 1.10,
  };

  // Coût T1 / T2 (en secondes ajoutées à la transition de base)
  // T1 : sortie d'eau + tenue vélo. Légèrement majoré par fatigue de départ.
  // T2 : passage vélo→course. Le « jelly legs » coûte beaucoup plus que la transition mécanique.
  const t1Surcharge: Record<FullRaceScenarioKey, number> = {
    ROBUST: 0,
    AMBITIOUS: 10,
    AGGRESSIVE: 20,
  };
  // T2 surcoût = pénalité physiologique (jambes en coton) + erreur d'allure des 2 premiers km
  const t2SurchargeSec: Record<FullRaceScenarioKey, number> = {
    ROBUST: isIM ? 30 : 20,
    AMBITIOUS: isIM ? 75 : 45,
    AGGRESSIVE: isIM ? 150 : 90,
  };

  // Pénalité de couplage vélo→course (% supplémentaire sur les 5 premiers km de run)
  const couplingPenalty: Record<FullRaceScenarioKey, number> = {
    ROBUST: 1.5,
    AMBITIOUS: 4,
    AGGRESSIVE: isIM ? 9 : 7,
  };

  // Probabilités de casse par scénario (calibration empirique TFCL™)
  const failureProbs: Record<FullRaceScenarioKey, { bike: number; run: number }> = {
    ROBUST: { bike: 4, run: 6 },
    AMBITIOUS: { bike: 12, run: isIM ? 22 : 18 },
    AGGRESSIVE: { bike: 28, run: isIM ? 55 : 45 },
  };

  const baseMetabolicCost: Record<FullRaceScenarioKey, number> = {
    ROBUST: 55,
    AMBITIOUS: 75,
    AGGRESSIVE: 95,
  };

  const robustness: Record<FullRaceScenarioKey, FullRaceScenario["robustness"]> = {
    ROBUST: "ROBUST",
    AMBITIOUS: "FRAGILE",
    AGGRESSIVE: "VERY_FRAGILE",
  };

  // Fatigue résiduelle estimée fin de vélo (0-100)
  const residualFatigueBase: Record<FullRaceScenarioKey, number> = {
    ROBUST: 35,
    AMBITIOUS: 55,
    AGGRESSIVE: isIM ? 85 : 75,
  };

  const labels: Record<FullRaceScenarioKey, { emoji: string; label: string; desc: string; forWho: string }> = {
    ROBUST: {
      emoji: "🛡️",
      label: "Robuste",
      desc: "Vélo conservateur, run en negative split. Tu finis fort, sans casse.",
      forWho: "1re course longue, doute, fatigue, météo difficile, Disponibilité < 60.",
    },
    AMBITIOUS: {
      emoji: "🎯",
      label: "Ambitieux",
      desc: "Vélo centré, run even split à l'allure seuil. Meilleur potentiel si tout aligne.",
      forWho: "Disponibilité ≥ 75, nutrition rodée, parcours connu, conditions clémentes.",
    },
    AGGRESSIVE: {
      emoji: "🔥",
      label: "Agressif",
      desc: "Vélo poussé, run en positive split assumé. Quitte ou double pour un podium.",
      forWho: "Athlète expérimenté, podium en jeu, conditions parfaites, nutrition millimétrée.",
    },
  };

  const bikeStrategy: Record<FullRaceScenarioKey, string> = {
    ROBUST: "Bas du couloir vert. Sortir T2 avec des jambes intactes.",
    AMBITIOUS: "Centre du couloir. Bosses tolérées en haut du vert.",
    AGGRESSIVE: "Haut du couloir, incursions orange tolérées. Risque marqué pour le run.",
  };
  const runStrategy: Record<FullRaceScenarioKey, string> = {
    ROBUST: "Démarrage prudent les 3 premiers km, puis montée progressive vers le centre.",
    AMBITIOUS: "Even split à l'allure seuil, fueling 60-90 g/h obligatoire.",
    AGGRESSIVE: "Tu tiens si glycogène parfait, sinon marche probable dans le 2e tiers.",
  };
  const redFlag: Record<FullRaceScenarioKey, string> = {
    ROBUST: "Si tu sors du vert vélo > 5 min cumulées, tu n'es plus en Robuste.",
    AMBITIOUS: "Drift FC vélo > 8 bpm dans le 2e tiers → repli sur Robuste immédiat.",
    AGGRESSIVE: "Erreur T2, vent ou chaleur = repli forcé sur Ambitieux/Robuste, voire DNF.",
  };

  return (Object.keys(bikeMod) as FullRaceScenarioKey[]).map((key) => {
    const bikeMin = bikeBaselineMin * bikeMod[key];

    // Pénalité run cumulée : base + fatigue de départ + dispo basse + vlamax (sur AGGRESSIVE)
    const runPen =
      baseRunPenalty[key] +
      fatigueAdd * (key === "ROBUST" ? 0.5 : key === "AMBITIOUS" ? 1 : 1.5) +
      Math.max(0, dispoFactor) * (key === "AGGRESSIVE" ? 1.2 : 0.6) +
      (key === "AGGRESSIVE" && vlamaxHigh ? 0.05 : 0);

    // Couplage vélo→course : + surcoût sur les 5 premiers km (~1/8 ou 1/4 du run)
    const couplingExtraMin = (runBaselineMin * (couplingPenalty[key] / 100)) * (isIM ? 0.12 : 0.25);

    // T1 / T2 ajustés
    const t1Min = t1BaseMin + t1Surcharge[key] / 60;
    const t2Min = t2BaseMin + t2SurchargeSec[key] / 60;

    const runMin = runBaselineMin * runPen + couplingExtraMin;
    const totalMin = swimMin + t1Min + bikeMin + t2Min + runMin;

    // Risques ajustés
    const fp = failureProbs[key];
    const dispoRisk = Math.max(0, (70 - dispo) / 2); // dispo 50 → +10pts risque run
    const fatigueRisk = fatigueAdd * 100 * (key === "AGGRESSIVE" ? 1.5 : 1);
    const adjBike = fp.bike + fatigueRisk * 0.4 + dispoRisk * 0.3;
    const adjRun = fp.run + fatigueRisk + dispoRisk + (key === "AGGRESSIVE" && vlamaxHigh ? 8 : 0);

    // Coût métabolique : base + transitions + couplage
    const metabolicCost = Math.min(
      100,
      Math.round(baseMetabolicCost[key] + couplingPenalty[key] * 0.6 + fatigueAdd * 30),
    );

    const residualFatigue = Math.min(
      100,
      Math.round(residualFatigueBase[key] + fatigueAdd * 50 + Math.max(0, dispoFactor) * 30),
    );

    const transitionNote =
      key === "ROBUST"
        ? `T1 propre, T2 maîtrisée (~${Math.round(t2SurchargeSec[key])}s de surcoût). Jambes utilisables dès le 1er km.`
        : key === "AMBITIOUS"
        ? `T2 coûte ~${Math.round(t2SurchargeSec[key])}s : 1 à 2 km à allure dégradée avant verrouillage.`
        : `T2 brutale : ~${Math.round(t2SurchargeSec[key])}s perdues, jelly legs sur 3-5 km. Risque de panique d'allure.`;

    const fatigueNote =
      `Fatigue résiduelle estimée fin vélo : ${residualFatigue}/100` +
      (dispo < 65 ? ` · Disponibilité basse (${Math.round(dispo)}) amplifie le coût` : "") +
      (fatigueState && fatigueState !== "fresh" && fatigueState !== "ok"
        ? ` · État de départ « ${fatigueState} » majore la pénalité run`
        : "");

    return {
      key,
      emoji: labels[key].emoji,
      label: labels[key].label,
      description: labels[key].desc,
      swimMin,
      t1Min,
      bikeMin,
      t2Min,
      runMin,
      totalMin,
      bikeFailurePct: Math.round(Math.min(100, adjBike)),
      runFailurePct: Math.round(Math.min(100, adjRun)),
      combinedFailurePct: combineFailure(adjBike, adjRun),
      metabolicCost,
      robustness: robustness[key],
      bikeStrategy: bikeStrategy[key],
      runStrategy: runStrategy[key],
      redFlag: redFlag[key],
      forWho: labels[key].forWho,
      residualFatigue,
      t1ImpactSec: Math.round(t1Surcharge[key]),
      t2ImpactSec: Math.round(t2SurchargeSec[key]),
      couplingPenaltyPct: couplingPenalty[key],
      transitionNote,
      fatigueNote,
    };
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// UI
// ──────────────────────────────────────────────────────────────────────────────

const ROBUSTNESS_META: Record<FullRaceScenario["robustness"], { label: string; cls: string }> = {
  ROBUST: { label: "Robuste", cls: "text-emerald-600 dark:text-emerald-400" },
  FRAGILE: { label: "Fragile", cls: "text-amber-600 dark:text-amber-400" },
  VERY_FRAGILE: { label: "Très fragile", cls: "text-red-600 dark:text-red-400" },
};

function failureColor(pct: number): string {
  if (pct >= 50) return "text-red-600 dark:text-red-400";
  if (pct >= 25) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

function SegmentRow({
  icon: Icon,
  label,
  duration,
  detail,
  failurePct,
}: {
  icon: React.ElementType;
  label: string;
  duration: string;
  detail?: string;
  failurePct?: number;
}) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">{label}</span>
          <span className="text-xs font-mono font-bold tabular-nums">{duration}</span>
        </div>
        {(detail || failurePct != null) && (
          <div className="flex items-center justify-between gap-2 mt-0.5">
            {detail && <span className="text-[11px] text-muted-foreground leading-snug">{detail}</span>}
            {failurePct != null && (
              <span className={cn("text-[10px] font-mono shrink-0", failureColor(failurePct))}>
                échec {failurePct}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ScenarioCard({ scenario, isIM }: { scenario: FullRaceScenario; isIM: boolean }) {
  const rob = ROBUSTNESS_META[scenario.robustness];
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-xl">{scenario.emoji}</span>
              Course complète — {scenario.label}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{scenario.description}</p>
          </div>
          <Badge variant="outline" className={cn("text-[10px]", rob.cls)}>
            {rob.label}
          </Badge>
        </div>

        {/* Total + risk highlight */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="rounded-md border-2 border-primary/40 bg-primary/10 p-2 text-center">
            <div className="text-[9px] uppercase tracking-wide text-primary flex items-center justify-center gap-1">
              <Timer className="h-2.5 w-2.5" /> Temps total
            </div>
            <div className="text-base font-bold font-mono text-primary tabular-nums">
              {fmtDuration(scenario.totalMin)}
            </div>
          </div>
          <div className="rounded-md border bg-card/50 p-2 text-center">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground flex items-center justify-center gap-1">
              <AlertTriangle className="h-2.5 w-2.5" /> Échec course
            </div>
            <div className={cn("text-base font-bold font-mono", failureColor(scenario.combinedFailurePct))}>
              {scenario.combinedFailurePct}%
            </div>
          </div>
          <div className="rounded-md border bg-card/50 p-2 text-center">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground flex items-center justify-center gap-1">
              <Flame className="h-2.5 w-2.5" /> Coût
            </div>
            <div
              className={cn(
                "text-base font-bold font-mono",
                scenario.metabolicCost > 80
                  ? "text-red-600"
                  : scenario.metabolicCost > 60
                  ? "text-amber-600"
                  : "text-emerald-600",
              )}
            >
              {scenario.metabolicCost}/100
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3 space-y-3">
        {/* Décomposition par segment */}
        <div className="rounded-lg border bg-muted/20 px-3 py-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
            <Activity className="h-3 w-3" /> Décomposition
          </h4>
          <div className="divide-y divide-border/50">
            <SegmentRow
              icon={Waves}
              label={isIM ? "Natation 3.8 km" : "Natation 1.9 km"}
              duration={fmtDuration(scenario.swimMin)}
              detail="Effort confortable, sortir frais"
            />
            <SegmentRow
              icon={ChevronRight}
              label="T1 (eau → vélo)"
              duration={fmtDuration(scenario.t1Min)}
              detail={`Surcoût ${scenario.t1ImpactSec}s vs base : casque, chaussures, départ contrôlé.`}
            />
            <SegmentRow
              icon={Bike}
              label={isIM ? "Vélo 180 km" : "Vélo 90 km"}
              duration={fmtDuration(scenario.bikeMin)}
              detail={scenario.bikeStrategy}
              failurePct={scenario.bikeFailurePct}
            />
            <SegmentRow
              icon={ChevronRight}
              label="T2 (vélo → course)"
              duration={fmtDuration(scenario.t2Min)}
              detail={`Surcoût ${scenario.t2ImpactSec}s : jelly legs + couplage +${scenario.couplingPenaltyPct}% sur 5 premiers km.`}
            />
            <SegmentRow
              icon={Footprints}
              label={isIM ? "Marathon 42.2 km" : "Semi 21.1 km"}
              duration={fmtDuration(scenario.runMin)}
              detail={scenario.runStrategy}
              failurePct={scenario.runFailurePct}
            />
          </div>
        </div>

        {/* Fatigue & transitions */}
        <div className="rounded-md border bg-amber-500/5 border-amber-500/20 p-2.5 text-[11px] space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
              <Flame className="h-3 w-3" /> Fatigue & transitions
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              T1 +{scenario.t1ImpactSec}s · T2 +{scenario.t2ImpactSec}s · couplage +{scenario.couplingPenaltyPct}%
            </span>
          </div>
          {/* Barre fatigue résiduelle */}
          <div>
            <div className="flex items-center justify-between text-[10px] mb-0.5">
              <span className="text-muted-foreground">Fatigue résiduelle fin vélo</span>
              <span className="font-mono font-semibold">{scenario.residualFatigue}/100</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  scenario.residualFatigue > 75
                    ? "bg-red-500"
                    : scenario.residualFatigue > 50
                    ? "bg-amber-500"
                    : "bg-emerald-500",
                )}
                style={{ width: `${scenario.residualFatigue}%` }}
              />
            </div>
          </div>
          <p className="text-muted-foreground leading-snug">{scenario.transitionNote}</p>
          <p className="text-muted-foreground leading-snug">{scenario.fatigueNote}</p>
        </div>

        {/* Pour qui + drapeau rouge */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-md border bg-emerald-500/5 border-emerald-500/20 p-2 text-[11px]">
            <div className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 mb-0.5">
              <Target className="h-3 w-3" /> Pour qui ?
            </div>
            <p className="text-muted-foreground leading-snug">{scenario.forWho}</p>
          </div>
          <div className="rounded-md border bg-red-500/5 border-red-500/20 p-2 text-[11px]">
            <div className="flex items-center gap-1 font-semibold text-red-700 dark:text-red-400 mb-0.5">
              <AlertTriangle className="h-3 w-3" /> Drapeau rouge
            </div>
            <p className="text-muted-foreground leading-snug">{scenario.redFlag}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Composant principal
// ──────────────────────────────────────────────────────────────────────────────

export function TriathlonFullRaceSimulationCard(props: Props) {
  const isIM = props.raceObjective === "IM";
  const scenarios = useMemo(() => buildScenarios(props), [props]);
  const [tab, setTab] = useState<FullRaceScenarioKey>(
    props.disponibiliteScore != null && props.disponibiliteScore >= 75
      ? "AMBITIOUS"
      : props.disponibiliteScore != null && props.disponibiliteScore < 55
      ? "ROBUST"
      : "AMBITIOUS",
  );

  const recommended = scenarios.find((s) => s.key === tab)!;

  return (
    <div className={cn("space-y-3", props.className)}>
      {/* En-tête contextuel */}
      <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <div className="font-semibold text-foreground flex items-center gap-2 flex-wrap">
              Simulation course complète — {isIM ? "Ironman 226" : "Half Ironman 113"}
              <Badge variant="outline" className="text-[9px]">Vélo + Course combinés</Badge>
            </div>
            <p className="text-muted-foreground leading-snug">
              Estimation du temps total et du risque sur l'<strong>ensemble de la course</strong>, en
              tenant compte de la <strong>fatigue résiduelle du vélo sur le run</strong> selon le
              scénario choisi. Plus tu pousses sur le vélo, plus le run paie cash.
            </p>
          </div>
        </div>
      </div>

      {/* Récapitulatif format + paramètres synchronisés */}
      <FormatRecap isIM={isIM} scenarios={scenarios} props={props} />
        <TabsList className="grid grid-cols-3 w-full">
          {scenarios.map((s) => (
            <TabsTrigger key={s.key} value={s.key} className="text-xs">
              <span className="mr-1">{s.emoji}</span>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {scenarios.map((s) => (
          <TabsContent key={s.key} value={s.key} className="mt-3">
            <ScenarioCard scenario={s} isIM={isIM} />
          </TabsContent>
        ))}
      </Tabs>

      {/* Comparatif rapide */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" /> Comparatif des 3 plans
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-1.5 pr-2">Plan</th>
                <th className="py-1.5 pr-2 text-right">Vélo</th>
                <th className="py-1.5 pr-2 text-right">Run</th>
                <th className="py-1.5 pr-2 text-right">Total</th>
                <th className="py-1.5 pr-2 text-right">Échec</th>
                <th className="py-1.5 pr-2">Robust.</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => {
                const rob = ROBUSTNESS_META[s.robustness];
                const isSelected = s.key === tab;
                return (
                  <tr
                    key={s.key}
                    className={cn(
                      "border-b last:border-0 transition-colors",
                      isSelected && "bg-primary/5",
                    )}
                  >
                    <td className="py-1.5 pr-2 font-semibold">
                      {s.emoji} {s.label}
                    </td>
                    <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{fmtDuration(s.bikeMin)}</td>
                    <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{fmtDuration(s.runMin)}</td>
                    <td className="py-1.5 pr-2 text-right font-mono font-bold tabular-nums">
                      {fmtDuration(s.totalMin)}
                    </td>
                    <td className={cn("py-1.5 pr-2 text-right font-mono", failureColor(s.combinedFailurePct))}>
                      {s.combinedFailurePct}%
                    </td>
                    <td className={cn("py-1.5 pr-2 font-medium", rob.cls)}>{rob.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[10px] text-muted-foreground italic mt-2 leading-snug">
            Calcul : vélo modulé selon scénario (±3 à 6%) + pénalité run de fatigue résiduelle
            (Robuste 0%, Ambitieux +3%, Agressif +{isIM ? "15" : "10"}%). Risque combiné =
            1 − (1 − P_vélo) × (1 − P_run).
          </p>
        </CardContent>
      </Card>

      {/* Recommandation finale */}
      <div
        className={cn(
          "rounded-lg border p-3 text-xs",
          recommended.combinedFailurePct >= 50
            ? "border-red-500/30 bg-red-500/5"
            : recommended.combinedFailurePct >= 25
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-emerald-500/30 bg-emerald-500/5",
        )}
      >
        <div className="font-semibold mb-1">
          ⚖️ Verdict pour le plan « {recommended.label} »
        </div>
        <p className="text-muted-foreground leading-snug">
          Temps cible : <strong className="text-foreground font-mono">{fmtDuration(recommended.totalMin)}</strong>{" "}
          · Risque global : <strong className={failureColor(recommended.combinedFailurePct)}>{recommended.combinedFailurePct}%</strong>.{" "}
          {recommended.combinedFailurePct >= 50
            ? "Niveau de risque élevé : assure-toi que toutes les conditions sont réunies."
            : recommended.combinedFailurePct >= 25
            ? "Risque modéré : reste vigilant sur les drapeaux rouges."
            : "Risque maîtrisé : exécute le plan sans dévier."}
        </p>
      </div>
    </div>
  );
}

export default TriathlonFullRaceSimulationCard;
