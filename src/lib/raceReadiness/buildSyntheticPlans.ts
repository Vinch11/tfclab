/**
 * Race Readiness — Plans synthétiques détaillés (Vélo, CAP, Nutrition)
 * Aligne le niveau de détail avec RaceStrategyPlanCard :
 *   3 scénarios (Robuste / Ambitieux / Agressif) × splits chronométrés × repères d'effort.
 *
 *  - Durée et intensité cibles par objectif (IM, 70.3, Marathon, Semi, 10K, 5K, Trails, StartToRun)
 *  - Ambition (Découverte / Optimisation / Performance) module le centre de couloir
 *  - Nutrition CHO via `computeBaseRateMader` (Mader-Heck canonique, F26)
 */

import { computeBaseRateMader } from "@/lib/v2/nutritionUnified";

export type PlanKind = "bike" | "run" | "nutrition";
export type ScenarioKey = "ROBUST" | "AMBITIOUS" | "AGGRESSIVE";
export type SplitZone = "GREEN" | "ORANGE" | "RED";

export interface SyntheticPlanInputs {
  objectif: string;
  ambition: string;
  ftp: number | null;
  paceThresholdSecKm: number | null;
  weightKg: number | null;
  vo2max: number | null;
  vlamax: number | null;
  /** Si vrai, ajoute le facteur chaleur (+10%) à la nutrition. */
  heat?: boolean;
}

interface ObjectivePreset {
  durationMin: number;
  bikeCenterPct: number | null;
  runCenterPct: number | null;
  nutritionSport: "velo" | "cap";
  long: boolean;
  tri: boolean;
}

const OBJ_PRESETS: Record<string, ObjectivePreset> = {
  IM:           { durationMin: 600, bikeCenterPct: 71, runCenterPct: 92, nutritionSport: "velo", long: true,  tri: true },
  "703":        { durationMin: 270, bikeCenterPct: 81, runCenterPct: 95, nutritionSport: "velo", long: true,  tri: true },
  Marathon:     { durationMin: 210, bikeCenterPct: null, runCenterPct: 94, nutritionSport: "cap", long: true,  tri: false },
  Semi:         { durationMin: 95,  bikeCenterPct: null, runCenterPct: 98, nutritionSport: "cap", long: false, tri: false },
  "10K":        { durationMin: 45,  bikeCenterPct: null, runCenterPct: 102, nutritionSport: "cap", long: false, tri: false },
  "5K":         { durationMin: 22,  bikeCenterPct: null, runCenterPct: 106, nutritionSport: "cap", long: false, tri: false },
  StartToRun:   { durationMin: 35,  bikeCenterPct: null, runCenterPct: 87, nutritionSport: "cap", long: false, tri: false },
  TrailShort:   { durationMin: 120, bikeCenterPct: null, runCenterPct: 90, nutritionSport: "cap", long: true,  tri: false },
  TrailMountain:{ durationMin: 360, bikeCenterPct: null, runCenterPct: 80, nutritionSport: "cap", long: true,  tri: false },
  TrailUltra:   { durationMin: 900, bikeCenterPct: null, runCenterPct: 72, nutritionSport: "cap", long: true,  tri: false },
};

function ambitionShift(ambition: string): number {
  const a = (ambition || "").toLowerCase();
  if (a.includes("perf")) return +2;
  if (a.includes("decouv") || a.includes("découv")) return -2;
  return 0;
}

function fmtPaceSec(secKm: number): string {
  const m = Math.floor(secKm / 60);
  const s = Math.round(secKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, "0")}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Couloir d'effort
// ──────────────────────────────────────────────────────────────────────────────

interface Envelope { lowPct: number; centerPct: number; highPct: number; toleratedPct: number }

function buildEnvelope(centerPct: number, long: boolean): Envelope {
  // Couloirs plus serrés sur format long (sécurité métabolique)
  const halfDown = long ? 5 : 6;
  const halfUp = long ? 4 : 5;
  return {
    lowPct: centerPct - halfDown,
    centerPct,
    highPct: centerPct + halfUp,
    toleratedPct: centerPct + halfUp + (long ? 3 : 4),
  };
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
    const fast = paceThresholdSecKm * (100 / highPct);
    const slow = paceThresholdSecKm * (100 / lowPct);
    return `${fmtPaceSec(slow)} → ${fmtPaceSec(fast)}`;
  }
  return lowPct === highPct ? `${lowPct}% seuil` : `${lowPct}–${highPct}% seuil`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Scénarios
