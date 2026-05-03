/**
 * F8 — Presets ergogéniques par discipline
 *
 * Stacks pré-configurés selon le profil de course typique de chaque discipline
 * et la durée. Sert de "défaut intelligent" que le coach peut surcharger.
 *
 * Références :
 *  - Maughan et al. 2018 (IOC Consensus)
 *  - Burke 2017 — Ergogenic aids in endurance
 *  - Pickering & Grgic 2020 — Caffeine + Bicarb co-ingestion
 */

import type { ErgogenicAidsInput } from "./ergogenicAidsProtocol";

export type Discipline = "bike" | "run" | "tri" | "trail";

export interface ErgogenicPreset {
  id: string;
  label: string;
  discipline: Discipline;
  description: string;
  // Surcharges appliquées par-dessus le profil athlète
  overrides: Partial<Pick<ErgogenicAidsInput, "hasRepeatedEfforts" | "bicarbTested" | "vegetarian">>;
  // Stack mis en avant (ordre d'importance)
  priorityStack: string[];
  /** Plage de durées (min) pour laquelle ce preset est pertinent */
  durationRange: [number, number];
  /** Note clinique courte pour le coach */
  coachNote: string;
}

export const ERGOGENIC_PRESETS: ErgogenicPreset[] = [
  // ─── BIKE ──────────────────────────────────────────────────────────────────
  {
    id: "bike-crit",
    label: "Crit / Kermesse (<60 min)",
    discipline: "bike",
    description: "Efforts répétés explosifs, sprints, attaques.",
    overrides: { hasRepeatedEfforts: true },
    priorityStack: ["Caféine", "Beta-alanine", "Créatine", "Nitrates", "Bicarbonate"],
    durationRange: [30, 60],
    coachNote: "Stack glycolytique : prioriser tampon H⁺ (beta-alanine + bicarb si testé).",
  },
  {
    id: "bike-tt",
    label: "Time Trial (10–60 min)",
    discipline: "bike",
    description: "Effort soutenu seuil → V̇O₂max.",
    overrides: { hasRepeatedEfforts: false },
    priorityStack: ["Caféine", "Nitrates", "Beta-alanine", "Bicarbonate"],
    durationRange: [10, 60],
    coachNote: "Nitrates +3–5 % économie O₂ — efficacité maximale sur cette plage.",
  },
  {
    id: "bike-gran-fondo",
    label: "Granfondo / Étape (>3h)",
    discipline: "bike",
    description: "Endurance longue avec relances en bosses.",
    overrides: { hasRepeatedEfforts: true },
    priorityStack: ["Caféine fractionnée", "Créatine (chronique)", "Nitrates"],
    durationRange: [180, 600],
    coachNote: "Prioriser fueling (F4) + hydratation (F6). Ergogéniques en appui.",
  },

  // ─── RUN ───────────────────────────────────────────────────────────────────
  {
    id: "run-5k",
    label: "5 km / 3000 m",
    discipline: "run",
    description: "Effort court intense, charge glycolytique majeure.",
    overrides: { hasRepeatedEfforts: false },
    priorityStack: ["Caféine", "Beta-alanine", "Bicarbonate", "Nitrates"],
    durationRange: [10, 25],
    coachNote: "Zone optimale beta-alanine + bicarb. Tester impérativement à l'entraînement.",
  },
  {
    id: "run-10k-semi",
    label: "10 km — Semi",
    discipline: "run",
    description: "Effort soutenu seuil/sup-seuil.",
    overrides: { hasRepeatedEfforts: false },
    priorityStack: ["Caféine", "Nitrates", "Beta-alanine"],
    durationRange: [25, 120],
    coachNote: "Combo caféine + nitrates : effets ergogéniques additifs documentés.",
  },
  {
    id: "run-marathon",
    label: "Marathon",
    discipline: "run",
    description: "Endurance soutenue 2–4h.",
    overrides: { hasRepeatedEfforts: false },
    priorityStack: ["Caféine fractionnée", "Nitrates"],
    durationRange: [120, 240],
    coachNote: "Fueling (F4) + gut training (F5) prioritaires. Caféine en relances ciblées.",
  },
  {
    id: "run-trail-ultra",
    label: "Trail / Ultra (>4h)",
    discipline: "trail",
    description: "Ultra-endurance, dénivelé, terrain irrégulier.",
    overrides: { hasRepeatedEfforts: true },
    priorityStack: ["Caféine fractionnée", "Créatine (chronique)"],
    durationRange: [240, 1440],
    coachNote: "Limiter ergogéniques aigus (risque GI). Hydratation (F6) + recovery (F7) clés.",
  },
];

/**
 * Sélectionne automatiquement le preset le plus adapté.
 * Heuristique : match discipline + plage de durée la plus étroite couvrante.
 */
export function suggestPreset(
  discipline: Discipline,
  durationMin: number
): ErgogenicPreset | null {
  // Normalise tri → bike pour la recherche (tri = bike + run, on prend bike par défaut)
  const searchDisc: Discipline = discipline === "tri" ? "bike" : discipline;

  const candidates = ERGOGENIC_PRESETS.filter(
    (p) =>
      (p.discipline === searchDisc || (searchDisc === "run" && p.discipline === "trail")) &&
      durationMin >= p.durationRange[0] &&
      durationMin <= p.durationRange[1]
  );

  if (candidates.length === 0) {
    // Fallback : preset le plus proche en distance
    const sameDisc = ERGOGENIC_PRESETS.filter((p) => p.discipline === searchDisc);
    if (sameDisc.length === 0) return null;
    return sameDisc.reduce((best, p) => {
      const distP =
        durationMin < p.durationRange[0]
          ? p.durationRange[0] - durationMin
          : durationMin - p.durationRange[1];
      const distB =
        durationMin < best.durationRange[0]
          ? best.durationRange[0] - durationMin
          : durationMin - best.durationRange[1];
      return distP < distB ? p : best;
    });
  }

  // Préférer la plage la plus étroite (la plus spécifique)
  return candidates.reduce((best, p) => {
    const widthP = p.durationRange[1] - p.durationRange[0];
    const widthB = best.durationRange[1] - best.durationRange[0];
    return widthP < widthB ? p : best;
  });
}

export function getPresetsByDiscipline(discipline: Discipline): ErgogenicPreset[] {
  const searchDisc: Discipline = discipline === "tri" ? "bike" : discipline;
  return ERGOGENIC_PRESETS.filter(
    (p) => p.discipline === searchDisc || (searchDisc === "run" && p.discipline === "trail")
  );
}
