/**
 * F3 — Caffeine Protocol Engine
 * 
 * Référence : Guest et al. 2021 — JISSN ISSN Position Stand on Caffeine
 * + Spriet 2014, Pickering & Kiely 2018 (CYP1A2 individualisation)
 * + Yeo 2005 (synergie absorption glucides)
 * 
 * Doses :
 *   - Pré-effort : 3–6 mg/kg, 45–60 min avant départ
 *   - Relance intra-effort : 1–2 mg/kg toutes 90–120 min après le start
 *   - Plafond cumulé sécurité : 9 mg/kg/jour
 * 
 * Sensibilité (CYP1A2 rs762551) :
 *   - AA (rapide, ~50 % pop) : peut tolérer 6 mg/kg
 *   - AC/CC (lent) : limiter à 2–3 mg/kg, sinon effets délétères perf
 */

export type CaffeineSensitivity = "fast" | "average" | "slow" | "unknown";

export interface CaffeineProtocolInput {
  weightKg: number | null;
  durationMin: number;        // Durée prévue de l'effort
  sensitivity?: CaffeineSensitivity;
  /** Heure de départ (HH:MM) — utilisée pour timing pré-effort */
  startTime?: string;
  /** Si l'athlète prend déjà café/thé quotidiennement */
  habitualUser?: boolean;
}

export interface CaffeineDose {
  label: string;
  timing: string;            // ex. "T-45 min" ou "T+90 min"
  doseMgKg: number;
  doseMgAbsolute: number;
  source: string;            // ex. "1 gel caféiné (75 mg)"
}

export interface CaffeineProtocolResult {
  isApplicable: boolean;
  reason?: string;
  preDose: CaffeineDose | null;
  inRaceDoses: CaffeineDose[];
  totalMg: number;
  totalMgKg: number;
  safetyFlag: "ok" | "warning" | "exceeded";
  notes: string[];
  references: string[];
}

// =============================================
// LOGIQUE
// =============================================

function getPreDoseMgKg(sensitivity: CaffeineSensitivity, habitual: boolean): number {
  // Habituel = tolérance ↑ donc dose efficace ↑ légèrement
  const habitualBoost = habitual ? 0.5 : 0;
  switch (sensitivity) {
    case "fast":   return 5.0 + habitualBoost; // jusqu'à 6
    case "slow":   return 2.5;                 // strict
    case "average":
    case "unknown":
    default:       return 3.5 + habitualBoost; // 3-4
  }
}

function getInRaceDoseMgKg(sensitivity: CaffeineSensitivity): number {
  switch (sensitivity) {
    case "fast":   return 1.5;
    case "slow":   return 0.8;
    default:       return 1.2;
  }
}

function getInRaceFrequencyMin(sensitivity: CaffeineSensitivity): number {
  // Demi-vie ~5h ; relance 90-120 min selon sensibilité
  return sensitivity === "slow" ? 150 : 90;
}

function describeSource(mgAbsolute: number): string {
  if (mgAbsolute < 50) return `≈ 1 espresso ou 1 gel léger (${Math.round(mgAbsolute)} mg)`;
  if (mgAbsolute < 100) return `≈ 1 gel caféiné (${Math.round(mgAbsolute)} mg)`;
  if (mgAbsolute < 200) return `≈ 1 double espresso ou 2 gels (${Math.round(mgAbsolute)} mg)`;
  return `${Math.round(mgAbsolute)} mg — fractionner conseillé`;
}

