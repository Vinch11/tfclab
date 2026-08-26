/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LIMITER → SESSION PATTERNS
 *
 * Mapping unique clé de limiteur → regex matchant le texte d'une séance
 * (objectif + structure + tags). Consommé par :
 *  - `src/engines/plan/planValidator.ts` (validation limiter coverage)
 *  - `src/lib/workoutCatalogBuilder.ts` (bonus de scoring dans le catalogue IA)
 *
 * ⚠️ Source unique — ne pas dupliquer ce mapping ailleurs.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export const LIMITER_SESSION_PATTERNS: Record<string, RegExp> = {
  // VO2max: High-intensity aerobic intervals — VMA, Billat, PMA, short fractionné
  "vo2max": /vo2|vma|billat|30[\/_ -]?30|interval.*(?:court|rapide)|fractionn|1[01]\d%\s*ftp|pma|z[56]|zone\s*[56]|interval.*(?:z[56]|intense|vo2|vma|haute)|r[ée]p[ée]t|lactate[\s_-]*shuttle/i,

  // VLamax (réduction): Z2 long + train low + endurance fondamentale + SST long (co-contributor)
  "vlamax": /train[\s_-]*low|fasted|[àa]\s*jeun|z2.*(?:long|>?\s*[4-9]\d|>?\s*1[0-9]\d\s*min)|z2[\s_-]*long|ef\b.*(?:long|[4-9]\d|1[0-9]\d\s*min)|endurance.*(?:fondament|longue|foncier)|endurance[\s_-]*long|fondament|glycoly|a[ée]robie\s*(?:pur|fondament|base)|ef\s+z2\s+(?:[4-9]\d|1\d{2})\s*min|heat[\s_-]*acclim|altitude[\s_-]*easy/i,

  // TTE: Sustained threshold endurance — seuil/threshold QUALIFIÉS (continu/long/soutenu/durée
  // ≥20min), jamais bruts : un "seuil 3×5min" est un travail FTP court, pas de la soutenabilité
  // au seuil (TTE). Restaure la contrainte de l'audit AUDIT_LIMITEURS_SEANCES_V1 (FIX 2),
  // perdue lors du refactor de juillet 2026 vers ce fichier partagé.
  "tte": /seuil\s*(?:continu|long|soutenu|[12][×x])|seuil.*(?:[2-5]\d|60)\s*min|threshold\s*(?:continu|long|sustained|steady)|threshold.*(?:[2-5]\d|60)\s*min|tempo\s*(?:long|continu|soutenu)|allure\s*(?:marathon|semi|course|10k|5k|70\.?3|im\b|ironman|spécifiq|race)|norv[ée]gi|norwegian|mlss|double[\s_-]*threshold|cruise(?:\s*interval)?|race[\s_-]*pace|continu.*z[45]|z[45].*(?:continu|soutenu|bloc)|endurance.*seuil|interval.*seuil|marathon[\s_-]*pace|css/i,

  // FatMax: Fat oxidation specific — fat max, lipid, oxydation lipidique, glycogène, gut training
  "fatmax": /fat\s*(?:max|ox)|lipid|oxydation|glycogène|gut[\s_-]*training|nutrition.*course/i,

  // Économie: Neuromuscular economy — côtes, SFR, force, plio, strides, drill, technique
  "économie": /c[ôo]te|sfr|r[øo]nnestad|plio|strides|gammes|drill|cadence|technique|éducatif|low[\s_-]*cadence|force[\s_-]*low[\s_-]*cadence|strength|force|renfo|gainage|core\b|ppg|proprio|muscul|pr[ée]vention|mobilit|hip|hanche|eccentric|excentri|descen|a[ée]ro[\s_-]*hold|bilateral|respir|inspirat/i,

  // FTP: Power at threshold — sweet spot, over-under, FTP intervals
  "ftp": /\bsst\b|sweet[\s_-]*spot|over.?under|race[\s_-]*power|ftp\s*(?:interval|bloc|continu|test)|threshold.*(?:power|puissance)|seuil.*(?:puissance|watts|ftp)|tempo\s*(?:ftp|power)|cp[\s_-]*w[\s_-]*prime|cp.*test/i,

  // Durabilité: Long-distance endurance — sortie longue, long run, brick, simulation, endurance spécifique
  "durabilit": /sortie\s*longue|\bsl\b|long\s*(?:run|ride)|brick|finish.*rapide|durabilité|simulation|course.*longue|back[\s_-]*to[\s_-]*back|progressive|steady[\s_-]*long|endurance\s*(?:im|marathon|semi|spécif|longue)|rolling|neg[\s_-]*split|fartlek/i,

  // Sprint: Sprint/neuromuscular power
  "sprint": /sprint|neuro.*muscul|explo|plyo|force\s*max|vitesse\s*max/i,

  // Pmax: Peak power
  "pmax": /pmax|sprint.*(?:max|all.out)|force\s*max|r[øo]nnestad.*(?:sprint|force)/i,
};

/**
 * Retourne la clé de pattern matchant un libellé de limiteur brut
 * (ex: "VO2max" → "vo2max", "Durabilité" → "durabilit", "Économie de course" → "économie").
 * Retourne `undefined` si aucun pattern connu ne matche.
 */
