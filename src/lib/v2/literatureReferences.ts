/**
 * TWO FOR COACHING LAB — Références littérature externe (validation & ancrage)
 *
 * Objectif : ancrer les cohortes de calibration/validation sur des distributions
 * PUBLIÉES plutôt que sur les hypothèses internes du modèle (anti-auto-référence),
 * et fournir des cibles populationnelles + bornes de plausibilité.
 *
 * ⚠️ Ces valeurs sont des statistiques de GROUPE (moyenne ± SD, N).
 * Elles ne remplacent PAS une cohorte d'athlètes réels testés individuellement.
 * Usage prévu :
 *   1) DISTRIBUTIONS  → priors pour le générateur de cohorte synthétique ancrée
 *   2) CIBLES         → relations que le modèle DOIT reproduire (tests de validation)
 *   3) BORNES         → garde-fous "hors domaine de validation" sur inputs/outputs
 *
 * Toutes les sources sont en accès libre. DOI fournis pour traçabilité.
 */

export type Discipline = 'run' | 'bike';
export type AthleteTier = 'recreational' | 'trained' | 'subelite' | 'elite';

export interface LiteratureReference {
  key: string;
  citation: string;
  doi: string;
  n: number;
  discipline: Discipline;
  population: string;
  openAccess: boolean;
  /** Ce que la source permet d'ancrer/valider. */
  role: 'distribution' | 'target' | 'sensitivity' | 'anchor';
}

// ============================================
// 1️⃣ RÉFÉRENCES SOURCES
// ============================================

export const LITERATURE_REFERENCES: Record<string, LiteratureReference> = {
  medicina_2021_run: {
    key: 'medicina_2021_run',
    citation:
      'Hommel et al. (2021). Comparison and Performance Validation of Calculated and ' +
      'Established Anaerobic Lactate Thresholds in Running. Medicina 57(10):1117.',
    doi: '10.3390/medicina57101117',
    n: 10,
    discipline: 'run',
    population: 'Coureurs sub-élite masculins, demi-fond/fond',
    openAccess: true,
    role: 'target', // utilise la MÊME méthode Mader/Heck (cLTAn) que TFCLab
  },
  sports_2023_run: {
    key: 'sports_2023_run',
    citation:
      'Fleckenstein et al. (2023). From Incremental Test to Continuous Running at Fixed ' +
      'Lactate Thresholds. Sports 11(10):198.',
    doi: '10.3390/sports11100198',
    n: 15,
    discipline: 'run',
    population: 'Coureurs entraînés (10H/5F), jeunes',
    openAccess: true,
    role: 'target', // %VO2max au seuil 2 mmol
  },
  poffe_2024_bike: {
    key: 'poffe_2024_bike',
    citation:
      'Poffé, Van Dael & Van Schuylenbergh (2024). INSCYD software valid to determine MLSS ' +
      'in male and female cyclists. Front Sports Act Living 6:1376876.',
    doi: '10.3389/fspor.2024.1376876',
    n: 29,
    discipline: 'bike',
    population: 'Cyclistes entraînés (19H/10F)',
    openAccess: true,
    role: 'sensitivity',
  },
  mlss_ijerph_2018_run: {
    key: 'mlss_ijerph_2018_run',
    citation:
      'Sex-Related Differences in the Maximal Lactate Steady State (2018). Int J Environ Res ' +
      'Public Health, PMC6316329. [DOI à confirmer]',
    doi: 'PMC6316329',
    n: 14,
    discipline: 'run',
    population: 'Coureurs entraînés, MLSS gold-standard (30-min trials)',
    openAccess: true,
    role: 'target',
  },
} as const;

// ============================================
// 2️⃣ DISTRIBUTIONS DE RÉFÉRENCE (priors cohorte synthétique)
// ============================================
// Servent à TIRER des profils réalistes (mean/SD), PAS à les dériver du modèle.

export interface RefDistribution {
  mean: number;
  sd: number;
  unit: string;
  source: string; // key de LITERATURE_REFERENCES
}

export const REFERENCE_DISTRIBUTIONS: Record<
  Discipline,
  Partial<Record<AthleteTier, { vo2max: RefDistribution; vlamax: RefDistribution }>>
