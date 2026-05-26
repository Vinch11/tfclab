/**
 * Running Economy — Estimateur simplifié + résolveur centralisé.
 *
 * Objectif : permettre de disposer d'une valeur de CE sans exiger ni wattmètre
 * run ni labo, à partir d'entrées simples disponibles dans le snapshot :
 *   - VMA (km/h)                          — obligatoire pour estimer
 *   - Allure seuil 30 min (sec/km)        — optionnelle (affine l'estimation)
 *
 * Modèles utilisés :
 *   1. Léger & Mercier (1984) : CE_ml ≈ 210 − 0.8 × VMA(km/h)
 *   2. Di Prampero (1986)     : CE_ml ≈ 3.86 × v(m/s) + 3.6   (si allure 30')
 *      → moyenne des deux si les deux dispos.
 *
 * Deux unités exposées :
 *   - ml O₂/kg/km  (canonical scientifique — utilisé par runMLSSPredictor)
 *   - score 0-100  (compat. snapshot.run_economy_score — utilisé par UI / Compass)
 *
 * Mapping linéaire score ↔ ml/kg/km :
 *   ml = 230 − score × 0.5      |     score = (230 − ml) × 2
 *   → score 100 ≈ 180 ml/kg/km (élite), score 0 ≈ 230 (très coûteux)
 *
 * Catégories pédagogiques :
 *   score ≥ 70  → Économe   (ml < 195)
 *   40-70       → Standard  (195-210)
 *   < 40        → Coûteux   (> 210)
 *
 * Politique « Missing Data » : pas de fallback silencieux. Si ni mesure ni VMA,
 * la fonction retourne null et l'UI affiche "Données insuffisantes".
 */

export type RunningEconomyCategory = "economic" | "standard" | "costly";
export type RunningEconomySource = "measured" | "estimated_vma" | "estimated_pace" | "blend";

export interface RunningEconomyResolved {
  /** Score 0-100 (plus haut = plus économe). Compatible snapshot.run_economy_score. */
  score: number;
  /** Coût énergétique en ml O₂/kg/km (plus bas = plus économe). */
  mlKgKm: number;
  /** Origine de la valeur. */
  source: RunningEconomySource;
  /** Catégorie pédagogique. */
  category: RunningEconomyCategory;
  /** Libellé court FR. */
  categoryLabel: string;
  /** Marge d'erreur indicative (±, en ml/kg/km). */
  errorMargin: number;
  /** True si la valeur n'est pas mesurée et a été estimée. */
  estimated: boolean;
}

// ---------------------------------------------------------------------------
// Conversions & catégorisation
// ---------------------------------------------------------------------------

export function scoreToMlKgKm(score: number): number {
  return Math.max(170, Math.min(240, 230 - score * 0.5));
}

export function mlKgKmToScore(ml: number): number {
  return Math.max(0, Math.min(100, (230 - ml) * 2));
}

function classify(score: number): { category: RunningEconomyCategory; label: string } {
  if (score >= 70) return { category: "economic", label: "Économe" };
  if (score >= 40) return { category: "standard", label: "Standard" };
  return { category: "costly", label: "Coûteux" };
}

// ---------------------------------------------------------------------------
// Formules simples (corrigées)
// ---------------------------------------------------------------------------

/**
 * Léger & Mercier (1984) — VO2 ≈ 3.5 × VMA(km/h) ml/min/kg.
 * Converti en ml O₂/kg/km, le coût aérobie de base est ~210 ml/kg/km, quasi
 * indépendant de la VMA. On garde une légère pente (−0.4·VMA) reflétant le fait
 * empirique que les coureurs à grosse VMA ont souvent une foulée plus efficace,
 * mais on cap à 195 (jamais "Économe" sans mesure).
 */
function legerCE(vmaKmh: number): number {
  return 210 - 0.4 * (vmaKmh - 16); // ~210 à VMA 16, ~205 à VMA 28
}

/**
 * di Prampero (1986) — coût énergétique en course ≈ 3.86 J/kg/m en plat,
 * soit ~184.7 ml O₂/kg/km (constante, indépendante de la vitesse en plat).
 * On expose une très légère majoration aux allures lentes (inefficacité
 * mécanique sous-optimale) pour différencier joggers vs coureurs entraînés.
 */
function diPramperoCE(pace30SecPerKm: number): number {
  const vMs = 1000 / pace30SecPerKm;
  const baseline = 184.7; // ml O₂/kg/km (3.86 J/kg/m ÷ 20.9 J/mlO₂ × 1000)
  // pénalité allure très lente : +5 ml si <2.5 m/s (~6:40/km), −2 ml si >4.5 m/s (élite)
  const speedAdj = vMs < 2.5 ? 5 : vMs > 4.5 ? -2 : 0;
  return baseline + speedAdj;
}

/**
 * Pénalité VLamax — un VLamax élevé = plus de glycolyse anaérobie sous-seuil
 * = surcoût O₂ réel (~+5 ml/kg/km par 0.10 de VLa au-dessus de 0.40).
 * Surtout critique pour les ex-sprinters reconvertis endurance.
 */