function offsetTime(startTime: string | undefined, offsetMin: number): string {
  if (!startTime) return offsetMin < 0 ? `T${offsetMin} min` : `T+${offsetMin} min`;
  const [h, m] = startTime.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return `T+${offsetMin} min`;
  const total = h * 60 + m + offsetMin;
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = Math.floor(wrapped / 60).toString().padStart(2, "0");
  const mm = (wrapped % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

// =============================================
// FONCTION PRINCIPALE
// =============================================

export function computeCaffeineProtocol(input: CaffeineProtocolInput): CaffeineProtocolResult {
  const { weightKg, durationMin, startTime, habitualUser = true } = input;
  const sensitivity: CaffeineSensitivity = input.sensitivity ?? "unknown";

  const baseRefs = [
    "Guest et al. 2021 — JISSN ISSN Position Stand on Caffeine",
    "Spriet 2014 — Sports Med",
    "Pickering & Kiely 2018 — CYP1A2 individualisation",
    "Yeo 2005 — co-ingestion glucides + caféine",
  ];

  // Garde-fou — données insuffisantes
  if (!weightKg || weightKg < 30) {
    return {
      isApplicable: false,
      reason: "Poids athlète manquant — protocole non calculable",
      preDose: null,
      inRaceDoses: [],
      totalMg: 0,
      totalMgKg: 0,
      safetyFlag: "ok",
      notes: ["Renseigner le poids pour générer le protocole."],
      references: baseRefs,
    };
  }

  // Caféine non recommandée pour efforts < 30 min (effet faible vs risque GI)
  if (durationMin < 30) {
    return {
      isApplicable: false,
      reason: "Effort trop court (<30 min) — bénéfice ergogénique marginal",
      preDose: null,
      inRaceDoses: [],
      totalMg: 0,
      totalMgKg: 0,
      safetyFlag: "ok",
      notes: ["Pour efforts <30 min : éventuellement 1–3 mg/kg pré-effort si athlète l'utilise habituellement."],
      references: baseRefs,
    };
  }

  // Pré-dose
  const preMgKg = getPreDoseMgKg(sensitivity, habitualUser);
  const preMg = Math.round(preMgKg * weightKg);
  const preDose: CaffeineDose = {
    label: "Pré-effort",
    timing: offsetTime(startTime, -45),
    doseMgKg: Number(preMgKg.toFixed(1)),
    doseMgAbsolute: preMg,
    source: describeSource(preMg),
  };

  // Doses de relance intra-effort (uniquement si durée > 90 min)
  const inRaceDoses: CaffeineDose[] = [];
  if (durationMin >= 90) {
    const freqMin = getInRaceFrequencyMin(sensitivity);
    const relanceMgKg = getInRaceDoseMgKg(sensitivity);
    // Première relance à freqMin, dernière au plus tard 60 min avant la fin
    let t = freqMin;
    while (t <= durationMin - 60) {
      const mg = Math.round(relanceMgKg * weightKg);
      inRaceDoses.push({
        label: `Relance #${inRaceDoses.length + 1}`,
        timing: offsetTime(startTime, t),
        doseMgKg: Number(relanceMgKg.toFixed(1)),
        doseMgAbsolute: mg,
        source: describeSource(mg),
      });
      t += freqMin;
    }
  }

  // Cumul + sécurité
  const totalMg = preMg + inRaceDoses.reduce((s, d) => s + d.doseMgAbsolute, 0);
  const totalMgKg = totalMg / weightKg;

  let safetyFlag: "ok" | "warning" | "exceeded" = "ok";
  const notes: string[] = [];

  if (totalMgKg > 9) {
    safetyFlag = "exceeded";
    notes.push("🚨 Cumul > 9 mg/kg : seuil de sécurité dépassé. Réduire ou espacer.");
  } else if (totalMgKg > 6) {
    safetyFlag = "warning";
    notes.push("⚠️ Cumul élevé (>6 mg/kg) : tester impérativement à l'entraînement.");
  }

  // Notes pédagogiques
  if (sensitivity === "slow") {
    notes.push("Sensibilité lente (CYP1A2 AC/CC) : doses minimisées, attention insomnie post-effort.");
  } else if (sensitivity === "fast") {
    notes.push("Métaboliseur rapide (CYP1A2 AA) : marge ergogénique optimale, dose haute tolérée.");
  } else if (sensitivity === "unknown") {
    notes.push("Sensibilité non testée : démarrer dans la fourchette basse, ajuster sur 2-3 séances.");
  }

  if (!habitualUser) {
    notes.push("Non-consommateur habituel : effet ergogénique souvent supérieur, mais risque GI ↑.");
  }

  notes.push("Synergie : co-ingérer avec les glucides (Yeo 2005, +26 % absorption intestinale).");
  notes.push("Demi-vie ~5h : éviter la dernière dose <4h avant le coucher si course en soirée.");

  return {
    isApplicable: true,
    preDose,
    inRaceDoses,
    totalMg,
    totalMgKg: Number(totalMgKg.toFixed(2)),
    safetyFlag,
    notes,
    references: baseRefs,
  };
}

export const CAFFEINE_DISCLAIMER =
  "Protocole pédagogique. Toujours tester en entraînement. Contre-indications : grossesse, hypertension, troubles du rythme.";
