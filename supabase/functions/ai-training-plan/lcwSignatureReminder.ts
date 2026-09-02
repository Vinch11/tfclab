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

/**
 * Taille de chunk à utiliser pour une génération LCW complète fraîche.
 *
 * Le rétrécissement (3 semaines au lieu du standard triathlon 5) n'est
 * nécessaire QUE si la fenêtre Build+Peak (seule fenêtre où les séances
 * signature ont un sens physiologique) tiendrait entièrement dans un seul
 * chunk de taille standard — auquel cas le rappel dynamique n'a aucun
 * checkpoint intermédiaire pour agir (bug réel, plan "Vince" 7 semaines).
 *
 * Sur un plan LONG, Build+Peak occupe une fenêtre bien plus large que le
 * chunk standard et se retrouve déjà naturellement répartie sur plusieurs
 * chunks — rétrécir systématiquement multiplierait les appels LLM (latence,
 * coût, moins de continuité par appel) sans aucun bénéfice.
 */
/**
 * Nombre minimal de semaines Build/Peak requises dans le DERNIER chunk qui
 * en contient, pour que ce chunk serve de "dernière chance" utilisable.
 * Justification physique, pas arbitraire : le quota LCW exige au moins
 * 2 week-ends Peak DISTINCTS — un chunk final avec une seule semaine
 * Build/Peak ne peut physiquement pas accueillir 2 week-ends séparés.
 */
const MIN_BUILD_PEAK_WEEKS_IN_TAIL_CHUNK = 2;

export function computeLcwChunkSize(
  totalWeeks: number,
  standardChunkSize: number,
  inferPhase: (week: number, totalWeeks: number) => string,
): number {
  const buildOrPeakWeeks: number[] = [];
  for (let w = 1; w <= totalWeeks; w++) {
    const phase = inferPhase(w, totalWeeks);
    if (phase === "build" || phase === "peak") buildOrPeakWeeks.push(w);
  }
  if (buildOrPeakWeeks.length === 0) return standardChunkSize;

  const bpStart = buildOrPeakWeeks[0];
  const bpEnd = buildOrPeakWeeks[buildOrPeakWeeks.length - 1];

  // Le DERNIER chunk (taille standard) touchant encore Build/Peak : c'est le
  // seul qui compte pour juger si le découpage standard suffit — peu importe
  // que des chunks antérieurs (plus longs, plan long) aient déjà offert de
  // bons checkpoints, si celui-ci est trop étroit pour caser encore 2
  // semaines Build/Peak distinctes, la génération peut buter dessus (bug
  // confirmé sur le plan "Vince", 7 semaines : dernier chunk touché = 1 seule
  // semaine Build/Peak, insuffisant pour 2 week-ends Peak).
  const lastTouchedChunkStart = Math.floor((bpEnd - 1) / standardChunkSize) * standardChunkSize + 1;
  const lastTouchedChunkEnd = Math.min(lastTouchedChunkStart + standardChunkSize - 1, totalWeeks);
  const buildPeakWeeksInLastChunk = buildOrPeakWeeks.filter(
    (w) => w >= lastTouchedChunkStart && w <= lastTouchedChunkEnd,
  ).length;

  if (buildPeakWeeksInLastChunk >= MIN_BUILD_PEAK_WEEKS_IN_TAIL_CHUNK) {
    return standardChunkSize;
  }

  // Chunk final insuffisant : réduit juste assez pour forcer un découpage
  // (fenêtre Build+Peak plus longue que le chunk réduit ⇒ ne peut plus tenir
  // dans un seul chunk, quel que soit l'alignement).
  const bpWindowLength = bpEnd - bpStart + 1;
  if (bpWindowLength < 2) return standardChunkSize; // fenêtre atomique, rien à répartir.
  return Math.max(1, Math.min(standardChunkSize - 1, bpWindowLength - 1));
}

export interface LcwSignatureReminderInput {
  consumedIdCounts: Map<string, number>;
  /** Index du chunk (0-based) sur le point d'être généré. */
  chunkIndex: number;
  totalChunks: number;
  chunkStartWeek: number;
  chunkEndWeek: number;
  /**
   * true si AUCUNE semaine après ce chunk n'est plus en phase Build/Peak
   * (donc ce chunk est la DERNIÈRE occasion physiologiquement pertinente de
   * placer ces séances signature — pas nécessairement le dernier chunk de la
   * génération : sur un plan LCW court, un chunk final couvrant uniquement
   * l'affûtage/la semaine de course peut suivre un chunk Peak encore éligible).
   * Calculé par l'appelant via `inferPhaseFromWeek`, seule source de vérité
   * des limites de phase dans ce fichier.
   */
  isLastBuildOrPeakChunk: boolean;
}

/**
 * Construit le bloc de rappel à injecter dans le prompt du chunk `chunkIndex`,
 * à partir des compteurs accumulés sur les chunks PRÉCÉDENTS uniquement.
 * Retourne `null` si tous les quotas sont déjà atteints (rien à rappeler).
 */
export function buildLcwSignatureReminder(input: LcwSignatureReminderInput): string | null {
  const { consumedIdCounts, chunkIndex, totalChunks, chunkStartWeek, chunkEndWeek, isLastBuildOrPeakChunk } = input;
  const missing = LCW_SIGNATURE_REQUIREMENTS
    .map((req) => ({ ...req, have: consumedIdCounts.get(req.id) ?? 0 }))
    .filter((req) => req.have < req.min);
  if (missing.length === 0) return null;

  const chunksRemainingAfterThis = totalChunks - chunkIndex - 1;
  const lines = [
    `\n🏴 SUIVI SIGNATURES LCW (calculé sur les ${chunkIndex} bloc(s) déjà générés dans CETTE requête) :`,
    ...missing.map((req) =>
      `- ⛔ \`${req.id}\` (${req.label}) : ${req.have}/${req.min} placé(s) jusqu'ici.`
    ),
    isLastBuildOrPeakChunk
      ? `🚨 DERNIER BLOC Build/Peak de cette génération (les blocs suivants, s'il y en a, sont affûtage/course — trop tard pour ces séances) : si ces quotas ne sont pas atteints APRÈS ce bloc, le plan sera INVALIDE (contrôle qualité bloquant côté app). Priorise ces séances signature dans les semaines ${chunkStartWeek}-${chunkEndWeek} MAINTENANT, quitte à ajuster le reste de la semaine autour.`
      : `Il reste ${chunksRemainingAfterThis} bloc(s) après celui-ci pour combler ce manque — mais commence dès que la phase (Build/Peak) de ce bloc le permet, ne remets pas systématiquement à plus tard.`,
  ];
  return lines.join("\n");
}