function vlamaxPenalty(vlamaxRun: number | null | undefined): number {
  if (vlamaxRun == null || !isFinite(vlamaxRun) || vlamaxRun <= 0.40) return 0;
  return Math.min(20, (vlamaxRun - 0.40) * 50); // cap +20 ml
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface RunningEconomyInputs {
  /** Score mesuré (0-100) déjà présent sur le snapshot. */
  measuredScore?: number | null;
  /** VMA km/h (pour estimation Léger). */
  vmaKmh?: number | null;
  /** Allure tenue ~30 min sec/km (pour estimation Di Prampero). */
  pace30MinSecPerKm?: number | null;
  /** VLamax run (mmol/L/s) — pénalise CE si élevé (ex-sprinters). */
  vlamaxRun?: number | null;
}

// ---------------------------------------------------------------------------
// Resolver principal
// ---------------------------------------------------------------------------

/**
 * Résolveur unifié : retourne le CE le plus fiable disponible.
 * Hiérarchie : mesuré > blend Léger+Di Prampero > Léger seul > Di Prampero seul > null.
 *
 * IMPORTANT : sans mesure réelle (FIT/labo), le score est capé à 85/100.
 * Un score 100 ne peut venir que d'une mesure terrain/labo (`measured`).
 */
export function resolveRunningEconomy(
  input: RunningEconomyInputs,
): RunningEconomyResolved | null {
  const { measuredScore, vmaKmh, pace30MinSecPerKm, vlamaxRun } = input;

  // 1. Mesure réelle (FIT / labo) — priorité absolue, pas de cap.
  if (measuredScore != null && isFinite(measuredScore) && measuredScore > 0) {
    const ml = scoreToMlKgKm(measuredScore);
    const cls = classify(measuredScore);
    return {
      score: Math.round(measuredScore),
      mlKgKm: Math.round(ml * 10) / 10,
      source: "measured",
      category: cls.category,
      categoryLabel: cls.label,
      errorMargin: 3,
      estimated: false,
    };
  }

  const vmaOk = vmaKmh != null && isFinite(vmaKmh) && vmaKmh > 5 && vmaKmh < 28;
  const paceOk =
    pace30MinSecPerKm != null &&
    isFinite(pace30MinSecPerKm) &&
    pace30MinSecPerKm > 150 &&
    pace30MinSecPerKm < 600;

  if (!vmaOk && !paceOk) return null;

  let ml: number;
  let source: RunningEconomySource;
  let errorMargin: number;

  if (vmaOk && paceOk) {
    ml = (legerCE(vmaKmh!) + diPramperoCE(pace30MinSecPerKm!)) / 2;
    source = "blend";
    errorMargin = 5;
  } else if (vmaOk) {
    ml = legerCE(vmaKmh!);
    source = "estimated_vma";
    errorMargin = 8;
  } else {
    ml = diPramperoCE(pace30MinSecPerKm!);
    source = "estimated_pace";
    errorMargin = 7;
  }

  // Pénalité VLamax (surcoût glycolytique) — appliquée uniquement aux estimations.
  const vlaPenalty = vlamaxPenalty(vlamaxRun);
  ml = ml + vlaPenalty;
  if (vlaPenalty > 0) errorMargin = Math.max(errorMargin, 10);

  ml = Math.max(175, Math.min(240, ml));
  let score = mlKgKmToScore(ml);
  // Cap dur : sans mesure on ne peut pas garantir > 85/100.
  score = Math.min(85, score);
  const cls = classify(score);

  return {
    score: Math.round(score),
    mlKgKm: Math.round(ml * 10) / 10,
    source,
    category: cls.category,
    categoryLabel: cls.label,
    errorMargin,
    estimated: true,
  };
}

/**
 * Helper snapshot — extrait directement les bons champs et délègue.
 * Accepte un snapshot DB ou un snapshot v2.
 */
export function resolveRunningEconomyFromSnapshot(
  snapshot:
    | {
        run_economy_score?: number | null;
        vma?: number | null;
        pace_threshold_sec_per_km?: number | null;
        vlamax_run?: number | null;
        vlamax?: number | null;
      }
    | null
    | undefined,
): RunningEconomyResolved | null {
  if (!snapshot) return null;
  return resolveRunningEconomy({
    measuredScore: snapshot.run_economy_score ?? null,
    vmaKmh: snapshot.vma ?? null,
    pace30MinSecPerKm: snapshot.pace_threshold_sec_per_km ?? null,
    vlamaxRun: snapshot.vlamax_run ?? snapshot.vlamax ?? null,
  });
}

/**
 * Enrichit un snapshot avec une CE estimée si manquante. Préserve la traçabilité
 * via `run_economy_score_source`. Ne modifie pas la valeur si déjà mesurée.
 *
 * Utilisé au chargement (useCloudData) pour que TOUS les consommateurs aient
 * automatiquement une valeur effective sans changer leur code.
 */
export function enrichSnapshotWithRunEconomy<T extends Record<string, any>>(
  snapshot: T,
): T & { run_economy_score_source?: RunningEconomySource } {
  if (snapshot == null) return snapshot;
  // Déjà mesuré → ne rien faire (préserver la donnée raw).
  if (snapshot.run_economy_score != null && snapshot.run_economy_score > 0) {
    return { ...snapshot, run_economy_score_source: "measured" as RunningEconomySource };
  }
  const resolved = resolveRunningEconomy({
    measuredScore: null,
    vmaKmh: snapshot.vma ?? null,
    pace30MinSecPerKm: snapshot.pace_threshold_sec_per_km ?? null,
    vlamaxRun: snapshot.vlamax_run ?? snapshot.vlamax ?? null,
  });
  if (!resolved) return snapshot;
  return {
    ...snapshot,
    run_economy_score: resolved.score,
    run_economy_score_source: resolved.source,
  };
}
