/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RAPPEL DYNAMIQUE SIGNATURES LCW — bug réel (audit coach, plan LCW "Vince")
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Un plan LCW généré en plusieurs chunks (7 semaines) est ressorti sans
 * AUCUNE occurrence de B_LCW_BIKE_LONG_RACE_SAT / B_LCW_RUN_OFF_LEGS_SUN /
 * B_LCW_BACK_TO_BACK_PEAK sur l'ensemble du plan, malgré la checklist
 * statique de promptHelpers.ts ("CHECKLIST DE SORTIE LCW — bloquante").
 *
 * Cette checklist est IDENTIQUE à chaque appel de chunk, sans awareness de
 * ce qui a déjà été placé dans les chunks précédents — sur un long plan
 * multi-chunk, aucun chunk individuel ne "se sent responsable" de combler
 * le quota, et le LLM peut la sous-pondérer parmi le reste du prompt.
 *
 * Ce module calcule, à partir de `consumedIdCounts` (mémoire diversité déjà
 * existante, jsonPlanHandler.ts), un rappel EXPLICITE et NUMÉRIQUE
 * ("X/Y placé(s) jusqu'ici") avant chaque chunk suivant — et une urgence
 * maximale sur le DERNIER chunk si le quota n'est toujours pas atteint.
 *
 * Seuils identiques au contrôle existant du chemin markdown legacy
 * (index.ts, ~lignes 1389-1391) et à la checklist de sortie LCW
 * (promptHelpers.ts) : source de vérité partagée, pas une 3e copie qui
 * pourrait diverger.
 */

export const LCW_SIGNATURE_REQUIREMENTS: Array<{ id: string; min: number; label: string }> = [
  { id: "B_LCW_BIKE_LONG_RACE_SAT", min: 3, label: "long ride race-pace samedi (≥1 Build + ≥2 Peak)" },
  { id: "B_LCW_RUN_OFF_LEGS_SUN", min: 3, label: "long run jambes fatiguées dimanche (≥1 Build + ≥2 Peak)" },
  { id: "B_LCW_BACK_TO_BACK_PEAK", min: 1, label: "simulation complète week-end Peak (exactement 1×)" },
];

/**
 * Détecte un objectif LCW à partir d'un `planConfig` (même logique que
 * promptHelpers.ts::isLCW et planWindowRegen.ts::planHasLcwSignature —
 * flag explicite `raceFormat === "lcw_3day"`, fallback regex nom/objectif).
 */
export function detectLcwFromConfig(planConfig: unknown): boolean {
  const cfg = (planConfig ?? {}) as Record<string, unknown>;
  const goals = Array.isArray(cfg.raceGoals) ? (cfg.raceGoals as Array<Record<string, unknown>>) : [];
  const hasFlag = goals.some((g) => g?.raceFormat === "lcw_3day");
  if (hasFlag) return true;
  const names = [
    ...goals.map((g) => String(g?.raceName ?? "")),
    String(cfg.raceName ?? ""),
    String(cfg.objective ?? ""),
  ].filter(Boolean);
  return names.some((n) => /long\s*course\s*weekend|\blcw\b/i.test(n));
}

export interface LcwSignatureReminderInput {
  consumedIdCounts: Map<string, number>;
  /** Index du chunk (0-based) sur le point d'être généré. */
  chunkIndex: number;
  totalChunks: number;
  chunkStartWeek: number;
  chunkEndWeek: number;
}

/**
 * Construit le bloc de rappel à injecter dans le prompt du chunk `chunkIndex`,
 * à partir des compteurs accumulés sur les chunks PRÉCÉDENTS uniquement.
 * Retourne `null` si tous les quotas sont déjà atteints (rien à rappeler).
 */
export function buildLcwSignatureReminder(input: LcwSignatureReminderInput): string | null {
  const { consumedIdCounts, chunkIndex, totalChunks, chunkStartWeek, chunkEndWeek } = input;
  const missing = LCW_SIGNATURE_REQUIREMENTS
    .map((req) => ({ ...req, have: consumedIdCounts.get(req.id) ?? 0 }))
    .filter((req) => req.have < req.min);
  if (missing.length === 0) return null;

  const chunksRemainingAfterThis = totalChunks - chunkIndex - 1;
  const isLastChunk = chunksRemainingAfterThis === 0;
  const lines = [
    `\n🏴 SUIVI SIGNATURES LCW (calculé sur les ${chunkIndex} bloc(s) déjà générés dans CETTE requête) :`,
    ...missing.map((req) =>
      `- ⛔ \`${req.id}\` (${req.label}) : ${req.have}/${req.min} placé(s) jusqu'ici.`
    ),
    isLastChunk
      ? `🚨 DERNIER BLOC de cette génération : si ces quotas ne sont pas atteints APRÈS ce bloc, le plan sera INVALIDE (contrôle qualité bloquant côté app). Priorise ces séances signature dans les semaines ${chunkStartWeek}-${chunkEndWeek} MAINTENANT, quitte à ajuster le reste de la semaine autour.`
      : `Il reste ${chunksRemainingAfterThis} bloc(s) après celui-ci pour combler ce manque — mais commence dès que la phase (Build/Peak) de ce bloc le permet, ne remets pas systématiquement à plus tard.`,
  ];
  return lines.join("\n");
}
