/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 2A.1 — Squelette jour-par-jour déterministe (le code assigne, le modèle
 * remplit). Consommé par le prompt et par la validation post-merge (layout_drift).
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Fonction pure : (quota, floors, weekType) → 7 jours × 0-2 slots typés.
 *
 * Règles principales :
 *  - Lundi = jour de repos par défaut (si minFullRestDays ≥ 1).
 *  - Sortie longue vélo → samedi ; sortie longue CAP → dimanche.
 *  - Brick, si requis, placé weekend (Sam ou Dim selon SL présentes).
 *  - Le reste est réparti en round-robin Mar/Mer/Jeu/Ven, avec doublons
 *    autorisés (natation le matin + autre sport) si maxSessionsPerDay ≥ 2.
 *  - Renfo jamais la veille de la SL vélo (donc jamais vendredi).
 *  - Deux séances "qualité" du même sport pas à moins de 48h.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { SizingFloors, WeekType, WeeklyQuota } from "./sessionSizingMatrix";

export type LayoutSport = "swim" | "bike" | "run" | "brick" | "strength";
export type DayName = "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi" | "dimanche";

export interface DaySlot {
  sport: LayoutSport;
  isLongSession?: boolean;
  isKeySession?: boolean;
  /**
   * Créneau "activation" (taper / semaine de course) : volume minimal,
   * fréquence préservée (Mujika & Padilla 2003 : on coupe le volume, pas la
   * fréquence ni l'intensité).
   */
  isActivation?: boolean;
  /** Durée plancher (min) pour SL, propagée depuis floors. */
  minDurationMin?: number;
  /** Durée plafond indicative (min) — utilisée pour les créneaux activation. */
  maxDurationMin?: number;
}


export interface DayLayout {
  dayName: DayName;
  isRest: boolean;
  slots: DaySlot[];
}

export interface WeeklySlotLayout {
  weekType: WeekType;
  days: DayLayout[]; // 7 entrées, ordre lundi → dimanche
  /** Compte cible par sport pour cette semaine (used for prompt & drift). */
  targetsBySport: Record<LayoutSport, number>;
}

const DAY_ORDER: DayName[] = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

function midpoint(r: { min: number; max: number }): number {
  return Math.round((r.min + r.max) / 2);
}

export interface SlotLayoutOptions {
  /**
   * Sport de l'épreuve décisive (dernière étape en LCW 3 jours).
   * En semaine de course, ce sport est servi EN PREMIER dans le round-robin.
   */
  finalStageSport?: LayoutSport;
  /**
   * Plancher de fréquence course en semaine taper/race (défaut 2).
   * Mettre 0 pour désactiver.
   */
  taperRunFrequencyFloor?: number;
}