export function resolveLimiterKey(limiterLabel: string | undefined | null): string | undefined {
  if (!limiterLabel) return undefined;
  const lower = limiterLabel.toLowerCase();
  // Ordre : plus long d'abord pour éviter que "ftp" matche avant "fatmax" etc.
  const keys = Object.keys(LIMITER_SESSION_PATTERNS).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (lower.includes(k)) return k;
  }
  return undefined;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROHIBITION → SESSION PATTERNS
 *
 * Regex matchant les séances à EXCLURE du catalogue quand une prohibition Lorang
 * est active (ex : profil glycolytique haut + longue distance → sprint ban).
 * Consommé par `buildWorkoutCatalog` avant le scoring.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export const PROHIBITION_SESSION_PATTERNS: Record<string, RegExp> = {
  // FIX #4 (audit Cath juillet 2026 — clarification physiologique) :
  //   "Sprint" = effort all-out ≤20s, filière ATP-CP + glycolyse rapide, impact VLamax fort.
  //   "30/30 Billat" et "VMA courte" (30/30, 40/20) = VO2max intermittent à 100-110% VMA/PMA,
  //   filière aérobie → PAS un sprint, doivent rester AUTORISÉS sous Sprint Ban.
  //   Retiré : `vma courte`, `_vma_courte_`, `z6/z7`, `explo` seul (trop large).
  //   Conservé : true sprint markers, pmax, neuromusculaire, pliométrie, all-out, tabata, force max.
  sprints: /sprint|force\s*max|vitesse\s*max|all[\s-]*out|tabata|neuro.*muscul|\bplyo\b|pliom[ée]tri|_sprint_|_pmax_|_nm_|pmax\b/i,
  // FIX #4 : Vrais micro-intervalles supra-max = ≤15s (15/15, 10/20, 10/10).
  //   30/30 et 20/20 = VO2max Billat légitime, NE PLUS bannir.
  micro_intervals: /15[\/_ -]?15|10[\/_ -]?20|10[\/_ -]?10|micro.?interval.*(?:supra|all[- ]out|explosif)/i,
  erratic_pacing: /erratique|non[\s_-]*structur|random[\s_-]*pace|surge.*random/i,
  vo2_heavy_blocks: LIMITER_SESSION_PATTERNS.vo2max,
  train_low: /train[\s_-]*low|fasted|[àa]\s*jeun/i,
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RISQUE BLESSURE → SESSION PATTERNS
 *
 * Regex matchant les séances mécaniquement/tendineusement exigeantes, utilisées
 * pour appliquer un MALUS de score (pas une exclusion dure — contrairement aux
 * prohibitions) quand le risque blessure calculé (injuryRiskUnified.ts) est
 * ÉLEVÉ ou CRITIQUE pour le sport concerné. Consommé par `buildWorkoutCatalog`
 * (scoreWorkout) — jusqu'ici le score de risque n'avait aucun effet sur la
 * sélection des séances, seulement sur son affichage au coach.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export const HIGH_IMPACT_SESSION_PATTERNS: Record<string, RegExp> = {
  // CAP — sortie longue : charge mécanique cumulée (impact articulaire/tendineux).
  run_long: /sortie\s*longue|\bsl\b|long\s*run|long\s*trail|endurance\s*(?:fondament|longue)/i,
  // CAP — fractionné/côtes/VO2max : charge mécanique de haute intensité (impact articulaire).
  run_intensity: /vo2|vma|billat|fractionn|c[ôo]te|hill\s*repeat|30[\/_ -]?30|interval.*(?:court|rapide)|r[ée]p[ée]t/i,
  // Vélo — force basse cadence / gros braquet : charge tendineuse genou/hanche.
  bike_force: /force[\s_-]*low[\s_-]*cadence|basse\s*cadence|big\s*gear|gros\s*braquet|\bsfr\b|r[øo]nnestad/i,
};

/**
 * Détecte les clés de prohibition actives à partir des messages descriptifs
 * produits par `buildProhibitions` (planConfigBuilder). Cherche les mots-clés
 * SPRINT BAN, micro-intervalles, VO2max lourd, train low, etc.
 */
export function resolveProhibitionKeys(prohibitions: string[] | undefined | null): string[] {
  if (!prohibitions || prohibitions.length === 0) return [];
  const active = new Set<string>();
  for (const raw of prohibitions) {
    const text = raw.toLowerCase();
    // Prohibition explicite (🚫) — les messages ✅ autorisent au contraire
    if (!text.includes("🚫") && !text.includes("interdit") && !text.includes("restriction")) continue;
    if (/sprint\s*ban|sprint.*(?:interdit|contre-productif)|neuromuscul|pliom[ée]tri|tabata/i.test(text)) {
      active.add("sprints");
    }
    // FIX #4 : ne PAS activer micro_intervals sur simple mention "micro-intervalles"
    // (Sprint Ban message inclut "micro-intervalles explosifs <20s"). Exiger un
    // marqueur supra-max explicite ou format ≤15s pour ne pas exclure 30/30 VO2max.
    if (/15[\/_ -]?15|10[\/_ -]?20|10[\/_ -]?10|micro.?interval.*(?:supra|all[- ]out|explosif|<\s*20\s*s)|explosif\s*<\s*20\s*s/i.test(text)) {
      active.add("micro_intervals");
    }
    if (/erratique|non[\s_-]*structur/i.test(text)) {
      active.add("erratic_pacing");
    }
    if (/vo2\s*max\s*lourd|restriction\s*vo2|blocs?\s*vo2max\s*longs?/i.test(text)) {
      active.add("vo2_heavy_blocks");
    }
    if (/train[\s_-]*low|fasted|à\s*jeun/i.test(text)) {
      active.add("train_low");
    }
  }
  return Array.from(active);
}

