/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VLAMAX TARGETS — SOURCE UNIQUE (TFCL™)
 *
 * Cible VLamax UNIVERSELLE par distance de course (mmol/L/s).
 * Ancrages : Mader-Heck + INSCYD 2026 (cohortes > 1000 athlètes).
 *
 * PRINCIPE :
 *   - La cible physiologique dépend UNIQUEMENT de la distance (contrainte
 *     métabolique du crossover glucidique). Elle NE dépend PAS de l'ambition.
 *   - C'est l'IMPORTANCE / la priorité du levier VLamax qui varie selon
 *     l'ambition (ex : "Sprint Ban" ignoré pour un finisher). Cette
 *     modulation est gérée ailleurs (lorangStrategyEngine, etc.).
 *
 * DÉRIVATION VÉLO / NATATION :
 *   VLamax_bike ≈ VLamax_run − 0.06 (plancher 0.20).
 *   Natation ≈ vélo (peu discriminant hors sprint).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface VlamaxTargetRange {
  ideal: number;
  min: number;
  max: number;
}

export type VlamaxDiscipline = 'bike' | 'run' | 'swim';

// ── Table canonique COURSE (valeurs universelles par distance) ───────────────
const RUN_TARGETS: Record<string, VlamaxTargetRange> = {
  '5k':       { ideal: 0.50, min: 0.35, max: 0.70 },
  '10k':      { ideal: 0.45, min: 0.35, max: 0.60 },
  'semi':     { ideal: 0.40, min: 0.35, max: 0.48 },
  'marathon': { ideal: 0.34, min: 0.28, max: 0.42 },
  'trail':    { ideal: 0.38, min: 0.30, max: 0.48 },
  '703':      { ideal: 0.36, min: 0.28, max: 0.44 },
  'im':       { ideal: 0.32, min: 0.25, max: 0.40 },
};

const RUN_TO_BIKE_OFFSET = 0.06;
const FLOOR = 0.20;

/**
 * Normalise les alias d'objectifs vers la clé canonique.
 * Accepte : "Semi", "half", "half-marathon", "Ironman", "70.3", "IM 70.3",
 * "5K", "TrailUltra", "TrailMountain", "TrailShort", "cycling", etc.
 */
export function normalizeVlamaxKey(objectif: string | null | undefined): keyof typeof RUN_TARGETS {
  if (!objectif) return '703';
  const raw = String(objectif).toLowerCase().trim();
  const s = raw.replace(/[\s_\-\.]/g, '');

  if (s === '5k' || s === '5km' || s === '5000m') return '5k';
  if (s === '10k' || s === '10km' || s === '10000m') return '10k';
  if (s.includes('semi') || s.includes('half')) return 'semi';
  if (s.includes('marathon') && !s.includes('semi') && !s.includes('half')) {
    // "marathon", "fullmarathon"
    if (s.includes('ironman') || s.includes('im')) return 'im';
    return 'marathon';
  }
  if (s.includes('ultra')) return 'im'; // ultra-trail → très longue durée
  if (s.includes('trail')) return 'trail';
  if (s === '703' || s.includes('703') || s.includes('halfironman') || s.includes('imh') || s === 'ims') return '703';
  if (s.includes('ironman') || s === 'im' || s.includes('fullim')) return 'im';
  if (s === 'cycling' || s === 'bike' || s === 'velo') return '703'; // vélo pur : profil endurance moyenne
  if (s.includes('startto')) return '10k';
  return '703';
}

/**
 * SOURCE UNIQUE : cible VLamax par (objectif, discipline).
 * Cible universelle — NE prend PAS l'ambition en paramètre.
 */
export function getVlamaxTarget(
  objectif: string | null | undefined,
  discipline: VlamaxDiscipline = 'run',
): VlamaxTargetRange {
  const key = normalizeVlamaxKey(objectif);
  const run = RUN_TARGETS[key];

  if (discipline === 'run') return { ...run };

  // bike / swim : offset −0.06, plancher 0.20
  const shift = (v: number) => Math.max(FLOOR, +(v - RUN_TO_BIKE_OFFSET).toFixed(2));
  return {
    ideal: shift(run.ideal),
    min:   shift(run.min),
    max:   shift(run.max),
  };
}
