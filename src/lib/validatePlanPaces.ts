/**
 * OPTION A — Correcteur d'allures désactivé, remplacé par un tag d'intention physiologique.
 *
 * Rationale scientifique (Seiler polarisé, Norwegian double-threshold, Skiba W'bal) :
 * l'allure exacte d'une séance n'est pas prescrite par un chiffre figé mais par une
 * intention physiologique (zone). Le chiffre affiché en /km est un repère indicatif
 * — l'exécution réelle dépend fatigue, terrain, météo, RPE et est ajustée par le coach
 * (typiquement dans Nolio) le jour même.
 *
 * Ce module :
 *  1. NE RÉÉCRIT PLUS AUCUNE ALLURE. Les valeurs générées par l'IA sont préservées.
 *  2. Détecte la zone dominante de chaque séance et préfixe le titre avec un tag lisible
 *     `[Zone · intention]` — c'est ce tag qui fait foi, pas l'allure absolue.
 *
 * Zones tagguées (dans l'ordre de priorité) :
 *   VO2 · métrique sport-spécifique (VMA/FTP/CSS)
 *   Race pace · allure course
 *   Marathon · allure marathon
 *   LT2 · seuil
 *   Tempo · Z3
 *   Z2 · endurance métrique sport-spécifique (VMA/FTP/CSS)
 *
 * Les séances de repos et sans marqueur zone ne sont pas modifiées.
 */

import type { ParsedPlan, ParsedSession } from "@/lib/aiPlanParser";
import type { PaceTargets } from "@/lib/deriveRaceTargets";

export interface PaceCalibrationIssue {
  week: number;
  day: string;
  sessionTitle: string;
  paceText: string;
  paceSec: number;
  expectedLabel: string;
  expectedSec: number;
  deviationSec: number;
  composite: boolean;
}

export interface PaceCorrection {
  week: number;
  day: string;
  sessionTitle: string;
  type: string;
  before: string;
  after: string;
}

export interface PaceValidationReport {
  totalPacesFound: number;
  corrections: PaceCorrection[];
  issues: PaceCalibrationIssue[];
  exempted: number;
  summary: string;
}

const PACE_RX = /(\d{1,2})[:'′’](\d{2})\s*\/\s*km/gi;

type Zone = "vo2" | "race" | "marathon" | "seuil" | "z3" | "z2" | "none";
type SportFamily = "run" | "bike" | "swim" | "mixed" | "other";

function detectSportFamily(sport: string, text: string): SportFamily {
  const sportOnly = sport.toLowerCase();
  const sportHasBike = /\b(v[ée]lo|velo|bike|cycl)\b/.test(sportOnly);
  const sportHasRun = /\b(cap|course|run|running)\b/.test(sportOnly);
  const sportHasSwim = /\b(natation|nat|swim)\b/.test(sportOnly);
  const sportCount = [sportHasBike, sportHasRun, sportHasSwim].filter(Boolean).length;
  if (sportCount > 1) return "mixed";
  if (sportHasBike) return "bike";
  if (sportHasSwim) return "swim";
  if (sportHasRun) return "run";

  const s = text.toLowerCase();
  const hasBike = /\b(v[ée]lo|velo|bike|cycl|ftp|pma|watt|watts)\b/.test(s);
  const hasRun = /\b(cap|course|run|running|footing|vma|allure|\/km)\b/.test(s);
  const hasSwim = /\b(natation|nat|swim|css|nage|crawl|\d{3,4}\s*m)\b/.test(s);
  const count = [hasBike, hasRun, hasSwim].filter(Boolean).length;
  if (count > 1) return "mixed";
  if (hasBike) return "bike";
  if (hasSwim) return "swim";
  if (hasRun) return "run";
  return "other";
}

function detectDominantZone(text: string): Zone {
  const c = text.toLowerCase();
  if (/\b(z5|z6|z7|vma|vo2)\b|\d+\s*%\s*vma/.test(c)) return "vo2";
  if (/allure\s*(semi|course|cible|objectif)|race[- ]?pace|juge\s*de\s*paix|\bz4b\b/.test(c)) return "race";
  if (/\bmarathon\b/.test(c)) return "marathon";
  if (/\b(z4a?|seuil)\b|\d+\s*%\s*seuil/.test(c)) return "seuil";
  if (/\bz3\b|tempo/.test(c)) return "z3";
  if (/\bz[12]\b|\bef\b|footing|endurance|r[eé]cup|easy|aisance|long\s*run|sortie\s*longue/.test(c)) return "z2";
  return "none";
}

function zoneTag(zone: Exclude<Zone, "none">, sport: SportFamily): string {
  const tags: Record<SportFamily, Record<Exclude<Zone, "none">, string>> = {
    run: {
      vo2: "[VO2/VMA · 95-100% VMA]",
      race: "[Race pace · allure course]",
      marathon: "[Marathon · allure marathon]",
      seuil: "[LT2 · seuil CAP]",
      z3: "[Tempo · Z3 CAP]",
      z2: "[Z2 · endurance 65-75% VMA]",
    },
    bike: {
      vo2: "[VO2/PMA · puissance haute]",
      race: "[Race power · puissance course]",
      marathon: "[Endurance longue · vélo]",
      seuil: "[LT2 · seuil FTP]",
      z3: "[Tempo · Z3 FTP]",
      z2: "[Z2 · endurance 65-75% FTP]",
    },
    swim: {
      vo2: "[VO2/CSS · vitesse haute]",
      race: "[Race pace · allure natation]",
      marathon: "[Endurance longue · natation]",
      seuil: "[Seuil · CSS]",
      z3: "[Tempo · Z3 CSS]",
      z2: "[Z2 · endurance aérobie CSS]",
    },
    mixed: {
      vo2: "[VO2 · métriques par discipline]",
      race: "[Race pace · spécifique course]",
      marathon: "[Endurance longue · multisport]",
      seuil: "[LT2 · seuil par discipline]",
      z3: "[Tempo · Z3 par discipline]",
      z2: "[Z2 · endurance par discipline]",
    },
    other: {
      vo2: "[VO2 · intensité haute]",
      race: "[Race pace · spécifique course]",
      marathon: "[Endurance longue]",
      seuil: "[LT2 · seuil]",
      z3: "[Tempo · Z3]",
      z2: "[Z2 · endurance]",
    },
  };
  return tags[sport][zone];
}

const TAG_RX = /^\s*\[(VO2(?:\/VMA|\/PMA|\/CSS)?|Race pace|Race power|Marathon|Endurance longue|Seuil|LT2|Tempo|Z2)\b[^\]]*\]\s*/;

