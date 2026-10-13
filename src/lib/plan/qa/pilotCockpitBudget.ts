/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Préparation pilote Mode B (consigne coach) — suivi de consommation estimée
 * et vérification AVANT chaque lancement.
 * ═══════════════════════════════════════════════════════════════════════════════
 * IMPORTANT (consigne coach explicite) : cette vérification est une
 * ESTIMATION affichée avant de lancer une génération — jamais une garantie
 * de blocage automatique pendant une génération en cours. Ce dépôt n'a
 * aucune API de solde Lovable en temps réel câblée ; une génération déjà
 * lancée ira jusqu'au bout même si elle dépasse la projection ci-dessous.
 * Ne JAMAIS présenter `checkBudgetBeforeLaunch` comme empêchant une
 * dépense réelle — seulement comme un avertissement avant de cliquer.
 */

export const CREDIT_PER_CHUNK_LOW = 0.15;
export const CREDIT_PER_CHUNK_HIGH = 0.27;

export interface PilotRunRecord {
  profileId: string;
  ts: number;
  /** Chunks de base attendus pour ce profil (hors retries, inconnus à l'avance). */
  chunks: number;
  estimatedCreditsLow: number;
  estimatedCreditsHigh: number;
  /** Usage réel (tokens) si le gateway l'a renvoyé — jamais inventé, cf. useAITrainingPlan.lastGenerationUsage. */
  realTotalTokens?: number;
  realChunksWithUsage?: number;
  realTotalChunksSeen?: number;
  /**
   * Diagnostic coach (échec silencieux B-5K-BEGINNER) — distingue un run où
   * le gateway a confirmé avoir traité au moins un chunk ("measured",
   * `realTotalChunksSeen > 0`) d'un run où AUCUNE confirmation n'est
   * disponible ("fallback_estimate" — `chunks` retombe alors sur
   * `profile.expectedChunks`, cf. usePilotCockpit.ts). "fallback_estimate"
   * NE SIGNIFIE JAMAIS "aucun coût réel" : l'appel au gateway a pu être
   * facturé avant même qu'un usage ne soit renvoyé (échec après l'appel
   * mais avant la réponse, timeout, chunk non comptabilisé...). Champ
   * optionnel (absent sur les runs persistés AVANT ce correctif) — traité
   * comme "fallback_estimate" par `computeCumulative` dans ce cas, jamais
   * comme "measured" par défaut (cf. commentaire sur le fallback ci-dessous).
   */
  usageSource?: "measured" | "fallback_estimate";
}

export interface BudgetState {
  maxCredits: number;
  alertCredits: number;
  runs: PilotRunRecord[];
}

export function defaultBudgetState(): BudgetState {
  return { maxCredits: 10, alertCredits: 8, runs: [] };
}

const STORAGE_KEY = "tfcl:pilotCockpit:budget:v1";

export function readBudgetState(): BudgetState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultBudgetState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.runs)) return defaultBudgetState();
    return {
      maxCredits: typeof parsed.maxCredits === "number" ? parsed.maxCredits : 10,
      alertCredits: typeof parsed.alertCredits === "number" ? parsed.alertCredits : 8,
      runs: parsed.runs,
    };
  } catch {
    return defaultBudgetState();
  }
}

export function writeBudgetState(state: BudgetState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota dépassé ou localStorage indisponible — perte silencieuse acceptable (affichage redevient "0 run" au prochain chargement) */
  }
}

export function appendRun(run: PilotRunRecord): BudgetState {
  const state = readBudgetState();
  const next: BudgetState = { ...state, runs: [...state.runs, run] };
  writeBudgetState(next);
  return next;
}