> = {
  run: {
    subelite: {
      vo2max: { mean: 69.8, sd: 6.7, unit: 'ml/kg/min', source: 'medicina_2021_run' },
      vlamax: { mean: 0.39, sd: 0.09, unit: 'mmol/L/s', source: 'medicina_2021_run' },
    },
    trained: {
      // VO2max issu de Sports 2023 (59.3 ± 5.9) ; VLamax course typique 0.35-0.45
      vo2max: { mean: 59.3, sd: 5.9, unit: 'ml/kg/min', source: 'sports_2023_run' },
      vlamax: { mean: 0.40, sd: 0.10, unit: 'mmol/L/s', source: 'medicina_2021_run' },
    },
  },
  bike: {
    trained: {
      vo2max: { mean: 59.4, sd: 10.0, unit: 'ml/kg/min', source: 'poffe_2024_bike' },
      vlamax: { mean: 0.56, sd: 0.15, unit: 'mmol/L/s', source: 'poffe_2024_bike' },
    },
  },
};

// ============================================
// 3️⃣ CIBLES POPULATIONNELLES (le modèle DOIT les reproduire)
// ============================================
// Un écart systématique du modèle à ces cibles = biais réel, pas bruit.

export interface PopulationTarget {
  metric: string;
  mean: number;
  sd: number;
  range: [number, number];
  unit: string;
  source: string;
  note: string;
}

export const POPULATION_TARGETS: PopulationTarget[] = [
  {
    metric: 'run_LT1_2mmol_pct_vo2max',
    mean: 79.2,
    sd: 2.5,
    range: [74.9, 83.8],
    unit: '% VO2max',
    source: 'sports_2023_run',
    note: 'Seuil LT1 fixe 2 mmol/L (PAS le MLSS). Repère aérobie — 15 coureurs entraînés.',
  },
  {
    metric: 'run_MLSS_pct_vo2max',
    mean: 83,
    sd: 5,
    range: [78, 88],
    unit: '% VO2max',
    source: 'mlss_ijerph_2018_run',
    note: 'Vrai MLSS (LT2) coureurs entraînés, 30-min trials. Cible de validation MLSS course.',
  },
  {
    metric: 'bike_MLSS_pct_vo2max',
    mean: 76.6,
    sd: 5.8,
    range: [65, 88],
    unit: '% VO2max',
    source: 'poffe_2024_bike',
    note: 'PMLSS/VO2max, 29 cyclistes. Cible de validation MLSS% vélo.',
  },
];

// ============================================
// 4️⃣ BORNES DE PLAUSIBILITÉ (garde-fous hors domaine)
// ============================================
// Tout input OU output hors de ces bornes → flag "hors domaine de validation".
// Bornes larges = union des plages publiées + marge physiologique.

export interface PlausibilityBound {
  metric: string;
  min: number;
  max: number;
  unit: string;
  rationale: string;
}

export const PLAUSIBILITY_BOUNDS: PlausibilityBound[] = [
  {
    metric: 'run_vlamax',
    min: 0.20,
    max: 0.65,
    unit: 'mmol/L/s',
    rationale: 'Course sub-élite/fond : 0.39 ± 0.09 (Medicina 2021). >0.65 = profil sprint atypique.',
  },
  {
    metric: 'bike_vlamax',
    min: 0.25,
    max: 0.90,
    unit: 'mmol/L/s',
    rationale: 'Cyclistes : 0.56 ± 0.15 (Poffé 2024). Bornes plus larges (spécialités variées).',
  },
  {
    metric: 'run_vo2max',
    min: 40,
    max: 85,
    unit: 'ml/kg/min',
    rationale: 'Amateur → élite fond. Hors bornes = saisie douteuse ou population non couverte.',
  },
  {
    metric: 'bike_vo2max',
    min: 40,
    max: 85,
    unit: 'ml/kg/min',
    rationale: 'Cyclistes entraînés 59 ± 10 (Poffé 2024).',
  },
  {
    metric: 'run_MLSS_pct_vo2max',
    min: 72,
    max: 92,
    unit: '% VO2max',
    rationale: 'Vrai MLSS coureurs entraînés 83 ± 5 (IJERPH 2018), mean ± ~2 SD. Distinct de LT1 2 mmol/L (~79%).',
  },
  {
    metric: 'bike_MLSS_pct_vo2max',
    min: 65,
    max: 88,
    unit: '% VO2max',
    rationale: 'Poffé 2024 : 76.6 ± 5.8. Bornes = moyenne ± ~2 SD.',
  },
];

