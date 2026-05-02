/**
 * F5 — Gut Training Protocol
 *
 * Programme progressif d'entraînement digestif pour augmenter la tolérance
 * aux glucides intra-effort (de 60 g/h "untrained" jusqu'à 120-150 g/h "elite").
 *
 * Références :
 *   - Costa et al. 2017 — Aliment Pharmacol Ther — gut training & FODMAP
 *   - Jeukendrup 2017 — Sports Med — Training the gut for athletes
 *   - Cox et al. 2010 — J Appl Physiol — Daily training with high CHO ↑ oxidation
 *   - Miall et al. 2018 — Eur J Sport Sci — 2-week gut training
 *   - King et al. 2022 — MSSE — High CHO 120 g/h ultra
 *
 * Principe : +10 à +15 g/h par semaine, 2-3 séances longues / sem.
 * avec apport CHO progressivement supérieur à la tolérance actuelle.
 *
 * Adaptations physiologiques visées :
 *   - Up-regulation transporteurs SGLT1 + GLUT5
 *   - ↑ vitesse vidange gastrique (entraînement osmotique)
 *   - ↓ inflammation intestinale induite par l'effort
 *   - Tolérance au stress mécanique (running surtout)
 */

import type { GutTrainingLevel } from "./caffeineProtocol"; // unused placeholder, will redefine

export type GutLevel = "untrained" | "developing" | "trained" | "elite";

export interface GutTrainingInput {
  currentLevel: GutLevel;
  targetGph: number;          // Cible visée (ex: 120 pour ultra)
  weeksAvailable: number;     // Jusqu'à la course
  sport: "velo" | "cap" | "triathlon";
  weightKg?: number | null;
}

export interface GutTrainingWeek {
  weekNumber: number;
  targetGph: number;
  sessionsPerWeek: number;
  sessionDurationMin: number;
  glucoseFructoseRatio: string;
  format: string;            // ex: "boisson + gel"
  rpeWindow: string;         // ex: "Z2-Z3"
  notes: string[];
}

export interface GutTrainingResult {
  isApplicable: boolean;
  reason?: string;
  startGph: number;
  targetGph: number;
  weeksNeeded: number;
  fitsTimeline: boolean;
  weeks: GutTrainingWeek[];
  warningSigns: string[];
  successCriteria: string[];
  references: string[];
}

// =============================================
// CONSTANTES
// =============================================

const STARTING_GPH: Record<GutLevel, number> = {
  untrained: 40,
  developing: 60,
  trained: 80,
  elite: 100,
};

// Progression par semaine selon niveau de départ
const WEEKLY_INCREMENT_GPH: Record<GutLevel, number> = {
  untrained: 10,    // Prudent
  developing: 12,
  trained: 15,
  elite: 15,
};

// =============================================
// HELPERS
// =============================================

function getRatioForGph(gph: number): string {
  if (gph <= 60) return "Glucose seul OK";
  if (gph <= 90) return "1 : 0.5 (gluc:fruct)";
  if (gph <= 120) return "1 : 0.8 (gluc:fruct)";
  return "1 : 0.8 strict";
}

function getFormatForSport(sport: "velo" | "cap" | "triathlon", gph: number): string {
  if (sport === "cap") {
    if (gph <= 50) return "Boisson glucidique uniquement";
    if (gph <= 75) return "Boisson + 1 gel toutes les 30 min";
    return "Boisson + gels fréquents (gut stress max)";
  }
  if (sport === "triathlon") {
    if (gph <= 70) return "Boisson + barres tolérées";
    if (gph <= 100) return "Mix boisson + gels + barres";
    return "Hydrogel + multi-sources";
  }
  // Vélo
  if (gph <= 70) return "Boisson + barres";
  if (gph <= 100) return "Mix boisson + gels + solides";
  return "Multi-sources fractionnées toutes les 15 min";
}

function getSessionConfig(week: number, sport: "velo" | "cap" | "triathlon"): {
  sessions: number;
  duration: number;
  rpe: string;
} {
  // Plus on avance, plus la séance est longue (challenge progressif)
  const baseDuration = sport === "cap" ? 90 : 120;
  const duration = Math.min(baseDuration + week * 15, sport === "cap" ? 180 : 300);
  return {
    sessions: week <= 2 ? 2 : 3,
    duration,
    rpe: "Z2 (FatMax → MLSS)",
  };
}

