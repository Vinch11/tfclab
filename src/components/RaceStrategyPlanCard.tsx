/**
 * RaceStrategyPlanCard — Plan de course clair, dans le style "Audit Pacing".
 *
 * Pour chaque discipline (vélo, course, triathlon segment), affiche les 3 scénarios
 * (Robuste / Ambitieux / Agressif) avec :
 *  - Une stratégie de split (badge type stratégie)
 *  - Un timeline de splits (zone, intensité chiffrée en % seuil + watts ou pace, cue coach)
 *  - Le coût métabolique, la prob. d'échec, la robustesse
 *  - Pour qui ce scénario est fait, et les drapeaux rouges
 *
 * Source de vérité : `envelope.boundary` (lowPct / centerPct / highPct / toleratedPct)
 * + paceThreshold (sec/km) ou FTP (W) pour matérialiser les chiffres.
 */

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Activity, ChevronRight, ShieldCheck, Target, Flame, AlertTriangle, Info, Gauge, HeartPulse, Mountain, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PacingEnvelopeResult, RaceObjective } from "@/lib/v2/pacingEnvelopeEngine";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type ScenarioKey = "ROBUST" | "AMBITIOUS" | "AGGRESSIVE";

interface SplitRow {
  segment: string;
  intensityPct: string;
  target: string;        // ex: "265–278 W" ou "4:18–4:22 /km"
  cue: string;
  zone: "GREEN" | "ORANGE" | "RED";
}

interface EffortRef {
  npLow: number;          // NP cible bas (W) ou allure rapide (sec/km) -- ici on garde W pour bike, sec/km pour run
  npHigh: number;
  hrLow: number | null;   // bpm
  hrHigh: number | null;
  climbPower: number | null;   // W (bike) — plafond consenti sur côte
  climbHr: number | null;      // bpm
  tss: number;            // TSS prévu pour ce scénario sur la durée
}

interface ScenarioBlock {
  key: ScenarioKey;
  emoji: string;
  label: string;
  strategyLabel: string;
  strategyDescription: string;
  forWho: string;
  redFlags: string[];
  failureProbPct: number;
  metabolicCost: number;        // 0-100
  robustness: "ROBUST" | "FRAGILE" | "VERY_FRAGILE";
  splits: SplitRow[];
  effortRef: EffortRef;
  centerPct: number;
  highPct: number;
}

interface RaceStrategyPlanCardProps {
  envelope: PacingEnvelopeResult;
  raceObjective: RaceObjective;
  discipline: "bike" | "run";
  raceDurationMin: number;
  ftp?: number | null;
  paceThresholdSecKm?: number | null;
  hrThresholdBpm?: number | null;   // LTHR — pour calculer les fourchettes cardio
  disponibiliteScore?: number | null;
  className?: string;
}