// ============================================
// 4️⃣bis AJUSTEMENTS PAR SEXE
// ============================================
// Observation terrain à grande échelle (INSCYD Performance Report 2025,
// N = 9 468 athlètes) : l'utilisation fractionnelle au MLSS est nettement plus
// élevée chez les femmes (~85 % VO₂max) que chez les hommes (~75 %), à VLamax
// plus basse en moyenne. Des bornes unisexes flaggent donc à tort des profils
// féminins parfaitement plausibles.
//
// ⚠️ Statistique DESCRIPTIVE uniquement : sert à élargir/décaler des garde-fous,
// jamais à calibrer les coefficients Mader (anti-circularité).

export type AthleteSex = 'male' | 'female';

/** Bornes remplaçant PLAUSIBILITY_BOUNDS quand le sexe est connu. */
export const SEX_ADJUSTED_BOUNDS: Record<AthleteSex, Partial<Record<string, { min: number; max: number; rationale: string }>>> = {
  female: {
    run_MLSS_pct_vo2max: {
      min: 75,
      max: 95,
      rationale:
        "Profil féminin : utilisation fractionnelle au MLSS plus haute (~85 % vs ~75 % chez l'homme) — bornes décalées vers le haut.",
    },
    bike_MLSS_pct_vo2max: {
      min: 68,
      max: 92,
      rationale:
        "Profil féminin : MLSS/VO₂max plus élevé et VLamax plus basse en moyenne — bornes décalées vers le haut.",
    },
    run_vlamax: {
      min: 0.18,
      max: 0.60,
      rationale: "Profil féminin : VLamax moyenne plus basse — borne inférieure abaissée.",
    },
    bike_vlamax: {
      min: 0.22,
      max: 0.80,
      rationale: "Profil féminin : VLamax moyenne plus basse — bornes décalées vers le bas.",
    },
  },
  male: {},
};

/** Normalise une saisie de sexe libre ('F', 'femme', 'female'…) vers AthleteSex. */
export function normalizeSex(sex: string | null | undefined): AthleteSex | null {
  if (!sex) return null;
  const s = sex.trim().toLowerCase();
  if (['f', 'femme', 'female', 'w', 'woman'].includes(s)) return 'female';
  if (['m', 'h', 'homme', 'male', 'man'].includes(s)) return 'male';
  return null;
}

/** Bornes effectives pour une métrique, ajustées au sexe quand il est connu. */
export function getPlausibilityBound(
  metric: string,
  sex?: string | null,
): PlausibilityBound | null {
  const base = PLAUSIBILITY_BOUNDS.find((b) => b.metric === metric);
  if (!base) return null;
  const s = normalizeSex(sex);
  const override = s ? SEX_ADJUSTED_BOUNDS[s]?.[metric] : undefined;
  if (!override) return base;
  return {
    ...base,
    min: override.min,
    max: override.max,
    rationale: override.rationale,
  };
}

// ============================================
// 5️⃣ HELPERS
// ============================================

/**
 * Retourne le flag de plausibilité pour une métrique donnée, ou null si dans les bornes.
 * `sex` est optionnel : quand il est fourni, les bornes ajustées au sexe s'appliquent.
 */
export function checkPlausibility(
  metric: string,
  value: number,
  sex?: string | null,
): { outOfDomain: boolean; bound: PlausibilityBound; message: string } | null {
  const bound = getPlausibilityBound(metric, sex);
  if (!bound) return null;
  const outOfDomain = value < bound.min || value > bound.max;
  if (!outOfDomain) return null;
  return {
    outOfDomain: true,
    bound,
    message:
      `${metric} = ${value}${bound.unit} hors domaine de validation ` +
      `[${bound.min}–${bound.max}${bound.unit}]. ${bound.rationale}`,
  };
}

/** Cible populationnelle pour comparer une sortie modèle agrégée. */
export function getPopulationTarget(metric: string): PopulationTarget | null {
  return POPULATION_TARGETS.find((t) => t.metric === metric) ?? null;
}

