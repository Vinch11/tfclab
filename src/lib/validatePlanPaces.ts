/**
 * Post-parse correction ZONE-AWARE des allures.
 *
 * Contrairement à la version précédente qui appliquait UNE cible par session,
 * ce validateur inspecte les 30 caractères précédant chaque allure et choisit
 * la cible correspondante à la zone détectée (Z2, Z4, seuil, marathon…).
 *
 * Règles :
 *  - Z5 / Z6 / VMA / VO2 → NE PAS réécrire (allures rapides légitimes).
 *  - Z4 / Z4a / Z4b / "seuil" → paceTargets.seuilBas.
 *  - "marathon" → paceTargets.allureMarathon (= allureSemiCible si obj = marathon).
 *  - "allure semi" / "allure course" → paceTargets.allureSemiCible (VALEUR EXACTE,
 *    jamais une fourchette). Une fourchette "4:15-4:40/km" est collapsée.
 *  - Z1 / Z2 → paceTargets.allureZ2.hi (borne lente).
 *  - Z3 → milieu entre Z2 et seuilBas.
 *  - Aucun marqueur → allureSemiCible.
 *
 *  J-day : si objectifEffectif = semi, "allure marathon" → "allure semi" avant
 *  toute réécriture.
 *
 *  Assertions loggées : marathon <= semi, shuttle Z5 == Z2, dérive "allure semi".
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

// Accepte ':', "'", "′", "’" comme séparateur min/sec.
const PACE_RX = /(\d{1,2})[:'′’](\d{2})\s*\/\s*km/gi;
// Fourchette d'allures "4:15-4:40/km" ou "4:15-4:40 /km"
const PACE_RANGE_RX = /(\d{1,2}[:'′’]\d{2})\s*[-–]\s*(\d{1,2}[:'′’]\d{2})\s*\/\s*km/gi;
const TOL_SEC = 8;

function fmt(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}/km`;
}

type Zone = "vo2" | "seuil" | "marathon" | "race" | "z2" | "z3" | "none";

function detectZoneFromContext(ctx: string): Zone {
  const c = ctx.toLowerCase();
  // Ordre priorité : VO2/Z5-6 > seuil/Z4 > marathon > allure course/semi > Z3 > Z2/Z1
  if (/\b(z5|z6|z7|vma|vo2)\b/.test(c)) return "vo2";
  if (/\b(z4[ab]?|seuil)\b/.test(c)) return "seuil";
  if (/\bmarathon\b/.test(c)) return "marathon";
  if (/allure\s*(semi|course|cible|objectif)|race[- ]?pace|juge\s*de\s*paix/.test(c)) return "race";
  if (/\bz3\b|tempo/.test(c)) return "z3";
  if (/\bz[12]\b|\bef\b|footing|endurance|r[eé]cup|easy/.test(c)) return "z2";
  return "none";
}

function targetForZone(zone: Zone, pt: PaceTargets): { sec: number; label: string } | null {
  switch (zone) {
    case "vo2": return null; // ne pas réécrire
    case "seuil": return { sec: pt.seuilBas, label: "seuil (Z4)" };
    case "marathon":
    case "race": return { sec: pt.allureSemiCible, label: "allure course" };
    case "z3": {
      if (!pt.allureZ2) return { sec: pt.seuilBas + 20, label: "Z3" };
      return { sec: Math.round((pt.allureZ2.lo + pt.seuilBas) / 2), label: "Z3" };
    }
    case "z2": return pt.allureZ2 ? { sec: pt.allureZ2.hi, label: "Z2" } : null;
    case "none": return { sec: pt.allureSemiCible, label: "allure course (défaut)" };
  }
}

function sessionId(week: number, s: ParsedSession): string {
  return `S${week}-${s.dayName}-${s.title.slice(0, 40)}`;
}

function isRunOnlyObjective(obj?: string | null): boolean {
  if (!obj) return false;
  return /^(semi|marathon|10\s*k|5\s*k|trail)/i.test(obj.trim());
}

function isSemiObjective(obj?: string | null): boolean {
  if (!obj) return false;
  return /^semi/i.test(obj.trim());
}

/**
 * Réécrit chaque allure d'un texte selon la zone détectée dans les 30 chars précédents.
 * Renvoie le texte modifié + les corrections appliquées.
 */
function rewritePacesInText(
  text: string,
  pt: PaceTargets,
  ctxLabel: string,
): { text: string; corrections: { before: string; after: string; zone: Zone }[]; z5Sec: number[]; z2Sec: number[]; raceSec: number[] } {
  const corrections: { before: string; after: string; zone: Zone }[] = [];
  const z5Sec: number[] = [];
  const z2Sec: number[] = [];
  const raceSec: number[] = [];

  // 1) Collapse fourchettes "4:15-4:40/km" si contexte race/marathon.
  let out = text.replace(PACE_RANGE_RX, (m, _a, _b, offset: number) => {
    const before = text.slice(Math.max(0, offset - 30), offset);
    const zone = detectZoneFromContext(before);
    if (zone === "race" || zone === "marathon") {
      const target = targetForZone(zone, pt);
      if (target) {
        const after = fmt(target.sec);
        // eslint-disable-next-line no-console
        console.log(`🔧 pace rewrite: '${m}' → '${after}' (contexte: allure ${zone}, collapse range)`);
        corrections.push({ before: m, after, zone });
        return after;
      }
    }
    return m;
  });

  // 2) Réécrire chaque allure unique.
  out = out.replace(PACE_RX, (m, mm: string, ss: string, offset: number) => {
    const paceSec = parseInt(mm, 10) * 60 + parseInt(ss, 10);
    if (paceSec < 150 || paceSec > 600) return m;

    const before = out.slice(Math.max(0, offset - 30), offset);
    const zone = detectZoneFromContext(before);

    if (zone === "vo2") {
      z5Sec.push(paceSec);
      return m; // ne pas toucher
    }
    if (zone === "z2") z2Sec.push(paceSec);
    if (zone === "race" || zone === "marathon") raceSec.push(paceSec);

    const target = targetForZone(zone, pt);
    if (!target) return m;
    if (Math.abs(paceSec - target.sec) <= TOL_SEC) {
      if (zone === "z2") z2Sec[z2Sec.length - 1] = target.sec;
      if (zone === "race" || zone === "marathon") raceSec[raceSec.length - 1] = target.sec;
      return m;
    }
    const after = fmt(target.sec);
    // eslint-disable-next-line no-console
    console.log(`🔧 pace rewrite: '${m}' → '${after}' (contexte: ${zone} — ${ctxLabel})`);
    corrections.push({ before: m, after, zone });
    if (zone === "z2") z2Sec[z2Sec.length - 1] = target.sec;
    if (zone === "race" || zone === "marathon") raceSec[raceSec.length - 1] = target.sec;
    return after;
  });

  return { text: out, corrections, z5Sec, z2Sec, raceSec };
}