/** Construit un layout hebdo déterministe à partir du quota et floors. */
export function buildWeeklySlotLayout(
  quota: WeeklyQuota,
  floors: SizingFloors,
  weekType: WeekType,
  opts: SlotLayoutOptions = {},
): WeeklySlotLayout {

  // Cibles par sport (midpoint clampé) — respecte floors nat / strength.
  const targets: Record<LayoutSport, number> = {
    swim: Math.max(floors.minSwimPerWeek ?? 0, quota.swim.min, midpoint(quota.swim)),
    bike: Math.max(quota.bike.min, midpoint(quota.bike)),
    run: Math.max(quota.run.min, midpoint(quota.run)),
    brick: Math.max(quota.brick.min, midpoint(quota.brick)),
    strength: Math.max(floors.minStrengthPerWeek, quota.strength.min, midpoint(quota.strength)),
  };
  // Clamp aux max
  targets.swim = Math.min(targets.swim, quota.swim.max);
  targets.bike = Math.min(targets.bike, quota.bike.max);
  targets.run = Math.min(targets.run, quota.run.max);
  targets.brick = Math.min(targets.brick, quota.brick.max);
  targets.strength = Math.min(targets.strength, quota.strength.max);

  const days: DayLayout[] = DAY_ORDER.map(d => ({ dayName: d, isRest: false, slots: [] }));
  const findDay = (d: DayName) => days.find(x => x.dayName === d)!;
  const canAdd = (d: DayName): boolean => findDay(d).slots.length < quota.maxSessionsPerDay && !findDay(d).isRest;
  const hasSportOn = (d: DayName, s: LayoutSport) => findDay(d).slots.some(x => x.sport === s);
  const remaining: Record<LayoutSport, number> = { ...targets };

  // 1) Lundi = repos si minFullRestDays ≥ 1
  if (quota.minFullRestDays >= 1) {
    findDay("lundi").isRest = true;
  }

  // PHASE 2A.4 — RÈGLE D'ALTERNANCE BRICK/SL VÉLO :
  //   Si un brick est requis ET longRideWeekly, le brick prend le samedi
  //   AVEC isLongSession=true, minDurationMin = slLongRideMin + 20 (le brick
  //   contient la sortie longue vélo). On NE programme PAS de SL vélo dédiée
  //   cette semaine-là, et la cible bike autonome est décrémentée de 1
  //   (le brick compte comme la sollicitation vélo longue).
  const brickAsSLBike =
    remaining.brick > 0 && !!floors.longRideWeekly && canAdd("samedi");

  if (brickAsSLBike) {
    const slBikeMin = floors.slLongRideMin ?? 0;
    findDay("samedi").slots.push({
      sport: "brick",
      isLongSession: true,
      isKeySession: true,
      minDurationMin: slBikeMin > 0 ? slBikeMin + 20 : undefined,
    });
    remaining.brick--;
    // La 3e sollicitation vélo est le brick — retire 1 bike autonome.
    remaining.bike = Math.max(0, remaining.bike - 1);
  } else if (floors.longRideWeekly && remaining.bike > 0 && canAdd("samedi")) {
    // 2) SL vélo samedi (cas sans brick requis)
    findDay("samedi").slots.push({
      sport: "bike", isLongSession: true, isKeySession: true,
      minDurationMin: floors.slLongRideMin,
    });
    remaining.bike--;
  }
  // 3) SL CAP dimanche
  if (floors.longRunWeekly && remaining.run > 0 && canAdd("dimanche")) {
    findDay("dimanche").slots.push({
      sport: "run", isLongSession: true, isKeySession: true,
      minDurationMin: floors.slLongRunMin,
    });
    remaining.run--;
  }
  // 4) Brick(s) restant(s) — placer weekend, jamais même jour qu'un run,
  //    et JAMAIS même jour qu'un SL vélo dédié (règle 2A.4).
  if (remaining.brick > 0) {
    const brickOptions: DayName[] = ["samedi", "dimanche"];
    const brickDay = brickOptions.find(
      d => canAdd(d) && !hasSportOn(d, "run") && !findDay(d).slots.some(s => s.sport === "bike" && s.isLongSession),
    ) ?? brickOptions.find(d => canAdd(d) && !hasSportOn(d, "run"))
      ?? brickOptions.find(d => canAdd(d));
    if (brickDay) {
      findDay(brickDay).slots.push({ sport: "brick", isKeySession: true });
      remaining.brick--;
    }
  }

  // ─── 4bis) PLANCHER FRÉQUENCE COURSE en semaine taper / course ─────────────
  // Mujika & Padilla 2003 / Bosquet 2007 : lors de l'affûtage on réduit le
  // VOLUME (−40 à −60 %) mais on PRÉSERVE la fréquence et l'intensité.
  // Or, en semaine comprimée, la CAP était servie en dernier dans le
  // round-robin et tombait souvent à 0 créneau → jambes "éteintes" le jour J.
  // On garantit ici un minimum de créneaux course courts (activation).
  const isTaperish = weekType === "taper" || weekType === "race";
  const runFloor = opts.taperRunFrequencyFloor ?? 2;
  if (isTaperish && runFloor > 0) {
    const placedRun = days.reduce((n, d) => n + d.slots.filter(s => s.sport === "run").length, 0);
    const need = runFloor - (placedRun + remaining.run);
    if (need > 0) {
      remaining.run += need;
      targets.run += need;
    }
  }

  // ─── 5) Round-robin de remplissage ────────────────────────────────────────
  // Ordre de service : en semaine de course, le sport de l'épreuve décisive
  // passe EN PREMIER (sinon il est confisqué par les autres disciplines).
  // En taper/race, la CAP passe systématiquement devant le vélo.
  const midweek: DayName[] = ["mardi", "mercredi", "jeudi", "vendredi"];
  const rrSwim: DayName[] = ["mardi", "jeudi", "mercredi", "vendredi", "dimanche"];
  const rrBike: DayName[] = ["mardi", "jeudi", "mercredi", "vendredi"];
  const rrRun: DayName[] = isTaperish
    ? ["mardi", "jeudi", "mercredi", "vendredi", "samedi"]
    : ["mercredi", "vendredi", "mardi", "jeudi", "samedi"];

  const fillSwim = () => {
    for (const d of rrSwim) {
      if (remaining.swim <= 0) break;
      if (!canAdd(d) || hasSportOn(d, "swim")) continue;
      findDay(d).slots.push({ sport: "swim" });
      remaining.swim--;
    }
  };
  // Vélo restant (qualité) — jamais bike autonome le même jour qu'un brick.
  const fillBike = () => {
    for (const d of rrBike) {
      if (remaining.bike <= 0) break;
      if (!canAdd(d) || hasSportOn(d, "bike") || hasSportOn(d, "brick")) continue;
      findDay(d).slots.push({ sport: "bike", isKeySession: !hasSportOn(d, "run") });
      remaining.bike--;
    }
  };
  // CAP restante — RÈGLE 2A.3 : jamais un run autonome le même jour qu'un brick.
  const fillRun = () => {
    for (const d of rrRun) {
      if (remaining.run <= 0) break;
      if (!canAdd(d) || hasSportOn(d, "run") || hasSportOn(d, "brick")) continue;
      findDay(d).slots.push(
        isTaperish
          ? { sport: "run", isActivation: true, minDurationMin: 20, maxDurationMin: 30 }
          : { sport: "run", isKeySession: !hasSportOn(d, "bike") },
      );
      remaining.run--;
    }
  };

  const fillers: Record<"swim" | "bike" | "run", () => void> = {
    swim: fillSwim, bike: fillBike, run: fillRun,
  };
  let order: Array<"swim" | "bike" | "run"> = isTaperish
    ? ["run", "swim", "bike"]
    : ["swim", "bike", "run"];
  const stage = opts.finalStageSport;
  if (weekType === "race" && stage && (stage === "swim" || stage === "bike" || stage === "run")) {
    order = [stage, ...order.filter(s => s !== stage)];
  }
  for (const s of order) fillers[s]();


  // 8) Renfo — jour à ≤1 séance existante, JAMAIS vendredi (veille SL vélo),
  //    jamais sur un jour de brick (redondance charge).
  const rrStrength: DayName[] = ["mercredi", "mardi", "jeudi", "samedi", "dimanche", "lundi"];
  for (const d of rrStrength) {
    if (remaining.strength <= 0) break;
    if (d === "vendredi") continue;
    if (!canAdd(d) || hasSportOn(d, "strength") || hasSportOn(d, "brick")) continue;
    if (findDay(d).slots.length > 1) continue;
    findDay(d).slots.push({ sport: "strength" });
    remaining.strength--;
  }

  return { weekType, days, targetsBySport: targets };
}

