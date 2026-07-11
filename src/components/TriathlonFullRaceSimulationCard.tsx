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
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
  Sliders,
  RotateCcw,
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

/**
 * Construit un scénario unique. `bikeIntensityOffsetPct` permet à l'utilisateur
 * de simuler en direct un vélo plus dur (+) ou plus facile (-) que la baseline
 * du scénario, en pourcentage de puissance/allure relative.
 *
 * Effets de l'offset (modèle simplifié calibré TFCL™) :
 *  • +1 % d'intensité vélo ≈ −0.6 % de temps vélo
 *  • +1 % d'intensité vélo ≈ +0.8 % de pénalité run (fatigue résiduelle)
 *  • +1 % d'intensité vélo ≈ +1.2 pts de fatigue résiduelle fin vélo
 *  • +1 % d'intensité vélo ≈ +1.5 pts de risque vélo, +2 pts de risque run
 *  • Couplage T2 : +0.4 pt par % d'intensité supplémentaire
 */
function buildScenario(
  key: FullRaceScenarioKey,
  props: Props,
  bikeIntensityOffsetPct: number = 0,
): FullRaceScenario {
  const { raceObjective, bikeBaselineMin, runBaselineMin, vlamaxValue, disponibiliteScore, fatigueState } = props;
  const isIM = raceObjective === "IM";

  const swimMin = isIM ? 65 : 33;
  const t1BaseMin = isIM ? 6 : 3;
  const t2BaseMin = isIM ? 4 : 2;

  const dispo = disponibiliteScore ?? 70;
  const dispoFactor = (75 - dispo) / 100;

  const fatigueMap: Record<NonNullable<Props["fatigueState"]>, number> = {
    fresh: 0.0,
    ok: 0.02,
    fatigued: 0.06,
    high: 0.10,
    injured: 0.15,
  };
  const fatigueAdd = fatigueState ? fatigueMap[fatigueState] : 0.02;
  // F41 — insufficient-data guard : plus de fake 0.4. Sans VLamax, pas de flag "glyco haute".
  const vlamaxHigh = vlamaxValue != null && vlamaxValue >= 0.5;

  const bikeMod: Record<FullRaceScenarioKey, number> = {
    ROBUST: 1.06,
    AMBITIOUS: 1.0,
    AGGRESSIVE: 0.97,
  };
  const baseRunPenalty: Record<FullRaceScenarioKey, number> = {
    ROBUST: 1.00,
    AMBITIOUS: 1.03,
    AGGRESSIVE: isIM ? 1.15 : 1.10,
  };
  const t1Surcharge: Record<FullRaceScenarioKey, number> = { ROBUST: 0, AMBITIOUS: 10, AGGRESSIVE: 20 };
  const t2SurchargeSec: Record<FullRaceScenarioKey, number> = {
    ROBUST: isIM ? 30 : 20,
    AMBITIOUS: isIM ? 75 : 45,
    AGGRESSIVE: isIM ? 150 : 90,
  };
  const couplingPenalty: Record<FullRaceScenarioKey, number> = {
    ROBUST: 1.5,
    AMBITIOUS: 4,
    AGGRESSIVE: isIM ? 9 : 7,
  };
  const failureProbs: Record<FullRaceScenarioKey, { bike: number; run: number }> = {
    ROBUST: { bike: 4, run: 6 },
    AMBITIOUS: { bike: 12, run: isIM ? 22 : 18 },
    AGGRESSIVE: { bike: 28, run: isIM ? 55 : 45 },
  };
  const baseMetabolicCost: Record<FullRaceScenarioKey, number> = { ROBUST: 55, AMBITIOUS: 75, AGGRESSIVE: 95 };
  const robustnessBase: Record<FullRaceScenarioKey, FullRaceScenario["robustness"]> = {
    ROBUST: "ROBUST",
    AMBITIOUS: "FRAGILE",
    AGGRESSIVE: "VERY_FRAGILE",
  };
  const residualFatigueBase: Record<FullRaceScenarioKey, number> = {
    ROBUST: 35,
    AMBITIOUS: 55,
    AGGRESSIVE: isIM ? 85 : 75,
  };

  const labels: Record<FullRaceScenarioKey, { emoji: string; label: string; desc: string; forWho: string }> = {
    ROBUST: {
      emoji: "🛡️", label: "Robuste",
      desc: "Vélo conservateur, run en negative split. Tu finis fort, sans casse.",
      forWho: "1re course longue, doute, fatigue, météo difficile, Disponibilité < 60.",
    },
    AMBITIOUS: {
      emoji: "🎯", label: "Ambitieux",
      desc: "Vélo centré, run even split à l'allure seuil. Meilleur potentiel si tout aligne.",
      forWho: "Disponibilité ≥ 75, nutrition rodée, parcours connu, conditions clémentes.",
    },
    AGGRESSIVE: {
      emoji: "🔥", label: "Agressif",
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

  // ── Application de l'offset interactif sur l'intensité vélo ───────────────
  const off = bikeIntensityOffsetPct; // peut être négatif
  const bikeTimeFactor = bikeMod[key] * (1 - off * 0.006); // +1% intensité ≈ −0.6% temps
  const bikeMin = bikeBaselineMin * bikeTimeFactor;

  const offRunPenalty = Math.max(0, off) * 0.008 + Math.max(0, -off) * -0.003;
  const runPen =
    baseRunPenalty[key] +
    fatigueAdd * (key === "ROBUST" ? 0.5 : key === "AMBITIOUS" ? 1 : 1.5) +
    Math.max(0, dispoFactor) * (key === "AGGRESSIVE" ? 1.2 : 0.6) +
    (key === "AGGRESSIVE" && vlamaxHigh ? 0.05 : 0) +
    offRunPenalty;

  const couplingAdj = Math.max(0, couplingPenalty[key] + off * 0.4);
  const couplingExtraMin = (runBaselineMin * (couplingAdj / 100)) * (isIM ? 0.12 : 0.25);

  const t1ExtraSec = t1Surcharge[key] + Math.max(0, off) * 1.5;
  const t2ExtraSec = t2SurchargeSec[key] + Math.max(0, off) * (isIM ? 8 : 5);
  const t1Min = t1BaseMin + t1ExtraSec / 60;
  const t2Min = t2BaseMin + t2ExtraSec / 60;

  const runMin = runBaselineMin * runPen + couplingExtraMin;
  const totalMin = swimMin + t1Min + bikeMin + t2Min + runMin;

  const fp = failureProbs[key];
  const dispoRisk = Math.max(0, (70 - dispo) / 2);
  const fatigueRisk = fatigueAdd * 100 * (key === "AGGRESSIVE" ? 1.5 : 1);
  const adjBike = fp.bike + fatigueRisk * 0.4 + dispoRisk * 0.3 + Math.max(0, off) * 1.5 + Math.max(0, -off) * -0.6;
  const adjRun =
    fp.run + fatigueRisk + dispoRisk +
    (key === "AGGRESSIVE" && vlamaxHigh ? 8 : 0) +
    Math.max(0, off) * 2.0 + Math.max(0, -off) * -1.0;

  const metabolicCost = Math.min(
    100,
    Math.round(baseMetabolicCost[key] + couplingAdj * 0.6 + fatigueAdd * 30 + off * 1.2),
  );

  const residualFatigue = Math.min(
    100,
    Math.max(0, Math.round(residualFatigueBase[key] + fatigueAdd * 50 + Math.max(0, dispoFactor) * 30 + off * 1.2)),
  );

  // Robustesse dynamique : peut basculer si l'offset est très agressif/conservateur
  const combined = combineFailure(adjBike, adjRun);
  let dynamicRobustness: FullRaceScenario["robustness"] = robustnessBase[key];
  if (combined >= 55) dynamicRobustness = "VERY_FRAGILE";
  else if (combined >= 30) dynamicRobustness = "FRAGILE";
  else dynamicRobustness = "ROBUST";

  const transitionNote =
    key === "ROBUST"
      ? `T1 propre, T2 maîtrisée (~${Math.round(t2ExtraSec)}s de surcoût). Jambes utilisables dès le 1er km.`
      : key === "AMBITIOUS"
      ? `T2 coûte ~${Math.round(t2ExtraSec)}s : 1 à 2 km à allure dégradée avant verrouillage.`
      : `T2 brutale : ~${Math.round(t2ExtraSec)}s perdues, jelly legs sur 3-5 km. Risque de panique d'allure.`;

  const fatigueNote =
    `Fatigue résiduelle estimée fin vélo : ${residualFatigue}/100` +
    (off !== 0 ? ` · Offset vélo ${off > 0 ? "+" : ""}${off}% appliqué` : "") +
    (dispo < 65 ? ` · Disponibilité basse (${Math.round(dispo)}) amplifie le coût` : "") +
    (fatigueState && fatigueState !== "fresh" && fatigueState !== "ok"
      ? ` · État de départ « ${fatigueState} » majore la pénalité run`
      : "");

  return {
    key,
    emoji: labels[key].emoji,
    label: labels[key].label,
    description: labels[key].desc,
    swimMin, t1Min, bikeMin, t2Min, runMin, totalMin,
    bikeFailurePct: Math.round(Math.max(0, Math.min(100, adjBike))),
    runFailurePct: Math.round(Math.max(0, Math.min(100, adjRun))),
    combinedFailurePct: combined,
    metabolicCost,
    robustness: dynamicRobustness,
    bikeStrategy: bikeStrategy[key],
    runStrategy: runStrategy[key],
    redFlag: redFlag[key],
    forWho: labels[key].forWho,
    residualFatigue,
    t1ImpactSec: Math.round(t1ExtraSec),
    t2ImpactSec: Math.round(t2ExtraSec),
    couplingPenaltyPct: Math.round(couplingAdj * 10) / 10,
    transitionNote,
    fatigueNote,
  };
}

function buildScenarios(props: Props): FullRaceScenario[] {
  return (["ROBUST", "AMBITIOUS", "AGGRESSIVE"] as FullRaceScenarioKey[]).map((k) =>
    buildScenario(k, props, 0),
  );
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

function MetricBar({
  label,
  value,
  max = 100,
  suffix = "%",
  tone,
}: {
  label: string;
  value: number;
  max?: number;
  suffix?: string;
  tone: "good" | "warn" | "bad";
}) {
  const pct = Math.min(100, (value / max) * 100);
  const barCls =
    tone === "bad" ? "bg-red-500" : tone === "warn" ? "bg-amber-500" : "bg-emerald-500";
  const txtCls =
    tone === "bad"
      ? "text-red-600 dark:text-red-400"
      : tone === "warn"
      ? "text-amber-600 dark:text-amber-400"
      : "text-emerald-600 dark:text-emerald-400";
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-0.5">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-mono font-semibold", txtCls)}>
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full transition-all", barCls)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function tone(value: number, warn: number, bad: number): "good" | "warn" | "bad" {
  if (value >= bad) return "bad";
  if (value >= warn) return "warn";
  return "good";
}

function BikeVsRunCompare({ scenario }: { scenario: FullRaceScenario }) {
  // Coût métabolique réparti : vélo porte ~60% du coût en endurance, run le reste + couplage
  const bikeCost = Math.round(scenario.metabolicCost * 0.55);
  const runCost = Math.min(100, Math.round(scenario.metabolicCost * 0.45 + scenario.couplingPenaltyPct));
  const bikeRobust = Math.max(0, 100 - scenario.bikeFailurePct - Math.round(scenario.residualFatigue * 0.2));
  const runRobust = Math.max(
    0,
    100 - scenario.runFailurePct - Math.round(scenario.residualFatigue * 0.4),
  );

  return (
    <div className="rounded-lg border bg-card/50 p-3">
      <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
        <TrendingUp className="h-3 w-3" /> Vélo vs Course — comparatif côte à côte
      </h4>
      <div className="grid grid-cols-2 gap-3">
        {/* Vélo */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-[11px]">
            <Bike className="h-3.5 w-3.5 text-blue-500" /> Vélo
          </div>
          <MetricBar
            label="Risque d'échec"
            value={scenario.bikeFailurePct}
            tone={tone(scenario.bikeFailurePct, 25, 50)}
          />
          <MetricBar
            label="Coût métabolique"
            value={bikeCost}
            tone={tone(bikeCost, 60, 80)}
          />
          <MetricBar
            label="Robustesse"
            value={bikeRobust}
            tone={bikeRobust >= 70 ? "good" : bikeRobust >= 50 ? "warn" : "bad"}
          />
        </div>
        {/* Course */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-[11px]">
            <Footprints className="h-3.5 w-3.5 text-orange-500" /> Course
          </div>
          <MetricBar
            label="Risque d'échec"
            value={scenario.runFailurePct}
            tone={tone(scenario.runFailurePct, 25, 50)}
          />
          <MetricBar label="Coût métabolique" value={runCost} tone={tone(runCost, 60, 80)} />
          <MetricBar
            label="Robustesse"
            value={runRobust}
            tone={runRobust >= 70 ? "good" : runRobust >= 50 ? "warn" : "bad"}
          />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground italic mt-2 leading-snug">
        Le segment <strong>{scenario.runFailurePct > scenario.bikeFailurePct ? "course" : "vélo"}</strong> est
        celui qui supporte le plus de risque dans ce scénario. C'est lui qui doit dicter la décision.
      </p>
    </div>
  );
}

function AthleteVerdict({ scenario, isIM }: { scenario: FullRaceScenario; isIM: boolean }) {
  const r = scenario.combinedFailurePct;
  const weakest =
    scenario.runFailurePct > scenario.bikeFailurePct + 5
      ? "course"
      : scenario.bikeFailurePct > scenario.runFailurePct + 5
      ? "vélo"
      : "équilibrée";

  let verdict: string;
  let action: string;
  let cls: string;

  if (r >= 50) {
    verdict = `🚨 Ce scénario est trop fragile pour ton état actuel : ${r}% de probabilité de casse sur ${isIM ? "l'Ironman" : "le 70.3"}.`;
    action =
      weakest === "course"
        ? "Repli obligatoire sur le scénario inférieur : la course casse avant la fin."
        : weakest === "vélo"
        ? "Allège le vélo de 5-10 W : tu n'arrives pas en T2 dans un état viable."
        : "Repli sur un scénario plus prudent : aucun segment n'est sécurisé.";
    cls = "border-red-500/40 bg-red-500/5";
  } else if (r >= 25) {
    verdict = `⚠️ Scénario tenable mais exigeant : ${r}% de risque, exécution sans erreur exigée.`;
    action =
      weakest === "course"
        ? `Sécurise la course : fueling 60-90 g/h, démarrage prudent 3 km, surveille le drift FC.`
        : weakest === "vélo"
        ? `Sécurise le vélo : reste dans le couloir vert, pas d'attaque sur les bosses.`
        : `Exécute strictement le plan, surveille les drapeaux rouges, n'improvise pas.`;
    cls = "border-amber-500/40 bg-amber-500/5";
  } else {
    verdict = `✅ Scénario maîtrisé : ${r}% de risque global, bon équilibre vélo / course.`;
    action = `Tu peux exécuter ce plan avec confiance. Garde une marge sur le segment ${weakest === "équilibrée" ? "le plus exposé en cas d'imprévu météo" : weakest} pour absorber un imprévu.`;
    cls = "border-emerald-500/40 bg-emerald-500/5";
  }

  return (
    <div className={cn("rounded-lg border-2 p-3 text-xs space-y-1.5", cls)}>
      <div className="font-bold text-sm">⚖️ Conclusion pour l'athlète</div>
      <p className="leading-snug">{verdict}</p>
      <p className="text-muted-foreground leading-snug">
        <strong>Action :</strong> {action}
      </p>
      <div className="grid grid-cols-3 gap-1.5 pt-1">
        <div className="rounded border bg-card/50 px-2 py-1 text-center">
          <div className="text-[9px] uppercase text-muted-foreground">Temps cible</div>
          <div className="font-mono font-bold tabular-nums">{fmtDuration(scenario.totalMin)}</div>
        </div>
        <div className="rounded border bg-card/50 px-2 py-1 text-center">
          <div className="text-[9px] uppercase text-muted-foreground">Maillon faible</div>
          <div className="font-semibold capitalize">{weakest}</div>
        </div>
        <div className="rounded border bg-card/50 px-2 py-1 text-center">
          <div className="text-[9px] uppercase text-muted-foreground">Robustesse</div>
          <div className={cn("font-semibold", ROBUSTNESS_META[scenario.robustness].cls)}>
            {ROBUSTNESS_META[scenario.robustness].label}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeakestLinkDetail({
  scenario,
  isIM,
  vlamaxValue,
  fatigueState,
  disponibiliteScore,
}: {
  scenario: FullRaceScenario;
  isIM: boolean;
  vlamaxValue?: number | null;
  fatigueState?: Props["fatigueState"];
  disponibiliteScore?: number | null;
}) {
  const bikeRisk = scenario.bikeFailurePct;
  const runRisk = scenario.runFailurePct;
  const delta = runRisk - bikeRisk;
  const weakest: "course" | "vélo" | "équilibrée" =
    delta > 5 ? "course" : delta < -5 ? "vélo" : "équilibrée";

  // Causes objectives détectées
  const causes: { label: string; weight: number }[] = [];
  const vlamaxHigh = (vlamaxValue ?? 0) >= 0.55;
  const heavyFatigue = fatigueState === "fatigued" || fatigueState === "high";
  const lowDispo = (disponibiliteScore ?? 100) < 60;
  const highCoupling = scenario.couplingPenaltyPct >= 6;
  const highResidual = scenario.residualFatigue >= 55;

  if (weakest === "course") {
    if (highCoupling) causes.push({ label: `Couplage T2 fort (+${scenario.couplingPenaltyPct} pts les 5 premiers km)`, weight: 3 });
    if (highResidual) causes.push({ label: `Réserves entamées en T2 (fatigue résiduelle ${scenario.residualFatigue}/100)`, weight: 3 });
    if (vlamaxHigh) causes.push({ label: `Profil glycolytique (VLamax ${vlamaxValue?.toFixed(2)}) — coût en O₂ élevé sur CAP longue`, weight: 2 });
    if (heavyFatigue) causes.push({ label: `État de fatigue préalable (${fatigueState})`, weight: 2 });
    if (scenario.t2ImpactSec >= 25) causes.push({ label: `Jelly legs marqués (+${scenario.t2ImpactSec}s sur les 2 premiers km)`, weight: 1 });
  } else if (weakest === "vélo") {
    if (lowDispo) causes.push({ label: `Disponibilité limitée (${disponibiliteScore}/100) — tenue de puissance fragile`, weight: 3 });
    if (heavyFatigue) causes.push({ label: `État de fatigue (${fatigueState}) — drift puissance attendu`, weight: 2 });
    if (highResidual) causes.push({ label: `Coût métabolique élevé (${scenario.metabolicCost}/100) en endurance`, weight: 2 });
    causes.push({ label: `Risque vélo isolé ${bikeRisk}% > risque course ${runRisk}%`, weight: 1 });
  } else {
    causes.push({ label: `Risque réparti vélo/course (Δ ${Math.abs(delta)} pts) — exécution = facteur n°1`, weight: 2 });
    if (vlamaxHigh) causes.push({ label: `Profil VLamax élevé : la moindre erreur d'allure cascade`, weight: 1 });
    if (lowDispo) causes.push({ label: `Disponibilité ${disponibiliteScore}/100 — peu de marge globale`, weight: 1 });
  }

  // Ajustements concrets
  const adjustments: { axis: "Puissance vélo" | "Allure CAP" | "Fueling" | "Transitions"; advice: string }[] = [];

  if (weakest === "course") {
    const watts = scenario.key === "AGGRESSIVE" ? 15 : scenario.key === "AMBITIOUS" ? 8 : 5;
    adjustments.push({
      axis: "Puissance vélo",
      advice: `Baisse la cible vélo de ${watts} W (≈ -3 à -5% IF). Plafonne les pics côtes à +30 W max, jamais en zone 4.`,
    });
    adjustments.push({
      axis: "Allure CAP",
      advice: `Démarre 10-15 s/km plus lent que la cible sur 3 km, puis recale. Vise un négatif split sur la 2ᵉ moitié.`,
    });
    adjustments.push({
      axis: "Fueling",
      advice: `Monte à ${isIM ? "90-110" : "70-90"} g CHO/h sur le vélo (multi-source 2:1 glucose:fructose). 500 mg Na/h. Démarre la CAP avec un gel + 200 mL eau dans les 5 premières minutes.`,
    });
    adjustments.push({
      axis: "Transitions",
      advice: `T2 : 30 s de marche rapide + cadence 90+ dès le 1ᵉʳ km pour casser le couplage avant de chercher l'allure.`,
    });
  } else if (weakest === "vélo") {
    adjustments.push({
      axis: "Puissance vélo",
      advice: `Recule la cible IF de 0.02-0.03 (~ -8 à -12 W). Hold steady : variabilité < 1.05, pas de surge > +20% sur > 30 s.`,
    });
    adjustments.push({
      axis: "Fueling",
      advice: `Augmente l'apport vélo à ${isIM ? "100-120" : "80-100"} g CHO/h dès le 1ᵉʳ heure (anti-drift). Hydratation 600-800 mL/h selon T°.`,
    });
    adjustments.push({
      axis: "Allure CAP",
      advice: `Plan CAP inchangé (le vélo est le verrou). Si vélo bien exécuté, marge pour finir +5 s/km au seuil.`,
    });
    adjustments.push({
      axis: "Transitions",
      advice: `T1 calme (pas d'à-coup cardiaque), monte FC progressivement les 10 premières minutes vélo.`,
    });
  } else {
    adjustments.push({
      axis: "Puissance vélo",
      advice: `Tiens la cible IF stricte ±0.01. Aucune attaque, zéro pic > zone 3 sur les bosses.`,
    });
    adjustments.push({
      axis: "Allure CAP",
      advice: `Premier km +10 s/km, puis cible. Drapeau rouge si FC > seuil + 8 bpm avec allure correcte → ralentis.`,
    });
    adjustments.push({
      axis: "Fueling",
      advice: `${isIM ? "90" : "75"} g CHO/h dès le départ vélo, 500 mg Na/h. Pas d'expérimentation jour J.`,
    });
  }

  const headerCls =
    weakest === "course"
      ? "border-orange-500/40 bg-orange-500/5"
      : weakest === "vélo"
      ? "border-blue-500/40 bg-blue-500/5"
      : "border-amber-500/40 bg-amber-500/5";

  const Icon = weakest === "course" ? Footprints : weakest === "vélo" ? Bike : TrendingUp;
  const iconCls =
    weakest === "course" ? "text-orange-500" : weakest === "vélo" ? "text-blue-500" : "text-amber-500";

  return (
    <div className={cn("rounded-lg border-2 p-3 text-xs space-y-2", headerCls)}>
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", iconCls)} />
        <div className="font-bold text-sm">
          🔗 Maillon faible : <span className="capitalize">{weakest}</span>
          <span className="text-muted-foreground font-normal ml-1.5">
            (vélo {bikeRisk}% · course {runRisk}%)
          </span>
        </div>
      </div>

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Pourquoi
        </div>
        <ul className="space-y-0.5 leading-snug">
          {causes
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 4)
            .map((c, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-muted-foreground">•</span>
                <span>{c.label}</span>
              </li>
            ))}
        </ul>
      </div>

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Quoi ajuster concrètement
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {adjustments.map((a, i) => (
            <div key={i} className="rounded border bg-card/60 p-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
                {a.axis}
              </div>
              <div className="leading-snug">{a.advice}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BikeIntensitySlider({
  offset,
  onChange,
  baseline,
  current,
}: {
  offset: number;
  onChange: (v: number) => void;
  baseline: FullRaceScenario;
  current: FullRaceScenario;
}) {
  const deltaTotal = Math.round(current.totalMin - baseline.totalMin);
  const deltaRisk = current.combinedFailurePct - baseline.combinedFailurePct;
  const deltaRunRisk = current.runFailurePct - baseline.runFailurePct;
  const fmtSign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  const fmtDelta = (m: number) => {
    if (m === 0) return "0";
    const s = m > 0 ? "+" : "−";
    const a = Math.abs(m);
    if (a >= 60) return `${s}${Math.floor(a / 60)}h${(a % 60).toString().padStart(2, "0")}`;
    return `${s}${a}min`;
  };
  return (
    <div className="rounded-lg border-2 border-blue-500/30 bg-blue-500/5 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 font-semibold text-xs text-blue-700 dark:text-blue-400">
          <Sliders className="h-3.5 w-3.5" />
          Curseur intensité vélo (live)
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "text-[11px] font-mono",
              offset > 0
                ? "border-red-500/40 text-red-600"
                : offset < 0
                ? "border-emerald-500/40 text-emerald-600"
                : "",
            )}
          >
            {fmtSign(offset)} % vélo
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => onChange(0)}
            disabled={offset === 0}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      <Slider
        value={[offset]}
        min={-10}
        max={10}
        step={1}
        onValueChange={(v) => onChange(v[0] ?? 0)}
        className="my-1"
      />
      <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
        <span>−10 % (très conservateur)</span>
        <span>baseline scénario</span>
        <span>+10 % (très poussé)</span>
      </div>

      {/* Live deltas */}
      <div className="grid grid-cols-3 gap-1.5 pt-1">
        <div className="rounded border bg-card/60 px-2 py-1 text-center">
          <div className="text-[9px] uppercase text-muted-foreground">Δ Temps total</div>
          <div
            className={cn(
              "font-mono font-bold text-xs tabular-nums",
              deltaTotal < 0 ? "text-emerald-600" : deltaTotal > 0 ? "text-red-600" : "",
            )}
          >
            {fmtDelta(deltaTotal)}
          </div>
        </div>
        <div className="rounded border bg-card/60 px-2 py-1 text-center">
          <div className="text-[9px] uppercase text-muted-foreground">Δ Risque global</div>
          <div
            className={cn(
              "font-mono font-bold text-xs tabular-nums",
              deltaRisk > 0 ? "text-red-600" : deltaRisk < 0 ? "text-emerald-600" : "",
            )}
          >
            {fmtSign(deltaRisk)} pts
          </div>
        </div>
        <div className="rounded border bg-card/60 px-2 py-1 text-center">
          <div className="text-[9px] uppercase text-muted-foreground">Δ Risque run</div>
          <div
            className={cn(
              "font-mono font-bold text-xs tabular-nums",
              deltaRunRisk > 0 ? "text-red-600" : deltaRunRisk < 0 ? "text-emerald-600" : "",
            )}
          >
            {fmtSign(deltaRunRisk)} pts
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground italic leading-snug">
        Modèle TFCL™ : +1 % d'intensité vélo = −0,6 % de temps vélo, mais +0,8 % de pénalité run,
        +1,2 pt de fatigue résiduelle et +2 pts de risque sur le run.
      </p>
    </div>
  );
}

function ScenarioCard({
  scenarioKey,
  props,
  isIM,
}: {
  scenarioKey: FullRaceScenarioKey;
  props: Props;
  isIM: boolean;
}) {
  const [offset, setOffset] = useState<number>(0);
  const baseline = useMemo(() => buildScenario(scenarioKey, props, 0), [scenarioKey, props]);
  const scenario = useMemo(
    () => buildScenario(scenarioKey, props, offset),
    [scenarioKey, props, offset],
  );
  return ScenarioCardInner({ scenario, baseline, isIM, offset, setOffset, props });
}

function ScenarioCardInner({
  scenario,
  baseline,
  isIM,
  offset,
  setOffset,
  props,
}: {
  scenario: FullRaceScenario;
  baseline: FullRaceScenario;
  isIM: boolean;
  offset: number;
  setOffset: (v: number) => void;
  props: Props;
}) {
  const { vlamaxValue, fatigueState, disponibiliteScore } = props;
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
        {/* Curseur intensité vélo (live) */}
        <BikeIntensitySlider
          offset={offset}
          onChange={setOffset}
          baseline={baseline}
          current={scenario}
        />

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

        {/* Comparatif côte à côte Vélo vs Course */}
        <BikeVsRunCompare scenario={scenario} />

        {/* Détail maillon faible */}
        <WeakestLinkDetail
          scenario={scenario}
          isIM={isIM}
          vlamaxValue={vlamaxValue}
          fatigueState={fatigueState}
          disponibiliteScore={disponibiliteScore}
        />

        {/* Conclusion unique athlète */}
        <AthleteVerdict scenario={scenario} isIM={isIM} />
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
// Récap format + paramètres synchronisés
// ──────────────────────────────────────────────────────────────────────────────

function FormatRecap({
  isIM,
  scenarios,
  props,
}: {
  isIM: boolean;
  scenarios: FullRaceScenario[];
  props: Props;
}) {
  const segments = isIM
    ? [
        { icon: Waves, label: "Natation", dist: "3.8 km", note: "1 boucle ou 2 selon parcours" },
        { icon: ChevronRight, label: "T1", dist: "—", note: "Eau → vélo (combi, casque)" },
        { icon: Bike, label: "Vélo", dist: "180 km", note: "≈ 5 à 7 h selon profil" },
        { icon: ChevronRight, label: "T2", dist: "—", note: "Vélo → course (jelly legs)" },
        { icon: Footprints, label: "Marathon", dist: "42.2 km", note: "≈ 3 h 30 à 5 h" },
      ]
    : [
        { icon: Waves, label: "Natation", dist: "1.9 km", note: "1 boucle généralement" },
        { icon: ChevronRight, label: "T1", dist: "—", note: "Eau → vélo" },
        { icon: Bike, label: "Vélo", dist: "90 km", note: "≈ 2 h 15 à 3 h" },
        { icon: ChevronRight, label: "T2", dist: "—", note: "Vélo → course" },
        { icon: Footprints, label: "Semi", dist: "21.1 km", note: "≈ 1 h 20 à 2 h" },
      ];

  const totalDist = isIM ? "226 km" : "113 km";
  const ref = scenarios[0]; // tous partagent swim/T1/T2 de base
  const synced: { label: string; value: string }[] = [
    { label: "Natation", value: fmtDuration(ref.swimMin) },
    { label: "T1 base", value: `${Math.round(ref.t1Min * 60)} s` },
    { label: "T2 base", value: `${Math.round(ref.t2Min * 60)} s` },
    { label: "Plafond fueling vélo", value: isIM ? "90 g/h" : "75 g/h" },
    { label: "Plafond fueling run", value: isIM ? "70 g/h" : "60 g/h" },
    { label: "Cible hydratation", value: isIM ? "600-800 ml/h" : "500-700 ml/h" },
    { label: "Drift FC max toléré", value: isIM ? "+8 bpm" : "+6 bpm" },
    {
      label: "État de départ",
      value: props.fatigueState ?? "non renseigné",
    },
    {
      label: "Disponibilité",
      value: props.disponibiliteScore != null ? `${Math.round(props.disponibiliteScore)}/100` : "—",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-1.5">
            <Info className="h-3 w-3" /> Format simulé : {isIM ? "Ironman 226" : "Half Ironman 113"}
          </span>
          <Badge variant="outline" className="text-[10px] font-mono">
            Total {totalDist} · Paramètres auto-synchronisés
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Timeline segments */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {segments.map((s, i) => (
            <div
              key={i}
              className={cn(
                "rounded-md border p-2 text-[11px] text-center",
                s.label === "T1" || s.label === "T2"
                  ? "bg-amber-500/5 border-amber-500/20"
                  : "bg-muted/30",
              )}
            >
              <div className="flex items-center justify-center gap-1 font-semibold">
                <s.icon className="h-3 w-3" />
                {s.label}
              </div>
              <div className="font-mono text-[12px] tabular-nums mt-0.5">{s.dist}</div>
              <div className="text-[10px] text-muted-foreground leading-snug mt-0.5">{s.note}</div>
            </div>
          ))}
        </div>

        {/* Paramètres synchronisés */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Paramètres synchronisés à ton objectif
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {synced.map((p) => (
              <div key={p.label} className="rounded border bg-card/50 px-2 py-1 text-[11px] flex justify-between gap-2">
                <span className="text-muted-foreground truncate">{p.label}</span>
                <span className="font-mono font-semibold tabular-nums shrink-0">{p.value}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground italic mt-1.5 leading-snug">
            Distances, fueling, transitions et seuils de drift sont automatiquement adaptés au format{" "}
            <strong>{isIM ? "Ironman" : "Half Ironman"}</strong>. Modifie ton objectif de course pour les recalibrer.
          </p>
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as FullRaceScenarioKey)}>
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
            <ScenarioCard scenarioKey={s.key} props={props} isIM={isIM} />
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