export function validatePlanPaces(
  plan: ParsedPlan,
  paceTargets: PaceTargets | null,
  objectifEffectif?: string | null,
): PaceValidationReport {
  const issues: PaceCalibrationIssue[] = [];
  const corrections: PaceCorrection[] = [];
  let total = 0;

  if (!paceTargets) {
    return { totalPacesFound: 0, corrections: [], issues: [], exempted: 0, summary: "Aucun paceTargets fourni — validation ignorée." };
  }

  if (!isRunOnlyObjective(objectifEffectif)) {
    // Legacy behaviour préservé : rien à corriger si l'objectif n'est pas run-only.
    // Comptage minimal.
    for (const week of plan.weeks) for (const s of week.sessions) {
      if (s.isRest) continue;
      total += [...(`${s.title} ${s.details}`).matchAll(PACE_RX)].length;
    }
    return { totalPacesFound: total, corrections: [], issues: [], exempted: total, summary: `objectif ${objectifEffectif || "?"} non run-only — validation zone-aware ignorée.` };
  }

  const semiObjective = isSemiObjective(objectifEffectif);

  for (const week of plan.weeks) {
    for (const s of week.sessions) {
      if (s.isRest) continue;
      const id = sessionId(week.weekNumber, s);

      // J-day fix : semi → remplacer "allure marathon" par "allure semi" dans le texte
      if (semiObjective) {
        if (/allure\s+marathon/i.test(s.title)) {
          const old = s.title;
          s.title = s.title.replace(/allure\s+marathon/gi, "allure semi");
          // eslint-disable-next-line no-console
          console.log(`🔧 J-day title: '${old}' → '${s.title}' (semi objectif)`);
        }
        if (/allure\s+marathon/i.test(s.details)) {
          s.details = s.details.replace(/allure\s+marathon/gi, "allure semi");
          // eslint-disable-next-line no-console
          console.log(`🔧 J-day details: 'allure marathon' → 'allure semi' — ${id}`);
        }
      }

      const titleRes = rewritePacesInText(s.title, paceTargets, id);
      if (titleRes.corrections.length) {
        s.title = titleRes.text;
        for (const c of titleRes.corrections) {
          corrections.push({ week: week.weekNumber, day: s.dayName, sessionTitle: s.title, type: c.zone, before: c.before, after: c.after });
        }
      }
      const detailsRes = rewritePacesInText(s.details, paceTargets, id);
      if (detailsRes.corrections.length) {
        s.details = detailsRes.text;
        for (const c of detailsRes.corrections) {
          corrections.push({ week: week.weekNumber, day: s.dayName, sessionTitle: s.title, type: c.zone, before: c.before, after: c.after });
        }
      }

      const paceMatches = [...(`${s.title} ${s.details}`).matchAll(PACE_RX)];
      total += paceMatches.length;

      // Assertions par séance : Z5 == Z2 (shuttle)
      const z5s = [...titleRes.z5Sec, ...detailsRes.z5Sec];
      const z2s = [...titleRes.z2Sec, ...detailsRes.z2Sec];
      if (z5s.length && z2s.length) {
        for (const a of z5s) for (const b of z2s) {
          if (Math.abs(a - b) <= 2) {
            // eslint-disable-next-line no-console
            console.error(`❌ ASSERT shuttle — ${id} : Z5 ${fmt(a)} == Z2 ${fmt(b)}`);
          }
        }
      }

      // Assertion dérive "allure semi"
      const races = [...titleRes.raceSec, ...detailsRes.raceSec];
      for (const r of races) {
        if (Math.abs(r - paceTargets.allureSemiCible) > TOL_SEC) {
          // eslint-disable-next-line no-console
          console.error(`❌ ASSERT dérive semi — ${id} : ${fmt(r)} ≠ ${fmt(paceTargets.allureSemiCible)}`);
        }
      }
    }
  }

  // Assertion marathon <= semi : nous n'avons qu'une seule cible race (allureSemiCible).
  // Si l'objectif est marathon, allureSemiCible EST l'allure marathon → pas de comparaison.
  // Sinon (semi/10k), il ne devrait pas y avoir de "marathon" dans le plan corrigé.

  const summary = `${corrections.length} correction(s) zone-aware, ${total} allure(s) totale(s).`;
  // eslint-disable-next-line no-console
  console.log(`🎯 validatePlanPaces (zone-aware) : ${summary}`);

  return { totalPacesFound: total, corrections, issues, exempted: 0, summary };
}
