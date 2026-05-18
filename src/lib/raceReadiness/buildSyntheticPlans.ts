/**
 * Race Readiness — Plans synthétiques A / B (Vélo, CAP, Nutrition)
 * Pour inclusion dans le bilan pré-objectif (UI + PDF).
 *
 * Logique :
 *  - Durée et intensité cibles par objectif (IM, 70.3, Marathon, Semi, 10K, 5K, Trails, StartToRun)
 *  - Ambition (Découverte / Optimisation / Performance) module le centre de couloir
 *  - Plan A = "Robuste" (bas du couloir) — sécurise le jour J
 *  - Plan B = "Ambitieux" (haut du couloir) — vise la perf
 *  - Nutrition CHO via `computeBaseRateMader` (Mader-Heck canonique, F26)
 */

import { computeBaseRateMader } from "@/lib/v2/nutritionUnified";

export type PlanKind = "bike" | "run" | "nutrition";

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
  /** Durée estimée totale (min) — ordre de grandeur. */
  durationMin: number;
  /** % FTP cible (vélo) — centre de couloir. Null si non pertinent. */
  bikeCenterPct: number | null;
  /** % allure seuil (CAP) — centre de couloir. Null si non pertinent. */
  runCenterPct: number | null;
  /** Discipline principale pour la nutrition. */
  nutritionSport: "velo" | "cap";
}

const OBJ_PRESETS: Record<string, ObjectivePreset> = {
  IM:           { durationMin: 600, bikeCenterPct: 71, runCenterPct: 92, nutritionSport: "velo" },
  "703":        { durationMin: 270, bikeCenterPct: 81, runCenterPct: 95, nutritionSport: "velo" },
  Marathon:     { durationMin: 210, bikeCenterPct: null, runCenterPct: 94, nutritionSport: "cap" },
  Semi:         { durationMin: 95,  bikeCenterPct: null, runCenterPct: 98, nutritionSport: "cap" },
  "10K":        { durationMin: 45,  bikeCenterPct: null, runCenterPct: 102, nutritionSport: "cap" },
  "5K":         { durationMin: 22,  bikeCenterPct: null, runCenterPct: 106, nutritionSport: "cap" },
  StartToRun:   { durationMin: 35,  bikeCenterPct: null, runCenterPct: 87, nutritionSport: "cap" },
  TrailShort:   { durationMin: 120, bikeCenterPct: null, runCenterPct: 90, nutritionSport: "cap" },
  TrailMountain:{ durationMin: 360, bikeCenterPct: null, runCenterPct: 80, nutritionSport: "cap" },
  TrailUltra:   { durationMin: 900, bikeCenterPct: null, runCenterPct: 72, nutritionSport: "cap" },
};

function ambitionShift(ambition: string): number {
  const a = (ambition || "").toLowerCase();
  if (a.includes("perf")) return +2;       // pousse le couloir
  if (a.includes("decouv") || a.includes("découv")) return -2;
  return 0;                                 // optimisation = neutre
}