export function resetBudgetState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export interface CumulativeUsage {
  /** Total TOUJOURS conservateur (mesuré + estimé de secours) — c'est CELUI
   *  utilisé par `checkBudgetBeforeLaunch` pour la vérification de plafond :
   *  ne jamais le réduire aux seuls runs "measured" sous peine de sous-estimer
   *  un coût réel non confirmé (consigne coach explicite). */
  low: number;
  high: number;
  runsCount: number;
  realTotalTokens: number;
  hasRealUsage: boolean;
  /** Nombre de runs dont le coût est CONFIRMÉ par au moins un chunk avec usage renvoyé par le gateway. */
  measuredRunsCount: number;
  /**
   * Nombre de runs SANS confirmation de coût réel — jamais à lire comme
   * "ces runs n'ont rien coûté" : `fallbackLow`/`fallbackHigh` ci-dessous
   * restent inclus dans `low`/`high`, l'estimation de secours assumant le
   * coût plein (`profile.expectedChunks`) plutôt que zéro.
   */
  fallbackRunsCount: number;
  /** Part de `low`/`high` qui n'est PAS confirmée par un usage réel (sous-ensemble de low/high, pour affichage — jamais à soustraire du total). */
  fallbackLow: number;
  fallbackHigh: number;
}

export function computeCumulative(runs: PilotRunRecord[]): CumulativeUsage {
  return runs.reduce<CumulativeUsage>(
    (acc, r) => {
      // Rétro-compat : un run persisté AVANT ce correctif n'a pas
      // `usageSource` — déduit depuis `realTotalChunksSeen` (même logique
      // que celle qui posait `usageSource` au moment de l'écrire), jamais
      // traité comme "measured" par défaut (cf. docstring PilotRunRecord).
      const isMeasured = r.usageSource
        ? r.usageSource === "measured"
        : typeof r.realTotalChunksSeen === "number" && r.realTotalChunksSeen > 0;
      return {
        low: acc.low + r.estimatedCreditsLow,
        high: acc.high + r.estimatedCreditsHigh,
        runsCount: acc.runsCount + 1,
        realTotalTokens: acc.realTotalTokens + (r.realTotalTokens ?? 0),
        hasRealUsage: acc.hasRealUsage || typeof r.realTotalTokens === "number",
        measuredRunsCount: acc.measuredRunsCount + (isMeasured ? 1 : 0),
        fallbackRunsCount: acc.fallbackRunsCount + (isMeasured ? 0 : 1),
        fallbackLow: acc.fallbackLow + (isMeasured ? 0 : r.estimatedCreditsLow),
        fallbackHigh: acc.fallbackHigh + (isMeasured ? 0 : r.estimatedCreditsHigh),
      };
    },
    {
      low: 0, high: 0, runsCount: 0, realTotalTokens: 0, hasRealUsage: false,
      measuredRunsCount: 0, fallbackRunsCount: 0, fallbackLow: 0, fallbackHigh: 0,
    },
  );
}

export type BudgetCheckLevel = "ok" | "warning" | "over";

export interface BudgetCheckResult {
  level: BudgetCheckLevel;
  projectedLow: number;
  projectedHigh: number;
  message: string;
}

/**
 * Vérification AVANT lancement — ESTIMATION, pas une garantie (cf.
 * docstring du module). `chunks` = chunks de BASE attendus pour le profil
 * (`expectedChunks`), sans les retries éventuels (inconnus avant exécution).
 */
export function checkBudgetBeforeLaunch(state: BudgetState, chunks: number): BudgetCheckResult {
  const cumulative = computeCumulative(state.runs);
  const projectedLow = cumulative.low + chunks * CREDIT_PER_CHUNK_LOW;
  const projectedHigh = cumulative.high + chunks * CREDIT_PER_CHUNK_HIGH;
  if (projectedHigh > state.maxCredits) {
    return {
      level: "over",
      projectedLow,
      projectedHigh,
      message: `Ce lancement pourrait dépasser le budget maximal de ${state.maxCredits} crédits (projection haute : ${projectedHigh.toFixed(2)}). Vérification estimée, pas un blocage automatique garanti.`,
    };
  }
  if (projectedHigh > state.alertCredits) {
    return {
      level: "warning",
      projectedLow,
      projectedHigh,
      message: `Ce lancement franchirait le seuil d'alerte de ${state.alertCredits} crédits (projection : ${projectedLow.toFixed(2)} à ${projectedHigh.toFixed(2)}). Vérification estimée, pas un blocage automatique garanti.`,
    };
  }
  return {
    level: "ok",
    projectedLow,
    projectedHigh,
    message: `Projection : ${projectedLow.toFixed(2)} à ${projectedHigh.toFixed(2)} crédits cumulés (sous le seuil d'alerte de ${state.alertCredits}).`,
  };
}