// ──────────────────────────────────────────────────────────────────────────────

export interface ScenarioSplit {
  segment: string;
  zone: SplitZone;
  intensityPct: string;
  target: string;
  cue: string;
}

export interface ScenarioEffort {
  /** NP cible — bike: W (low/high). Run: sec/km (low=lent, high=rapide). */
  npLow: number;
  npHigh: number;
  /** Plafond consenti sur côte / accélération. */
  climbTarget: number | null;
  /** TSS prévu pour ce scénario sur la durée. */
  tss: number;
}

export interface PlanScenario {
  key: ScenarioKey;
  emoji: string;
  label: string;
  strategyLabel: string;
  strategyDescription: string;
  forWho: string;
  redFlags: string[];
  failureProbPct: number;
  metabolicCost: number;
  robustness: "ROBUST" | "FRAGILE" | "VERY_FRAGILE";
  centerPct: number;
  rangeLowPct: number;
  rangeHighPct: number;
  splits: ScenarioSplit[];
  effort: ScenarioEffort;
}

function buildEffort(
  s: { lowPct: number; centerPct: number; highPct: number; toleratedPct: number },
  discipline: "bike" | "run",
  raceDurationMin: number,
  ftp?: number | null,
  paceThresholdSecKm?: number | null,
): ScenarioEffort {
  let npLow = 0;
  let npHigh = 0;
  let climbTarget: number | null = null;
  if (discipline === "bike" && ftp && ftp > 0) {
    npLow = Math.round((s.lowPct / 100) * ftp);
    npHigh = Math.round((s.centerPct / 100) * ftp);
    climbTarget = Math.round((s.highPct / 100) * ftp);
  } else if (discipline === "run" && paceThresholdSecKm && paceThresholdSecKm > 0) {
    npLow = Math.round(paceThresholdSecKm * (100 / s.centerPct));
    npHigh = Math.round(paceThresholdSecKm * (100 / s.lowPct));
    climbTarget = Math.round(paceThresholdSecKm * (100 / s.highPct));
  }
  const ifVal = s.centerPct / 100;
  const tss = Math.round((raceDurationMin / 60) * ifVal * ifVal * 100);
  return { npLow, npHigh, climbTarget, tss };
}