function tagSession(s: ParsedSession, isLCW: boolean): boolean {
  if (s.isRest) return false;
  const fullText = `${s.title} ${s.details}`;
  const zone = detectDominantZone(fullText);
  if (zone === "none") return false;
  const family = detectSportFamily(s.sport, fullText);
  // Long Course Weekend : l'épreuve est une course à étapes (Ven nat / Sam vélo /
  // Dim run). Parler d'« allure marathon » ou d'« allure course » générique est
  // trompeur — on nomme l'allure de l'étape LCW.
  let tag: string;
  if (isLCW && (zone === "marathon" || zone === "race")) {
    tag = family === "bike"
      ? "[Race power LCW · étape vélo (samedi)]"
      : family === "swim"
        ? "[Race pace LCW · étape natation (vendredi)]"
        : "[Race pace LCW · étape course (dimanche)]";
  } else {
    tag = zoneTag(zone, family);
  }
  if (TAG_RX.test(s.title)) {
    const nextTitle = s.title.replace(TAG_RX, `${tag} `);
    if (nextTitle === s.title) return false;
    s.title = nextTitle;
    return true;
  }
  s.title = `${tag} ${s.title}`;
  return true;
}

export function validatePlanPaces(
  plan: ParsedPlan,
  _paceTargets: PaceTargets | null,
  _objectifEffectif?: string | null,
  raceFormat?: "continuous" | "lcw_3day" | null,
): PaceValidationReport {
  let total = 0;
  let tagged = 0;
  const isLCW = raceFormat === "lcw_3day";

  for (const week of plan.weeks) {
    for (const s of week.sessions) {
      if (s.isRest) continue;
      total += [...(`${s.title} ${s.details}`).matchAll(PACE_RX)].length;
      if (tagSession(s, isLCW)) tagged++;
    }
  }

  const summary = `Option A active — aucune réécriture d'allure. ${tagged} séance(s) taggée(s) [Zone · intention], ${total} allure(s) indicative(s) préservée(s).`;
  // eslint-disable-next-line no-console
  console.log(`🎯 validatePlanPaces (Option A / zone-tag only) : ${summary}`);

  return {
    totalPacesFound: total,
    corrections: [],
    issues: [],
    exempted: total,
    summary,
  };
}