// Calcule les repères d'effort (NP / cardio / montée / TSS) pour un scénario donné
function buildEffortRef(
  scenario: { lowPct: number; centerPct: number; highPct: number; toleratedPct: number },
  discipline: "bike" | "run",
  raceDurationMin: number,
  ftp?: number | null,
  paceThresholdSecKm?: number | null,
  hrThresholdBpm?: number | null,
): EffortRef {
  const { lowPct, centerPct, highPct, toleratedPct } = scenario;

  // NP cible (bike: W, run: sec/km)
  let npLow = 0;
  let npHigh = 0;
  let climbPower: number | null = null;
  if (discipline === "bike" && ftp && ftp > 0) {
    npLow = Math.round((lowPct / 100) * ftp);
    npHigh = Math.round((centerPct / 100) * ftp);
    climbPower = Math.round((highPct / 100) * ftp);
  } else if (discipline === "run" && paceThresholdSecKm && paceThresholdSecKm > 0) {
    npLow = Math.round(paceThresholdSecKm * (100 / centerPct));
    npHigh = Math.round(paceThresholdSecKm * (100 / lowPct));
    climbPower = Math.round(paceThresholdSecKm * (100 / highPct));
  }

  // Cardio (LTHR × % couloir, modèle linéaire conservateur)
  // En pratique HR ≈ %LTHR avec un offset léger : on prend LTHR × (pct/100) plafonné à 0.96 LTHR pour la fourchette basse
  let hrLow: number | null = null;
  let hrHigh: number | null = null;
  let climbHr: number | null = null;
  if (hrThresholdBpm && hrThresholdBpm > 0) {
    const hrAt = (pct: number) => Math.round(hrThresholdBpm * Math.min(pct / 100, 1.05));
    hrLow = hrAt(Math.max(lowPct - 2, 60));
    hrHigh = hrAt(centerPct);
    climbHr = hrAt(Math.min(toleratedPct, highPct + 3));
  }

  // TSS prévu = (durée_h × IF²) × 100, avec IF = centerPct/100
  const ifVal = centerPct / 100;
  const tss = Math.round((raceDurationMin / 60) * ifVal * ifVal * 100);

  return { npLow, npHigh, hrLow, hrHigh, climbPower, climbHr, tss };
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers d'affichage des cibles concrètes
// ──────────────────────────────────────────────────────────────────────────────

function fmtPace(secPerKm: number | null | undefined): string | null {
  if (!secPerKm || secPerKm <= 0 || !Number.isFinite(secPerKm)) return null;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

function targetForRange(
  lowPct: number,
  highPct: number,
  discipline: "bike" | "run",
  ftp?: number | null,
  paceThresholdSecKm?: number | null,
): string {
  if (discipline === "bike" && ftp && ftp > 0) {
    const lo = Math.round((lowPct / 100) * ftp);
    const hi = Math.round((highPct / 100) * ftp);
    return lo === hi ? `${lo} W` : `${lo}–${hi} W`;
  }
  if (discipline === "run" && paceThresholdSecKm && paceThresholdSecKm > 0) {
    // % seuil ↑ ⇒ allure plus rapide ⇒ sec/km ↓
    const lo = paceThresholdSecKm * (100 / highPct);
    const hi = paceThresholdSecKm * (100 / lowPct);
    return `${fmtPace(lo)} → ${fmtPace(hi)}`;
  }
  return lowPct === highPct ? `${lowPct}% seuil` : `${lowPct}–${highPct}% seuil`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Construction des scénarios (à partir du couloir + objectif + discipline)
// ──────────────────────────────────────────────────────────────────────────────

function buildScenarios(props: RaceStrategyPlanCardProps): ScenarioBlock[] {
  const { envelope, raceObjective, discipline, ftp, paceThresholdSecKm, hrThresholdBpm, raceDurationMin } = props;
  const { lowPct, centerPct, highPct, toleratedPct } = envelope.boundary;

  const isTri = raceObjective === "IM" || raceObjective === "70.3";
  const isLong = raceObjective === "IM" || raceObjective === "Marathon";

  // Helper raccourci
  const T = (lo: number, hi: number) => targetForRange(lo, hi, discipline, ftp, paceThresholdSecKm);

  // ──── Bornes de chaque scénario (resserrement / ouverture autour du centre)
  const robustLow = lowPct;
  const robustCenter = Math.round((lowPct + centerPct) / 2);
  const ambitiousCenter = centerPct;
  const ambitiousHigh = Math.round((centerPct + highPct) / 2);
  const aggressiveHigh = highPct;
  const aggressiveOver = Math.min(highPct + 3, toleratedPct);

  // ──── Repères d'effort (NP / cardio / montée / TSS) par scénario
  const refRobust = buildEffortRef(
    { lowPct: robustLow, centerPct: robustCenter, highPct: ambitiousCenter, toleratedPct: ambitiousHigh },
    discipline, raceDurationMin, ftp, paceThresholdSecKm, hrThresholdBpm,
  );
  const refAmbitious = buildEffortRef(
    { lowPct: robustCenter, centerPct: ambitiousCenter, highPct: ambitiousHigh, toleratedPct: aggressiveHigh },
    discipline, raceDurationMin, ftp, paceThresholdSecKm, hrThresholdBpm,
  );
  const refAggressive = buildEffortRef(
    { lowPct: ambitiousHigh, centerPct: aggressiveHigh, highPct: aggressiveOver, toleratedPct: toleratedPct },
    discipline, raceDurationMin, ftp, paceThresholdSecKm, hrThresholdBpm,
  );

  // ──── Templates de splits par scénario × discipline
  const robustSplits = (): SplitRow[] => {
    if (discipline === "bike") {
      return [
        { segment: "0–33%", zone: "GREEN", intensityPct: `${robustLow}–${robustCenter}% seuil`, target: T(robustLow, robustCenter),
          cue: "Reste collé en bas du couloir vert. Tu DOIS te sentir trop facile." },
        { segment: "33–66%", zone: "GREEN", intensityPct: `${robustCenter}% seuil`, target: T(robustCenter, robustCenter),
          cue: "Centre du vert. Bosses < 2 min : autorisées en orange, jamais en continu." },
        { segment: "66–100%", zone: "GREEN", intensityPct: `${robustLow}–${robustCenter}% seuil`, target: T(robustLow, robustCenter),
          cue: isTri ? "Reviens en bas du vert. Objectif T2 : jambes intactes." : "Conserve, tu finiras fort sans te crever." },
      ];
    }
    return [
      { segment: "0–25%", zone: "GREEN", intensityPct: `${Math.max(robustLow - 3, 60)}–${robustLow}% seuil`,
        target: T(Math.max(robustLow - 3, 60), robustLow),
        cue: isTri ? "3 premiers km très contrôlés, jambes lourdes après le vélo." : "Pas de départ explosif. Verrou allure." },
      { segment: "25–75%", zone: "GREEN", intensityPct: `${robustLow}–${robustCenter}% seuil`, target: T(robustLow, robustCenter),
        cue: "Allure cruise. FC < 92 % FCmax. Aucune accélération opportuniste." },
      { segment: "75–100%", zone: "GREEN", intensityPct: `${robustCenter}% seuil`, target: T(robustCenter, robustCenter),
        cue: "Negative split modéré. Push autorisé seulement si glycogène OK." },
    ];
  };

  const ambitiousSplits = (): SplitRow[] => {
    if (discipline === "bike") {
      return [
        { segment: "0–33%", zone: "GREEN", intensityPct: `${robustCenter}–${ambitiousCenter}% seuil`, target: T(robustCenter, ambitiousCenter),
          cue: "Démarre en bas du centre. Le vélo se gagne sur la fin, pas au départ." },
        { segment: "33–66%", zone: "GREEN", intensityPct: `${ambitiousCenter}% seuil`, target: T(ambitiousCenter, ambitiousCenter),
          cue: "Centre du couloir. Bosses tolérées en haut du vert, jamais en orange long." },
        { segment: "66–100%", zone: "GREEN", intensityPct: `${ambitiousCenter}–${ambitiousHigh}% seuil`, target: T(ambitiousCenter, ambitiousHigh),
          cue: isTri ? "Tu peux mordre le haut du vert si glycogène OK. Décrochage = retour centre." : "Push contrôlé sur la fin." },
      ];
    }
    return [
      { segment: "0–20%", zone: "GREEN", intensityPct: `${ambitiousCenter - 2}% seuil`, target: T(Math.max(ambitiousCenter - 2, 60), ambitiousCenter),
        cue: "Allure cible -2 sec/km. Verrou installé dès le km 3." },
      { segment: "20–80%", zone: "GREEN", intensityPct: `${ambitiousCenter}% seuil`, target: T(ambitiousCenter, ambitiousCenter),
        cue: "Even split au centre du couloir. FC stable. Fueling 60–90 g/h." },
      { segment: "80–100%", zone: "ORANGE", intensityPct: `${ambitiousCenter}–${ambitiousHigh}% seuil`, target: T(ambitiousCenter, ambitiousHigh),
        cue: "Finish autorisé si FC < 95 % FCmax au check de référence." },
    ];
  };

  const aggressiveSplits = (): SplitRow[] => {
    if (discipline === "bike") {
      return [
        { segment: "0–33%", zone: "ORANGE", intensityPct: `${ambitiousCenter}–${aggressiveHigh}% seuil`, target: T(ambitiousCenter, aggressiveHigh),
          cue: "⚠️ Sortie hors-couloir vers le haut. Marquage glycogène immédiat." },
        { segment: "33–66%", zone: "ORANGE", intensityPct: `${aggressiveHigh}% seuil`, target: T(aggressiveHigh, aggressiveHigh),
          cue: "Plafond orange tenu. Surveille drift FC : > 8 bpm = tu passes en rouge." },
        { segment: "66–100%", zone: "RED", intensityPct: `${aggressiveHigh}–${aggressiveOver}% seuil`, target: T(aggressiveHigh, aggressiveOver),
          cue: isTri ? "Quitte ou double : tu vises le podium ou tu marches au run." : "Casse glycogénique probable. Nutrition parfaite obligatoire." },
      ];
    }
    return [
      { segment: "0–25%", zone: "ORANGE", intensityPct: `${ambitiousHigh}% seuil`, target: T(ambitiousCenter, ambitiousHigh),
        cue: "Départ en haut du couloir. Erreur de débutant si pas de réserve aérobie." },
      { segment: "25–75%", zone: "ORANGE", intensityPct: `${ambitiousHigh}–${aggressiveHigh}% seuil`, target: T(ambitiousHigh, aggressiveHigh),
        cue: "Plafond orange tenu en continu. Risque de positive split majeur." },
      { segment: "75–100%", zone: "RED", intensityPct: `${aggressiveHigh}–${aggressiveOver}% seuil`, target: T(aggressiveHigh, aggressiveOver),
        cue: "Quitte ou double. Marche probable si glycogène ou hydratation imparfaits." },
    ];
  };

  return [
    {
      key: "ROBUST",
      emoji: "🛡️",
      label: "Robuste",
      strategyLabel: discipline === "bike" ? "Vélo prudent + run en negative split" : "Negative split contrôlé",
      strategyDescription: "Tu finis fort, sans casse. Glycogène préservé, sensations sous contrôle.",
      forWho: isLong
        ? "1re course longue, doute, fatigue, météo difficile, ou Disponibilité < 60."
        : "Doute sur la forme, première fois sur la distance.",
      redFlags: [
        "Si tu sors du vert vers le haut > 5 min → tu n'es plus en Robuste.",
        isTri ? "Vélo trop fort = run cassé, peu importe la nutrition." : "Push trop tôt = perte du bénéfice negative split.",
      ],
      failureProbPct: 8,
      metabolicCost: 55,
      robustness: "ROBUST",
      splits: robustSplits(),
      effortRef: refRobust,
      centerPct: robustCenter,
      highPct: ambitiousCenter,
    },
    {
      key: "AMBITIOUS",
      emoji: "🎯",
      label: "Ambitieux",
      strategyLabel: discipline === "bike" ? "Vélo centré + run en even split" : "Even split à l'allure seuil",
      strategyDescription: "Ton meilleur potentiel si tout aligne (forme, nutrition, parcours, météo).",
      forWho: "Disponibilité ≥ 75, nutrition rodée, parcours connu, conditions clémentes.",
      redFlags: [
        "Drift FC > 8 bpm dans le 2e tiers → repli sur Robuste immédiat.",
        "Fueling < 60 g/h sur > 90 min → tu finiras en glycogène crisis.",
      ],
      failureProbPct: 22,
      metabolicCost: 72,
      robustness: "FRAGILE",
      splits: ambitiousSplits(),
      effortRef: refAmbitious,
      centerPct: ambitiousCenter,
      highPct: ambitiousHigh,
    },
    {
      key: "AGGRESSIVE",
      emoji: "🔥",
      label: "Agressif",
      strategyLabel: discipline === "bike" ? "Vélo poussé + run en positive split assumé" : "Positive split assumé",
      strategyDescription: "Quitte ou double. Vise un record / un podium. Le moindre écart = casse.",
      forWho: "Athlète expérimenté, podium en jeu, conditions parfaites, nutrition millimétrée.",
      redFlags: [
        "Glycogène imparfait → marche / abandon hautement probable.",
        isTri ? "Erreur T2, vent, chaleur : repli forcé sur Ambitieux ou Robuste." : "Tout dépassement > 3 min en rouge = effondrement.",
      ],
      failureProbPct: 48,
      metabolicCost: 92,
      robustness: "VERY_FRAGILE",
      splits: aggressiveSplits(),
      effortRef: refAggressive,
      centerPct: aggressiveHigh,
      highPct: aggressiveOver,
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// UI sub-components
// ──────────────────────────────────────────────────────────────────────────────

const ZONE_STYLES: Record<SplitRow["zone"], string> = {
  GREEN: "border-emerald-500/40 bg-emerald-500/5",
  ORANGE: "border-amber-500/40 bg-amber-500/5",
  RED: "border-red-500/40 bg-red-500/5",
};

const ZONE_DOT: Record<SplitRow["zone"], string> = {
  GREEN: "bg-emerald-500",
  ORANGE: "bg-amber-500",
  RED: "bg-red-500",
};

function SplitTimeline({ splits }: { splits: SplitRow[] }) {
  return (
    <div className="space-y-1.5">
      {splits.map((s, i) => (
        <div
          key={i}
          className={cn(
            "flex items-start gap-2 p-2 rounded-md border",
            ZONE_STYLES[s.zone],
          )}
        >
          <Badge variant="secondary" className="font-mono text-[10px] shrink-0 mt-0.5">
            {s.segment}
          </Badge>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("h-2 w-2 rounded-full", ZONE_DOT[s.zone])} />
              <span className="text-xs font-semibold">{s.target}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{s.intensityPct}</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{s.cue}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// EffortRefBlock — fiche route format "Repères d'effort" (NP, cardio, montée, TSS)
// ──────────────────────────────────────────────────────────────────────────────

function fmtPaceShort(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function EffortRefBlock({
  ref,
  discipline,
}: {
  ref: EffortRef;
  discipline: "bike" | "run";
}) {
  const unit = discipline === "bike" ? "W" : "/km";
  const npLabel = discipline === "bike" ? "Cible NP" : "Allure cible";
  const climbLabel = discipline === "bike" ? "Plafond montée" : "Cap allure côte";

  const npStr = discipline === "bike"
    ? (ref.npLow === ref.npHigh ? `${ref.npLow} W` : `${ref.npLow}–${ref.npHigh} W`)
    : `${fmtPaceShort(ref.npLow)}–${fmtPaceShort(ref.npHigh)}/km`;

  const hrStr = ref.hrLow != null && ref.hrHigh != null
    ? (ref.hrLow === ref.hrHigh ? `${ref.hrLow} bpm` : `${ref.hrLow}–${ref.hrHigh} bpm`)
    : "— (LTHR manquant)";

  const climbPowStr = ref.climbPower != null
    ? (discipline === "bike" ? `≈ ${ref.climbPower} W` : `≈ ${fmtPaceShort(ref.climbPower)}/km`)
    : "—";

  const climbHrStr = ref.climbHr != null ? `, plafond cardio ${ref.climbHr} bpm` : "";

  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
      <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
        <Gauge className="h-3 w-3 text-primary" /> Repères d'effort
      </h4>
      <ul className="space-y-1.5 text-xs leading-snug">
        <li className="flex items-start gap-2">
          <Target className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <span><span className="text-muted-foreground">{npLabel} :</span> <strong className="font-mono">{npStr}</strong></span>
        </li>
        <li className="flex items-start gap-2">
          <HeartPulse className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
          <span><span className="text-muted-foreground">Cible cardio :</span> <strong className="font-mono">{hrStr}</strong></span>
        </li>
        <li className="flex items-start gap-2">
          <Mountain className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <span className="text-muted-foreground">{climbLabel} :</span>{" "}
            <strong className="font-mono">{climbPowStr}</strong>
            <span className="text-muted-foreground">{climbHrStr}</span>
          </span>
        </li>
        <li className="flex items-start gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <span><span className="text-muted-foreground">Charge prévue :</span> <strong className="font-mono">{ref.tss} TSS</strong></span>
        </li>
      </ul>
    </div>
  );
}

const ROBUSTNESS_LABEL: Record<ScenarioBlock["robustness"], { label: string; cls: string }> = {
  ROBUST: { label: "Robuste", cls: "text-emerald-600 dark:text-emerald-400" },
  FRAGILE: { label: "Fragile", cls: "text-amber-600 dark:text-amber-400" },
  VERY_FRAGILE: { label: "Très fragile", cls: "text-red-600 dark:text-red-400" },
};

function ScenarioCard({ scenario }: { scenario: ScenarioBlock }) {
  const rob = ROBUSTNESS_LABEL[scenario.robustness];
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-xl">{scenario.emoji}</span>
              Scénario {scenario.label}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{scenario.strategyLabel}</p>
          </div>
          <Badge variant="outline" className={cn("text-[10px]", rob.cls)}>
            {rob.label}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground italic mt-1">{scenario.strategyDescription}</p>
      </CardHeader>

      <CardContent className="pt-3 space-y-3">
        {/* Métriques clés */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md border p-2 text-center bg-muted/30">
            <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Prob. échec
            </div>
            <div
              className={cn(
                "text-sm font-bold mt-0.5",
                scenario.failureProbPct > 40
                  ? "text-red-600"
                  : scenario.failureProbPct > 20
                  ? "text-amber-600"
                  : "text-emerald-600",
              )}
            >
              {scenario.failureProbPct}%
            </div>
          </div>
          <div className="rounded-md border p-2 text-center bg-muted/30">
            <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <Flame className="h-3 w-3" /> Coût métab.
            </div>
            <div
              className={cn(
                "text-sm font-bold mt-0.5",
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
          <div className="rounded-md border p-2 text-center bg-muted/30">
            <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <Target className="h-3 w-3" /> Robustesse
            </div>
            <div className={cn("text-sm font-bold mt-0.5", rob.cls)}>{rob.label}</div>
          </div>
        </div>

        {/* Splits */}
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <Activity className="h-3 w-3" /> Splits chiffrés
          </h4>
          <SplitTimeline splits={scenario.splits} />
        </div>

        {/* Pour qui */}
        <div className="rounded-md border bg-muted/20 p-2 text-[11px]">
          <div className="flex items-center gap-1 font-semibold mb-0.5">
            <ShieldCheck className="h-3 w-3 text-primary" /> Pour qui ?
          </div>
          <p className="text-muted-foreground leading-snug">{scenario.forWho}</p>
        </div>

        {/* Drapeaux rouges */}
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-red-500" /> Drapeaux rouges
          </h4>
          <ul className="space-y-1 text-[11px]">
            {scenario.redFlags.map((f, i) => (
              <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-red-500/70" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Composant principal
// ──────────────────────────────────────────────────────────────────────────────

export function RaceStrategyPlanCard(props: RaceStrategyPlanCardProps) {
  const scenarios = useMemo(() => buildScenarios(props), [props]);
  const [tab, setTab] = useState<ScenarioKey>(
    props.disponibiliteScore != null && props.disponibiliteScore >= 75
      ? "AMBITIOUS"
      : props.disponibiliteScore != null && props.disponibiliteScore < 55
      ? "ROBUST"
      : "AMBITIOUS",
  );

  const isTri = props.raceObjective === "IM" || props.raceObjective === "70.3";
  const segmentLabel =
    isTri ? (props.discipline === "bike" ? "🚴 Segment vélo" : "🏃 Segment course à pied") : "";

  return (
    <div className={cn("space-y-3", props.className)}>
      {/* En-tête contextuel */}
      <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <div className="font-semibold text-foreground">
              Plan de course — {props.raceObjective}
              {segmentLabel && <span className="text-muted-foreground font-normal"> · {segmentLabel}</span>}
            </div>
            <p className="text-muted-foreground leading-snug">
              Trois plans, trois philosophies. Chaque plan est{" "}
              <strong>chiffré sur ton couloir personnel</strong> ({props.discipline === "bike" ? "watts" : "allure /km"})
              avec ses splits, son coût et ses drapeaux rouges. Comme dans l'audit pacing — mais appliqué à TA course.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ScenarioKey)}>
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
            <ScenarioCard scenario={s} />
          </TabsContent>
        ))}
      </Tabs>

      {/* Comparatif rapide */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Comparatif rapide
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-1.5 pr-2">Scénario</th>
                <th className="py-1.5 pr-2">Stratégie</th>
                <th className="py-1.5 pr-2 text-right">Échec</th>
                <th className="py-1.5 pr-2 text-right">Coût</th>
                <th className="py-1.5 pr-2">Robustesse</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => {
                const rob = ROBUSTNESS_LABEL[s.robustness];
                return (
                  <tr key={s.key} className="border-b last:border-0">
                    <td className="py-1.5 pr-2 font-semibold">
                      {s.emoji} {s.label}
                    </td>
                    <td className="py-1.5 pr-2 text-muted-foreground">{s.strategyLabel}</td>
                    <td className="py-1.5 pr-2 text-right font-mono">{s.failureProbPct}%</td>
                    <td className="py-1.5 pr-2 text-right font-mono">{s.metabolicCost}/100</td>
                    <td className={cn("py-1.5 pr-2 font-medium", rob.cls)}>{rob.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export default RaceStrategyPlanCard;