// =============================================
// FONCTION PRINCIPALE
// =============================================

export function computeGutTrainingProtocol(input: GutTrainingInput): GutTrainingResult {
  const { currentLevel, targetGph, weeksAvailable, sport } = input;

  const baseRefs = [
    "Costa et al. 2017 — Aliment Pharmacol Ther — Gut training & FODMAP",
    "Jeukendrup 2017 — Sports Med — Training the gut for athletes",
    "Cox et al. 2010 — J Appl Physiol — Daily high-CHO ↑ oxidation",
    "Miall et al. 2018 — Eur J Sport Sci — 2-week gut training",
    "King et al. 2022 — MSSE — High CHO 120 g/h ultra",
  ];

  const startGph = STARTING_GPH[currentLevel];

  // Cas trivial : déjà au niveau
  if (targetGph <= startGph) {
    return {
      isApplicable: false,
      reason: `Tolérance actuelle (${startGph} g/h) déjà ≥ cible (${targetGph} g/h). Maintien suffisant.`,
      startGph,
      targetGph,
      weeksNeeded: 0,
      fitsTimeline: true,
      weeks: [],
      warningSigns: [],
      successCriteria: [
        `Confirmer ${targetGph} g/h sur 2 séances longues sans GI distress`,
      ],
      references: baseRefs,
    };
  }

  const increment = WEEKLY_INCREMENT_GPH[currentLevel];
  const gphDelta = targetGph - startGph;
  const weeksNeeded = Math.ceil(gphDelta / increment);
  const fitsTimeline = weeksAvailable >= weeksNeeded;

  // Génération du plan progressif
  const weeks: GutTrainingWeek[] = [];
  for (let w = 1; w <= weeksNeeded; w++) {
    const gph = Math.min(targetGph, startGph + increment * w);
    const config = getSessionConfig(w, sport);

    const notes: string[] = [];

    // Notes spécifiques par phase
    if (w === 1) {
      notes.push("📌 Semaine d'amorce — viser confort > performance");
    }
    if (gph >= 90 && getRatioForGph(gph) !== getRatioForGph(gph - increment)) {
      notes.push("⚠️ Bascule sur ratio multi-transporteurs (introduire fructose)");
    }
    if (gph >= 120) {
      notes.push("🔥 Zone élite — fractionner en prises de 15-20 g toutes les 10 min");
    }
    if (sport === "cap" && gph >= 75) {
      notes.push("🏃 CAP : privilégier formes liquides (gels dilués)");
    }
    if (w === weeksNeeded) {
      notes.push("✅ Test confirmation : 2 séances consécutives sans GI distress");
    }

    weeks.push({
      weekNumber: w,
      targetGph: gph,
      sessionsPerWeek: config.sessions,
      sessionDurationMin: config.duration,
      glucoseFructoseRatio: getRatioForGph(gph),
      format: getFormatForSport(sport, gph),
      rpeWindow: config.rpe,
      notes,
    });
  }

  const warningSigns = [
    "Crampes abdominales > 5 min après prise",
    "Diarrhée ou ballonnements persistants",
    "Reflux acide ou nausées",
    "Sensation de plénitude gastrique > 30 min",
    "→ Si persistant : revenir au palier précédent 1-2 semaines",
  ];

  const successCriteria = [
    `Atteindre ${targetGph} g/h sur 2 séances longues consécutives`,
    "GI distress score < 3/10 (échelle Pfeiffer)",
    "Glycémie stable post-effort (pas d'hypoglycémie reactive)",
    "Pas de reflux, pas de selles liquides post-effort",
  ];

  return {
    isApplicable: true,
    startGph,
    targetGph,
    weeksNeeded,
    fitsTimeline,
    weeks,
    warningSigns,
    successCriteria,
    references: baseRefs,
  };
}

export const GUT_TRAINING_DISCLAIMER =
  "Protocole progressif — adapter selon tolérance individuelle. Si symptômes GI persistants, consulter un nutritionniste sportif. Contre-indiqué en cas de SII actif ou pathologie digestive.";