function fmtPace(secKm: number): string {
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

export interface BikePlan {
  durationMin: number;
  planA: { pct: number; wattsLo: number; wattsHi: number; label: string };
  planB: { pct: number; wattsLo: number; wattsHi: number; label: string };
}

export function buildBikePlan(inputs: SyntheticPlanInputs): BikePlan | null {
  const preset = OBJ_PRESETS[inputs.objectif];
  if (!preset || preset.bikeCenterPct == null || !inputs.ftp) return null;

  const shift = ambitionShift(inputs.ambition);
  const centerA = preset.bikeCenterPct - 3 + shift;       // robuste
  const centerB = preset.bikeCenterPct + 2 + shift;       // ambitieux

  const range = (c: number) => ({
    pct: c,
    wattsLo: Math.round(inputs.ftp! * (c - 3) / 100),
    wattsHi: Math.round(inputs.ftp! * (c + 3) / 100),
  });

  const a = range(centerA);
  const b = range(centerB);

  return {
    durationMin: preset.durationMin,
    planA: { ...a, label: "Plan A — Robuste" },
    planB: { ...b, label: "Plan B — Ambitieux" },
  };
}

export interface RunPlan {
  durationMin: number;
  planA: { pct: number; paceLo: string; paceHi: string; label: string };
  planB: { pct: number; paceLo: string; paceHi: string; label: string };
}

export function buildRunPlan(inputs: SyntheticPlanInputs): RunPlan | null {
  const preset = OBJ_PRESETS[inputs.objectif];
  if (!preset || preset.runCenterPct == null || !inputs.paceThresholdSecKm) return null;

  const shift = ambitionShift(inputs.ambition);
  const centerA = preset.runCenterPct - 3 + shift;
  const centerB = preset.runCenterPct + 2 + shift;

  const range = (c: number) => {
    // pct ↑ => allure plus rapide => sec/km ↓
    const fast = inputs.paceThresholdSecKm! * (100 / (c + 3));
    const slow = inputs.paceThresholdSecKm! * (100 / (c - 3));
    return { pct: c, paceLo: fmtPace(slow), paceHi: fmtPace(fast) };
  };

  return {
    durationMin: preset.durationMin,
    planA: { ...range(centerA), label: "Plan A — Robuste" },
    planB: { ...range(centerB), label: "Plan B — Ambitieux" },
  };
}

export interface NutritionPlan {
  sport: "velo" | "cap";
  durationMin: number;
  durationH: number;
  intensityPct: number;
  /** g CHO / heure */
  baseRateGh: number;
  /** g CHO total */
  totalCarbsG: number;
  /** kcal total */
  totalKcal: number;
  /** Fenêtres pratiques (early/mid/late g/h) */
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

  // Fenêtres pratiques : early = 75%, mid = 100%, late = 110% (rampe nutrition long format)
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
// Rendu HTML (pour PDF) — chaque section est optionnelle.
// ──────────────────────────────────────────────────────────────────────────────

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function renderBikePlanHTML(p: BikePlan): string {
  return `
  <h2>Plan stratégique — Vélo (${fmtDuration(p.durationMin)})</h2>
  <table>
    <thead><tr><th>Scénario</th><th>Cible</th><th>Puissance</th></tr></thead>
    <tbody>
      <tr><td><strong>${esc(p.planA.label)}</strong></td><td>${p.planA.pct}% FTP</td><td>${p.planA.wattsLo}–${p.planA.wattsHi} W</td></tr>
      <tr><td><strong>${esc(p.planB.label)}</strong></td><td>${p.planB.pct}% FTP</td><td>${p.planB.wattsLo}–${p.planB.wattsHi} W</td></tr>
    </tbody>
  </table>
  <p style="font-size:9pt;color:#64748b;margin-top:4pt;">Robuste = sécurise le finish. Ambitieux = vise le chrono optimal. Garde 5-10W de marge sur les bosses.</p>`;
}

export function renderRunPlanHTML(p: RunPlan): string {
  return `
  <h2>Plan stratégique — Course à pied (${fmtDuration(p.durationMin)})</h2>
  <table>
    <thead><tr><th>Scénario</th><th>Cible</th><th>Allure</th></tr></thead>
    <tbody>
      <tr><td><strong>${esc(p.planA.label)}</strong></td><td>${p.planA.pct}% seuil</td><td>${esc(p.planA.paceLo)} → ${esc(p.planA.paceHi)}</td></tr>
      <tr><td><strong>${esc(p.planB.label)}</strong></td><td>${p.planB.pct}% seuil</td><td>${esc(p.planB.paceLo)} → ${esc(p.planB.paceHi)}</td></tr>
    </tbody>
  </table>
  <p style="font-size:9pt;color:#64748b;margin-top:4pt;">Plan A : démarre dans le bas du couloir, ouvre seulement après le mi-parcours si tout est ok.</p>`;
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