function buildScenarios(
  discipline: "bike" | "run",
  env: Envelope,
  preset: ObjectivePreset,
  ftp: number | null,
  paceThresholdSecKm: number | null,
): PlanScenario[] {
  const { lowPct, centerPct, highPct, toleratedPct } = env;
  const T = (lo: number, hi: number) => targetForRange(lo, hi, discipline, ftp, paceThresholdSecKm);

  const robustLow = lowPct;
  const robustCenter = Math.round((lowPct + centerPct) / 2);
  const ambitiousCenter = centerPct;
  const ambitiousHigh = Math.round((centerPct + highPct) / 2);
  const aggressiveHigh = highPct;
  const aggressiveOver = Math.min(highPct + 3, toleratedPct);

  const refRobust = buildEffort(
    { lowPct: robustLow, centerPct: robustCenter, highPct: ambitiousCenter, toleratedPct: ambitiousHigh },
    discipline, preset.durationMin, ftp, paceThresholdSecKm,
  );
  const refAmbitious = buildEffort(
    { lowPct: robustCenter, centerPct: ambitiousCenter, highPct: ambitiousHigh, toleratedPct: aggressiveHigh },
    discipline, preset.durationMin, ftp, paceThresholdSecKm,
  );
  const refAggressive = buildEffort(
    { lowPct: ambitiousHigh, centerPct: aggressiveHigh, highPct: aggressiveOver, toleratedPct },
    discipline, preset.durationMin, ftp, paceThresholdSecKm,
  );

  const robustSplits = (): ScenarioSplit[] => discipline === "bike"
    ? [
        { segment: "0–33%", zone: "GREEN", intensityPct: `${robustLow}–${robustCenter}% seuil`, target: T(robustLow, robustCenter),
          cue: "Reste collé en bas du couloir vert. Tu DOIS te sentir trop facile." },
        { segment: "33–66%", zone: "GREEN", intensityPct: `${robustCenter}% seuil`, target: T(robustCenter, robustCenter),
          cue: "Centre du vert. Bosses < 2 min : autorisées en orange, jamais en continu." },
        { segment: "66–100%", zone: "GREEN", intensityPct: `${robustLow}–${robustCenter}% seuil`, target: T(robustLow, robustCenter),
          cue: preset.tri ? "Reviens en bas du vert. Objectif T2 : jambes intactes." : "Conserve, tu finiras fort sans te crever." },
      ]
    : [
        { segment: "0–25%", zone: "GREEN", intensityPct: `${Math.max(robustLow - 3, 60)}–${robustLow}% seuil`,
          target: T(Math.max(robustLow - 3, 60), robustLow),
          cue: preset.tri ? "3 premiers km très contrôlés, jambes lourdes après le vélo." : "Pas de départ explosif. Verrou allure." },
        { segment: "25–75%", zone: "GREEN", intensityPct: `${robustLow}–${robustCenter}% seuil`, target: T(robustLow, robustCenter),
          cue: "Allure cruise. FC < 92 % FCmax. Aucune accélération opportuniste." },
        { segment: "75–100%", zone: "GREEN", intensityPct: `${robustCenter}% seuil`, target: T(robustCenter, robustCenter),
          cue: "Negative split modéré. Push autorisé seulement si glycogène OK." },
      ];

  const ambitiousSplits = (): ScenarioSplit[] => discipline === "bike"
    ? [
        { segment: "0–33%", zone: "GREEN", intensityPct: `${robustCenter}–${ambitiousCenter}% seuil`, target: T(robustCenter, ambitiousCenter),
          cue: "Démarre en bas du centre. Le vélo se gagne sur la fin, pas au départ." },
        { segment: "33–66%", zone: "GREEN", intensityPct: `${ambitiousCenter}% seuil`, target: T(ambitiousCenter, ambitiousCenter),
          cue: "Centre du couloir. Bosses tolérées en haut du vert, jamais en orange long." },
        { segment: "66–100%", zone: "GREEN", intensityPct: `${ambitiousCenter}–${ambitiousHigh}% seuil`, target: T(ambitiousCenter, ambitiousHigh),
          cue: preset.tri ? "Mords le haut du vert si glycogène OK. Décrochage = retour centre." : "Push contrôlé sur la fin." },
      ]
    : [
        { segment: "0–20%", zone: "GREEN", intensityPct: `${ambitiousCenter - 2}% seuil`, target: T(Math.max(ambitiousCenter - 2, 60), ambitiousCenter),
          cue: "Allure cible -2 sec/km. Verrou installé dès le km 3." },
        { segment: "20–80%", zone: "GREEN", intensityPct: `${ambitiousCenter}% seuil`, target: T(ambitiousCenter, ambitiousCenter),
          cue: "Even split au centre du couloir. FC stable. Fueling 60–90 g/h." },
        { segment: "80–100%", zone: "ORANGE", intensityPct: `${ambitiousCenter}–${ambitiousHigh}% seuil`, target: T(ambitiousCenter, ambitiousHigh),
          cue: "Finish autorisé si FC < 95 % FCmax au check de référence." },
      ];

  const aggressiveSplits = (): ScenarioSplit[] => discipline === "bike"
    ? [
        { segment: "0–33%", zone: "ORANGE", intensityPct: `${ambitiousCenter}–${aggressiveHigh}% seuil`, target: T(ambitiousCenter, aggressiveHigh),
          cue: "⚠️ Sortie hors-couloir vers le haut. Marquage glycogène immédiat." },
        { segment: "33–66%", zone: "ORANGE", intensityPct: `${aggressiveHigh}% seuil`, target: T(aggressiveHigh, aggressiveHigh),
          cue: "Plafond orange tenu. Surveille drift FC : > 8 bpm = tu passes en rouge." },
        { segment: "66–100%", zone: "RED", intensityPct: `${aggressiveHigh}–${aggressiveOver}% seuil`, target: T(aggressiveHigh, aggressiveOver),
          cue: preset.tri ? "Quitte ou double : podium ou tu marches au run." : "Casse glycogénique probable. Nutrition parfaite obligatoire." },
      ]
    : [
        { segment: "0–25%", zone: "ORANGE", intensityPct: `${ambitiousHigh}% seuil`, target: T(ambitiousCenter, ambitiousHigh),
          cue: "Départ en haut du couloir. Erreur de débutant si pas de réserve aérobie." },
        { segment: "25–75%", zone: "ORANGE", intensityPct: `${ambitiousHigh}–${aggressiveHigh}% seuil`, target: T(ambitiousHigh, aggressiveHigh),
          cue: "Plafond orange tenu en continu. Risque de positive split majeur." },
        { segment: "75–100%", zone: "RED", intensityPct: `${aggressiveHigh}–${aggressiveOver}% seuil`, target: T(aggressiveHigh, aggressiveOver),
          cue: "Quitte ou double. Marche probable si glycogène ou hydratation imparfaits." },
      ];

  return [
    {
      key: "ROBUST", emoji: "🛡️", label: "Robuste",
      strategyLabel: discipline === "bike" ? "Vélo prudent + finish negative split" : "Negative split contrôlé",
      strategyDescription: "Tu finis fort, sans casse. Glycogène préservé, sensations sous contrôle.",
      forWho: preset.long
        ? "1re course longue, doute, fatigue, météo difficile, ou Disponibilité < 60."
        : "Doute sur la forme, première fois sur la distance.",
      redFlags: [
        "Si tu sors du vert vers le haut > 5 min → tu n'es plus en Robuste.",
        preset.tri ? "Vélo trop fort = run cassé, peu importe la nutrition." : "Push trop tôt = perte du bénéfice negative split.",
      ],
      failureProbPct: 8, metabolicCost: 55, robustness: "ROBUST",
      centerPct: robustCenter, rangeLowPct: robustLow, rangeHighPct: ambitiousCenter,
      splits: robustSplits(), effort: refRobust,
    },
    {
      key: "AMBITIOUS", emoji: "🎯", label: "Ambitieux",
      strategyLabel: discipline === "bike" ? "Vélo centré + run even split" : "Even split à l'allure seuil",
      strategyDescription: "Ton meilleur potentiel si tout aligne (forme, nutrition, parcours, météo).",
      forWho: "Disponibilité ≥ 75, nutrition rodée, parcours connu, conditions clémentes.",
      redFlags: [
        "Drift FC > 8 bpm dans le 2e tiers → repli sur Robuste immédiat.",
        "Fueling < 60 g/h sur > 90 min → tu finiras en glycogène crisis.",
      ],
      failureProbPct: 22, metabolicCost: 72, robustness: "FRAGILE",
      centerPct: ambitiousCenter, rangeLowPct: robustCenter, rangeHighPct: ambitiousHigh,
      splits: ambitiousSplits(), effort: refAmbitious,
    },
    {
      key: "AGGRESSIVE", emoji: "🔥", label: "Agressif",
      strategyLabel: discipline === "bike" ? "Vélo poussé + run positive split assumé" : "Positive split assumé",
      strategyDescription: "Quitte ou double. Vise un record / un podium. Le moindre écart = casse.",
      forWho: "Athlète expérimenté, podium en jeu, conditions parfaites, nutrition millimétrée.",
      redFlags: [
        "Glycogène imparfait → marche / abandon hautement probable.",
        preset.tri ? "Erreur T2, vent, chaleur : repli forcé sur Ambitieux ou Robuste." : "Dépassement > 3 min en rouge = effondrement.",
      ],
      failureProbPct: 48, metabolicCost: 92, robustness: "VERY_FRAGILE",
      centerPct: aggressiveHigh, rangeLowPct: ambitiousHigh, rangeHighPct: aggressiveOver,
      splits: aggressiveSplits(), effort: refAggressive,
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// Plans publics
// ──────────────────────────────────────────────────────────────────────────────

export interface BikePlan {
  discipline: "bike";
  durationMin: number;
  ftp: number;
  scenarios: PlanScenario[];
}

export function buildBikePlan(inputs: SyntheticPlanInputs): BikePlan | null {
  const preset = OBJ_PRESETS[inputs.objectif];
  if (!preset || preset.bikeCenterPct == null || !inputs.ftp) return null;
  const center = preset.bikeCenterPct + ambitionShift(inputs.ambition);
  const env = buildEnvelope(center, preset.long);
  return {
    discipline: "bike",
    durationMin: preset.durationMin,
    ftp: inputs.ftp,
    scenarios: buildScenarios("bike", env, preset, inputs.ftp, null),
  };
}

export interface RunPlan {
  discipline: "run";
  durationMin: number;
  paceThresholdSecKm: number;
  scenarios: PlanScenario[];
}

export function buildRunPlan(inputs: SyntheticPlanInputs): RunPlan | null {
  const preset = OBJ_PRESETS[inputs.objectif];
  if (!preset || preset.runCenterPct == null || !inputs.paceThresholdSecKm) return null;
  const center = preset.runCenterPct + ambitionShift(inputs.ambition);
  const env = buildEnvelope(center, preset.long);
  return {
    discipline: "run",
    durationMin: preset.durationMin,
    paceThresholdSecKm: inputs.paceThresholdSecKm,
    scenarios: buildScenarios("run", env, preset, null, inputs.paceThresholdSecKm),
  };
}

export interface NutritionPlan {
  sport: "velo" | "cap";
  durationMin: number;
  durationH: number;
  intensityPct: number;
  baseRateGh: number;
  totalCarbsG: number;
  totalKcal: number;
  windows: { early: number; mid: number; late: number };
  heat: boolean;
}

export function buildNutritionPlan(inputs: SyntheticPlanInputs): NutritionPlan | null {
  const preset = OBJ_PRESETS[inputs.objectif];
  if (!preset || !inputs.weightKg) return null;
  const durationH = preset.durationMin / 60;
  const intensityPct = preset.nutritionSport === "velo"
    ? preset.bikeCenterPct ?? 70
    : preset.runCenterPct ?? 90;
  const { baseRate } = computeBaseRateMader(
    inputs.weightKg,
    preset.nutritionSport,
    inputs.vo2max,
    inputs.vlamax,
    intensityPct,
    durationH,
    inputs.heat,
  );
  const windows = {
    early: Math.round(baseRate * 0.75),
    mid: baseRate,
    late: durationH >= 2 ? Math.min(baseRate + 10, 95) : baseRate,
  };
  const totalCarbsG = Math.round(baseRate * durationH);
  const totalKcal = Math.round(totalCarbsG * 4);
  return {
    sport: preset.nutritionSport,
    durationMin: preset.durationMin,
    durationH,
    intensityPct,
    baseRateGh: baseRate,
    totalCarbsG,
    totalKcal,
    windows,
    heat: !!inputs.heat,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Rendu HTML (pour PDF)
// ──────────────────────────────────────────────────────────────────────────────

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const ZONE_BG: Record<SplitZone, string> = {
  GREEN: "#ecfdf5",
  ORANGE: "#fffbeb",
  RED: "#fef2f2",
};
const ZONE_BORDER: Record<SplitZone, string> = {
  GREEN: "#10b981",
  ORANGE: "#f59e0b",
  RED: "#ef4444",
};

const ROBUSTNESS_LABEL: Record<PlanScenario["robustness"], { label: string; color: string }> = {
  ROBUST:       { label: "Robuste",      color: "#10b981" },
  FRAGILE:      { label: "Fragile",      color: "#f59e0b" },
  VERY_FRAGILE: { label: "Très fragile", color: "#ef4444" },
};

function renderScenarioBlock(s: PlanScenario, discipline: "bike" | "run"): string {
  const unitNP = discipline === "bike" ? "W" : "sec/km";
  const fmtNP = (v: number) => discipline === "bike" ? `${v} W` : fmtPaceSec(v);
  const splitsHTML = s.splits.map(sp => `
    <div style="display:flex;gap:6pt;align-items:flex-start;padding:5pt 7pt;border:1pt solid ${ZONE_BORDER[sp.zone]}55;background:${ZONE_BG[sp.zone]};border-radius:4pt;margin-bottom:3pt;">
      <span style="font-family:monospace;font-size:8.5pt;background:#fff;border:1pt solid #e2e8f0;padding:1pt 4pt;border-radius:3pt;flex-shrink:0;">${esc(sp.segment)}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:9.5pt;"><span style="display:inline-block;width:6pt;height:6pt;border-radius:50%;background:${ZONE_BORDER[sp.zone]};margin-right:4pt;vertical-align:middle;"></span><strong>${esc(sp.target)}</strong> <span style="color:#64748b;font-family:monospace;font-size:8.5pt;">${esc(sp.intensityPct)}</span></div>
        <div style="font-size:9pt;color:#475569;margin-top:1pt;line-height:1.35;">${esc(sp.cue)}</div>
      </div>
    </div>`).join("");

  const redFlagsHTML = s.redFlags.map(f => `<li style="margin-bottom:2pt;">${esc(f)}</li>`).join("");

  return `
  <div style="border:1pt solid #e2e8f0;border-radius:6pt;padding:10pt;margin-bottom:10pt;page-break-inside:avoid;">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6pt;margin-bottom:4pt;">
      <div style="font-size:11pt;font-weight:700;">${s.emoji} ${esc(s.label)} — <span style="color:#475569;font-weight:500;">${esc(s.strategyLabel)}</span></div>
      <div style="display:flex;gap:4pt;">
        <span style="font-size:8.5pt;padding:2pt 6pt;border-radius:99pt;background:${ROBUSTNESS_LABEL[s.robustness].color};color:white;">${ROBUSTNESS_LABEL[s.robustness].label}</span>
        <span style="font-size:8.5pt;padding:2pt 6pt;border-radius:99pt;background:#f1f5f9;color:#475569;">Échec ${s.failureProbPct}%</span>
        <span style="font-size:8.5pt;padding:2pt 6pt;border-radius:99pt;background:#f1f5f9;color:#475569;">Coût ${s.metabolicCost}/100</span>
      </div>
    </div>
    <div style="font-size:9pt;color:#475569;margin-bottom:6pt;font-style:italic;">${esc(s.strategyDescription)}</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6pt;margin-bottom:8pt;font-size:9pt;">
      <div style="background:#f8fafc;padding:5pt 7pt;border-radius:4pt;">
        <div style="color:#64748b;font-size:8pt;text-transform:uppercase;letter-spacing:0.5pt;">Repères d'effort</div>
        <div style="margin-top:2pt;"><strong>NP cible :</strong> ${fmtNP(s.effort.npLow)} → ${fmtNP(s.effort.npHigh)}</div>
        ${s.effort.climbTarget != null ? `<div><strong>${discipline === "bike" ? "Plafond bosse" : "Plafond accélération"} :</strong> ${fmtNP(s.effort.climbTarget)}</div>` : ""}
        <div><strong>TSS prévu :</strong> ${s.effort.tss}</div>
      </div>
      <div style="background:#f8fafc;padding:5pt 7pt;border-radius:4pt;">
        <div style="color:#64748b;font-size:8pt;text-transform:uppercase;letter-spacing:0.5pt;">Pour qui ?</div>
        <div style="margin-top:2pt;">${esc(s.forWho)}</div>
      </div>
    </div>

    <div style="font-size:9pt;color:#0f172a;font-weight:600;margin-bottom:3pt;">Timeline de splits</div>
    ${splitsHTML}

    <div style="margin-top:6pt;padding:5pt 7pt;background:#fef2f2;border-left:2pt solid #ef4444;border-radius:3pt;">
      <div style="font-size:8.5pt;font-weight:600;color:#991b1b;margin-bottom:2pt;">⚠ Drapeaux rouges</div>
      <ul style="margin:0;padding-left:14pt;font-size:9pt;color:#475569;">${redFlagsHTML}</ul>
    </div>
  </div>`;
}

export function renderBikePlanHTML(p: BikePlan): string {
  return `
  <h2>Plan stratégique — Vélo (${fmtDuration(p.durationMin)}) · FTP ${p.ftp} W</h2>
  <p style="font-size:9.5pt;color:#475569;margin:2pt 0 8pt;">Trois scénarios de pacing alignés sur ton couloir d'effort. Choisis-en un, et tiens-le.</p>
  ${p.scenarios.map(s => renderScenarioBlock(s, "bike")).join("")}`;
}

export function renderRunPlanHTML(p: RunPlan): string {
  return `
  <h2>Plan stratégique — Course à pied (${fmtDuration(p.durationMin)}) · Seuil ${fmtPaceSec(p.paceThresholdSecKm)}</h2>
  <p style="font-size:9.5pt;color:#475569;margin:2pt 0 8pt;">Trois scénarios de pacing alignés sur ton couloir d'effort. Choisis-en un, et tiens-le.</p>
  ${p.scenarios.map(s => renderScenarioBlock(s, "run")).join("")}`;
}

export function renderNutritionPlanHTML(p: NutritionPlan): string {
  return `
  <h2>Plan stratégique — Nutrition (${fmtDuration(p.durationMin)})</h2>
  <table>
    <thead><tr><th>Phase</th><th>g CHO / h</th><th>Total</th></tr></thead>
    <tbody>
      <tr><td>Début (0-30%)</td><td>${p.windows.early} g/h</td><td rowspan="3" style="vertical-align:middle;text-align:center;font-weight:700;">${p.totalCarbsG} g<br/><span style="font-weight:400;color:#64748b;font-size:9pt;">≈ ${p.totalKcal} kcal</span></td></tr>
      <tr><td>Cœur de course</td><td>${p.windows.mid} g/h</td></tr>
      <tr><td>Fin (70-100%)</td><td>${p.windows.late} g/h</td></tr>
    </tbody>
  </table>
  <p style="font-size:9pt;color:#64748b;margin-top:4pt;">Modèle Mader-Heck (intensité ${p.intensityPct}% ${p.sport === "velo" ? "FTP" : "seuil"}, ${p.durationH.toFixed(1)}h${p.heat ? ", chaleur +10%" : ""}).</p>`;
}
