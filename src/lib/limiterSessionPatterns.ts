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

  // TTE: Sustained threshold endurance — seuil, threshold (bare), tempo, allure spécifique, race pace
  "tte": /seuil|threshold|tempo|allure\s*(?:marathon|semi|course|10k|5k|70\.?3|im\b|ironman|spécifiq|race)|norv[ée]gi|norwegian|mlss|double[\s_-]*threshold|cruise(?:\s*interval)?|race[\s_-]*pace|continu.*z[45]|z[45].*(?:continu|soutenu|bloc)|endurance.*seuil|interval.*seuil|marathon[\s_-]*pace|css/i,

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
