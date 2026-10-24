/** Shared event identity for client validation and server repairs. No runtime dependencies. */
export const RACE_DAY_PATTERNS = /🏁|jour\s*j|course\s*objectif|race\s*day|compétition|épreuve\s*(objectif|cible)|jour\s*de\s*(course|compétition)/i;
// Bug réel (audit "plan multi-objectifs Sables d'Olonne") : un vrai plan
// généré a omis le Jour J final et l'a remplacé par "Activation
// Neuromusculaire & Mobilité Race Day" — RACE_DAY_PATTERNS matche "Race Day"
// dans ce titre (simple mention descriptive d'un rituel de PRÉ-course), donc
// `weekHasRaceDay` renvoyait `true` à tort : le validateur lui-même aurait
// laissé passer ce plan sans avertissement. `🏁`/"course objectif"/"jour de
// course" restent des marqueurs FORTS (jamais utilisés pour un rituel de
// préparation), mais "jour j"/"race day"/"compétition"/"épreuve (objectif|
// cible)" sont des marqueurs FAIBLES qu'un titre d'activation/mobilité/
// shakeout peut légitimement contenir sans être la course elle-même.
const RACE_DAY_STRONG_PATTERNS = /🏁|course\s*objectif|jour\s*de\s*(course|compétition)/i;
export const PRE_RACE_ACTIVATION_PATTERNS = /activation|pr[ée]paration|mobilit[ée]|shakeout|ouverture|primers?|pre-?race|d[ée]blocage|opener|veille|flush|\bj-\d/i;

// Format prescrit par le prompt multi-objectifs et observé dans le PDF 703.
// Ancré au TITRE : « simulation course : … » et les mentions dans les
// consignes d'entraînement ne constituent pas un événement de compétition.
export const NAMED_RACE_TITLE_PATTERN = /^\s*(?:🏁\s*)?COURSE\s*:\s*\S/i;

/** Vrai si CETTE séance est un jour de course réel (pas juste une séance qui
 *  mentionne accessoirement l'objectif, ni un rituel de préparation qui
 *  mentionne accessoirement "race day"/"jour j") — cf. RACE_DAY_PATTERNS
 *  ci-dessus. Extrait de `weekHasRaceDay` (correction ciblée "P0 génération
 *  invalide", 2026-10-24) : `computePlan.ts` et `planReconciler.ts`
 *  dupliquaient chacun leur propre copie de cette détection, restée sur
 *  l'ancienne version LARGE (sans la distinction fort/faible ni l'exclusion
 *  des rituels de préparation ci-dessus) après ce correctif — un plan
 *  pouvait donc être jugé "Jour J déjà présent" par ces deux fichiers (qui
 *  renoncent alors à fabriquer le vrai Jour J) alors que le validateur,
 *  lui, détecte correctement son absence. Primitive AU NIVEAU SÉANCE
 *  exportée pour que ces deux appelants (qui filtrent des séances
 *  individuelles, pas des semaines entières) puissent réutiliser EXACTEMENT
 *  la même règle plutôt que de la redupliquer une 3e fois. */
export function isRaceDaySession(s: { title?: string; details?: string; sport?: string }): boolean {
  if (NAMED_RACE_TITLE_PATTERN.test(s.title || "")) return true;
  const text = `${s.title || ""} ${s.details || ""} ${s.sport || ""}`;
  if (RACE_DAY_STRONG_PATTERNS.test(text)) return true;
  return RACE_DAY_PATTERNS.test(text) && !PRE_RACE_ACTIVATION_PATTERNS.test(text);
}


/** Explicit event title, independent of training instructions referencing a race.
 * A simulation/activation stays training even if it mentions Jour J or 🏁. */
export function isRaceEventTitle(s: { title?: string }): boolean {
  const title = s.title ?? "";
  if (/simulation|race[\s_-]*sim|dress rehearsal|allure\s+(?:de\s+)?(?:course|comp[ée]tition)/i.test(title)) return false;
  if (PRE_RACE_ACTIVATION_PATTERNS.test(title)) return false;
  return isRaceDaySession({ title });
}