const DAY_LABEL: Record<DayName, string> = {
  lundi: "Lun", mardi: "Mar", mercredi: "Mer", jeudi: "Jeu",
  vendredi: "Ven", samedi: "Sam", dimanche: "Dim",
};
const SPORT_LABEL: Record<LayoutSport, string> = {
  swim: "NAT", bike: "VÉLO", run: "CAP", brick: "BRICK", strength: "RENFO",
};

/** Sérialise le layout en ligne compacte pour le prompt. */
export function formatWeeklySlotLayoutLine(weekNumber: number, layout: WeeklySlotLayout): string {
  const parts = layout.days.map(d => {
    if (d.isRest) return `${DAY_LABEL[d.dayName]}: repos`;
    if (d.slots.length === 0) return `${DAY_LABEL[d.dayName]}: libre`;
    const inner = d.slots.map(s => {
      const tags: string[] = [SPORT_LABEL[s.sport]];
      if (s.isLongSession) tags.push(`SL ≥${s.minDurationMin ?? "?"}min`);
      else if (s.isKeySession) tags.push("(qualité)");
      return tags.join(" ");
    }).join(" + ");
    return `${DAY_LABEL[d.dayName]}: ${inner}`;
  });
  return `Semaine ${weekNumber} (${layout.weekType}) — structure IMPOSÉE : ${parts.join(" · ")}`;
}

/**
 * Construit le bloc LAYOUT complet pour un chunk (plusieurs semaines).
 * Formule d'injection : contrainte non-négociable dans le userPrompt.
 */
export function buildLayoutPromptBlock(
  weeksScope: number[],
  layoutsByWeek: Record<number, WeeklySlotLayout>,
): string {
  const lines: string[] = [];
  lines.push("📅 SQUELETTE JOUR (IMPOSÉ par le moteur — remplis chaque créneau avec une séance du catalogue du bon sport ; ne déplace, n'ajoute et ne retire AUCUN créneau) :");
  for (const w of weeksScope) {
    const l = layoutsByWeek[w];
    if (!l) continue;
    lines.push(formatWeeklySlotLayoutLine(w, l));
  }
  return lines.join("\n");
}

/**
 * Compare le layout attendu aux séances réellement générées sur la semaine.
 * Retourne les jours où le sport dominant diverge du slot attendu.
 * v1 : sportif seulement (on ne vérifie pas isLongSession ni durée ici — les
 * floors s'en chargent). Warning "layout_drift".
 */
export function diffLayoutVsWeek(
  layout: WeeklySlotLayout,
  observedByDay: Map<string, string[]>,
): Array<{ dayName: DayName; expected: string; observed: string }> {
  const drifts: Array<{ dayName: DayName; expected: string; observed: string }> = [];
  for (const d of layout.days) {
    // PHASE 2A.2 fix 1 — jour "libre" (slots vides, non-repos) : le modèle est
    // libre d'ajouter ou non une séance → pas de drift possible.
    if (!d.isRest && d.slots.length === 0) continue;
    const expected = d.isRest ? ["rest"] : d.slots.map(s => s.sport).sort();
    // Normalisation casse (Mardi / mardi) + accents inutile ici (ASCII).
    const raw = observedByDay.get(d.dayName)
      ?? observedByDay.get(d.dayName.toLocaleLowerCase("fr-FR"))
      ?? [];
    const observed = raw.length === 0 ? ["rest"] : [...raw].sort();
    // Comparaison ensembliste multi-slot (autoriser ordre différent)
    const sameSize = expected.length === observed.length;
    const sameSet = sameSize && expected.every((s, i) => s === observed[i]);
    if (!sameSet) {
      drifts.push({
        dayName: d.dayName,
        expected: expected.join("+"),
        observed: observed.join("+"),
      });
    }
  }
  return drifts;
}
