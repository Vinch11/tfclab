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
 *   VMA/VO2 · 95-100% VMA
 *   Race pace · allure course
 *   Marathon · allure marathon
 *   LT2 · seuil
 *   Tempo · Z3
 *   Z2 · endurance 65-75% VMA
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

const ZONE_TAG: Record<Exclude<Zone, "none">, string> = {
  vo2: "[VO2/VMA · 95-100% VMA]",
  race: "[Race pace · allure course]",
  marathon: "[Marathon · allure marathon]",
  seuil: "[LT2 · seuil]",
  z3: "[Tempo · Z3]",
  z2: "[Z2 · endurance 65-75% VMA]",
};

const TAG_RX = /^\s*\[(VO2\/VMA|Race pace|Marathon|LT2|Tempo|Z2)\b[^\]]*\]\s*/;

function tagSession(s: ParsedSession): boolean {
  if (s.isRest) return false;
  if (TAG_RX.test(s.title)) return false; // déjà taggée
  const zone = detectDominantZone(`${s.title} ${s.details}`);
  if (zone === "none") return false;
  s.title = `${ZONE_TAG[zone]} ${s.title}`;
  return true;
}

export function validatePlanPaces(
  plan: ParsedPlan,
  _paceTargets: PaceTargets | null,
  _objectifEffectif?: string | null,
): PaceValidationReport {
  let total = 0;
  let tagged = 0;

  for (const week of plan.weeks) {
    for (const s of week.sessions) {
      if (s.isRest) continue;
      total += [...(`${s.title} ${s.details}`).matchAll(PACE_RX)].length;
      if (tagSession(s)) tagged++;
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
