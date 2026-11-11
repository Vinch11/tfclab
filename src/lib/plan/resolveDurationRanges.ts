/**
 * Étape 1 du plan « séances précises » : une séance livrée au coach ne contient
 * plus de tranche de durée (« 20–70 min Z2 »). Chaque tranche est remplacée par
 * une valeur unique, de sorte que la durée affichée, la durée comptée dans le
 * volume (durationMin) et le texte envoyé à Nolio soient identiques.
 *
 * Règle déterministe (aucune IA) :
 *  - échauffement / retour au calme chiffrés sont considérés fixes ;
 *  - le corps de séance vise durationMin − fixes, borné dans la tranche ;
 *  - sans durationMin exploitable, position dans la tranche selon la phase
 *    (base 60 %, build 70 %, peak 50 %, taper/récup 20 %) ;
 *  - arrondi à 5 min, toujours dans la tranche.
 */
export const DURATION_RANGE_RX = /(\d{1,3})\s*(?:–|—|-|à)\s*(\d{1,3})\s*(?:min\b|'|′)/gi;
const FIXED_SEG_RX = /(warm-?up|échauffement|cool-?down|retour au calme)\s*:\s*(\d{1,3})\s*(?:min\b|'|′)(?!\s*(?:–|—|-|à)\s*\d)/gi;

export interface RangeSessionLike {
  details: string;
  durationMin: number;
  phase?: string;
  isRest?: boolean;
  sport?: string;
}

function phaseFraction(phase: string | undefined): number {
  const p = (phase ?? "").toLowerCase();
  if (/taper|affût|recov|récup|deload|décharge/.test(p)) return 0.2;
  if (/peak|pic|spécif/.test(p)) return 0.5;
  if (/build|dével|charge/.test(p)) return 0.7;
  return 0.6;
}

function round5Within(v: number, lo: number, hi: number): number {
  let r = Math.round(v / 5) * 5;
  if (r < lo) r = Math.ceil(lo / 5) * 5;
  if (r > hi) r = Math.floor(hi / 5) * 5;
  if (r < lo || r > hi) r = Math.round(Math.min(hi, Math.max(lo, v)));
  return r;
}

export function hasDurationRange(text: string | undefined | null): boolean {
  DURATION_RANGE_RX.lastIndex = 0;
  const found = DURATION_RANGE_RX.test(text ?? "");
  DURATION_RANGE_RX.lastIndex = 0;
  return found;
}

/** Résout les tranches d'une séance. Retourne null si rien à changer. */
export function resolveSessionDurationRanges(s: RangeSessionLike): { details: string; durationMin: number } | null {
  if (s.isRest || s.sport === "rest" || !s.details) return null;
  const ranges = [...s.details.matchAll(DURATION_RANGE_RX)]
    .map(m => ({ text: m[0], lo: Math.min(+m[1], +m[2]), hi: Math.max(+m[1], +m[2]) }))
    .filter(r => r.hi > 0);
  if (ranges.length === 0) return null;

  let fixed = 0;
  for (const m of s.details.matchAll(FIXED_SEG_RX)) fixed += +m[2];
  const sumLo = ranges.reduce((a, r) => a + r.lo, 0);
  const sumHi = ranges.reduce((a, r) => a + r.hi, 0);
  const target = s.durationMin > 0 ? s.durationMin - fixed : NaN;
  const frac = Number.isFinite(target) && sumHi > sumLo
    ? Math.min(1, Math.max(0, (target - sumLo) / (sumHi - sumLo)))
    : Number.isFinite(target) ? 0.5 : phaseFraction(s.phase);

  let details = s.details;
  let chosenSum = 0;
  for (const r of ranges) {
    const v = round5Within(r.lo + frac * (r.hi - r.lo), r.lo, r.hi);
    chosenSum += v;
    const unit = /'|′$/.test(r.text) ? "'" : " min";
    details = details.replace(r.text, `${v}${unit}`);
  }
  // Le volume compté suit le texte quand la séance n'a pas d'autre durée chiffrée
  // qui pourrait expliquer l'écart (sinon on garde la durée prescrite).
  let durationMin = s.durationMin;
  const computed = fixed + chosenSum;
  if (!(durationMin > 0) || (Math.abs(computed - durationMin) > 5 && !Number.isFinite(target))) durationMin = computed;
  else if (Math.abs(computed - durationMin) > 5 && (target < sumLo || target > sumHi)) durationMin = computed;
  return { details, durationMin };
}

export interface RangePlanLike { weeks: Array<{ weekNumber: number; phase?: string; sessions: Array<RangeSessionLike & { title?: string }> }> }

/** Mutation en place ; retourne le nombre de séances corrigées. */
export function resolvePlanDurationRanges(plan: RangePlanLike): number {
  let n = 0;
  for (const w of plan.weeks) for (const s of w.sessions) {
    const r = resolveSessionDurationRanges({ ...s, phase: s.phase ?? w.phase });
    if (!r) continue;
    s.details = r.details;
    s.durationMin = r.durationMin;
    n++;
  }
  return n;
}

/** Contrôle final : tranches restantes (avertissement, jamais bloquant). */
export function checkRemainingDurationRanges(plan: { weeks: Array<{ weekNumber: number; sessions: Array<{ details?: string; isRest?: boolean; sport?: string; title?: string }> }> }) {
  return plan.weeks.flatMap(w => w.sessions.flatMap((s, i) =>
    !s.isRest && s.sport !== "rest" && hasDurationRange(s.details)
      ? [{ rule: "duration_range_unresolved", severity: "warning" as const,
          message: `S${w.weekNumber} séance ${i + 1}${s.title ? ` « ${s.title} »` : ""} : durée encore exprimée en tranche — précisez une valeur unique.` }]
      : []));
}
