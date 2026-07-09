/**
 * Post-parse validation + correction déterministe des allures.
 *
 * Priorités classification (sur le TITRE d'abord) :
 *  1. Composite (Fartlek / Negative Split / SL avec inserts / Pyramide / Brick / Finish Fast /
 *     Progressif / Hérisson / Billat / 30-30 / Intermittent) → PAS d'allure unique attendue,
 *     exemption loggée "⏭️ composite, non validé".
 *  2. Seuil / Double Seuil → cible seuil_bas (priorité stricte sur EF).
 *  3. VO2/VMA pur → vo2max.
 *  4. Tempo semi / Race pace / Juge de paix / Simulation race / Jour J → race_pace.
 *  5. EF / Footing / Endurance / Z2 pur / Récup / Easy / Z1 → z2.
 *  6. Sinon : composite (exemption loggée).
 *
 * Corrections déterministes : recherche du pattern d'allure dans TITLE puis DETAILS.
 * Si `.split(before).join(after)` ne modifie NI le title NI le details → log MISS obligatoire
 * "🔧 MISS — cherché: [X] — contenu réel: [Y]" avec session ID.
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

// Accepte ':', "'", "′", "’" comme séparateur min/sec (l'IA écrit parfois 4'15/km).
const PACE_RX = /(\d{1,2})[:'′’](\d{2})\s*\/\s*km/gi;
const TOL_SEC = 8;

function fmt(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}/km`;
}

type Target = { label: string; sec: number };

interface Classification {
  simpleType: "z2" | "seuil_bas" | "seuil_haut" | "vo2max" | "race_pace" | null;
  composite: boolean;
  canonical: Target | null;
  reason: string;
}

// Composite : jamais une allure unique attendue.
const COMPOSITE_TITLE_RX =
  /fartlek|negative\s*split|neg\s*split|sl\s*avec\s*inserts|inserts|pyramide|brick|finish\s*fast|progressi(f|ve)|h[eé]risson|billat|30\/30|30-30|intermitt|puma|navette|kenyan/i;
const SEUIL_TITLE_RX = /\b(double\s*seuil|seuil)\b/i;
const RACE_TITLE_RX = /tempo\s*semi|allure\s*semi|race[- ]pace|juge\s*de\s*paix|simulation\s*race|jour\s*j|race\s*day/i;
const VO2_TITLE_RX = /\bvo2\b|\bvma\b/i;
const EF_TITLE_RX = /\bef\b|footing|endurance|\bz2\b|r[eé]cup|easy(?!\s*run)|\bz1\b/i;

function classify(session: ParsedSession, pt: PaceTargets): Classification {
  const title = session.title.toLowerCase();
  const z2Mid = pt.allureZ2 ? Math.round((pt.allureZ2.lo + pt.allureZ2.hi) / 2) : null;
  const targets = {
    z2: z2Mid ? { label: "Z2", sec: z2Mid } : null,
    seuilBas: { label: "Seuil bas", sec: pt.seuilBas },
    seuilHaut: { label: "Seuil haut", sec: pt.seuilHaut },
    vo2: pt.allureVO2max ? { label: "VO2max", sec: pt.allureVO2max } : null,
    race: { label: "Allure course", sec: pt.allureSemiCible },
  };

  // 1. Composite priorité absolue
  if (COMPOSITE_TITLE_RX.test(title)) {
    return { simpleType: null, composite: true, canonical: null, reason: "composite (titre)" };
  }
  // 2. Seuil (incl. Double Seuil) priorité sur EF
  if (SEUIL_TITLE_RX.test(title)) {
    return { simpleType: "seuil_bas", composite: false, canonical: targets.seuilBas, reason: "seuil (titre)" };
  }
  // 3. VO2 / VMA pur
  if (VO2_TITLE_RX.test(title) && targets.vo2) {
    return { simpleType: "vo2max", composite: false, canonical: targets.vo2, reason: "vo2/vma (titre)" };
  }
  // 4. Race pace
  if (RACE_TITLE_RX.test(title)) {
    return { simpleType: "race_pace", composite: false, canonical: targets.race, reason: "race pace (titre)" };
  }
  // 5. EF / Z2
  if (EF_TITLE_RX.test(title) && targets.z2) {
    return { simpleType: "z2", composite: false, canonical: targets.z2, reason: "z2 (titre)" };
  }
  // 6. Fallback : exemption composite
  return { simpleType: null, composite: true, canonical: null, reason: "non-classé → exempté" };
}

function sessionId(week: number, s: ParsedSession): string {
  return `S${week}-${s.dayName}-${s.title.slice(0, 40)}`;
}

export function validatePlanPaces(plan: ParsedPlan, paceTargets: PaceTargets | null): PaceValidationReport {
  const issues: PaceCalibrationIssue[] = [];
  const corrections: PaceCorrection[] = [];
  let total = 0;
  let exempted = 0;

  if (!paceTargets) {
    return { totalPacesFound: 0, corrections: [], issues: [], exempted: 0, summary: "Aucun paceTargets fourni — validation ignorée." };
  }

  for (const week of plan.weeks) {
    for (const s of week.sessions) {
      if (s.isRest) continue;
      const cls = classify(s, paceTargets);
      const id = sessionId(week.weekNumber, s);

      if (cls.composite) {
        // eslint-disable-next-line no-console
        console.log(`⏭️ composite, non validé — ${id} (${cls.reason})`);
        // Compte quand même les allures pour le total
        const text = `${s.title} ${s.details}`;
        const matches = [...text.matchAll(PACE_RX)];
        total += matches.length;
        exempted += matches.length;
        continue;
      }

      if (!cls.canonical) continue;
      const text = `${s.title} ${s.details}`;
      const matches = [...text.matchAll(PACE_RX)];

      for (const m of matches) {
        total++;
        const paceSec = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
        if (paceSec < 150 || paceSec > 600) continue;

        const dev = paceSec - cls.canonical.sec;
        if (Math.abs(dev) <= TOL_SEC) continue;

        const before = m[0];
        const after = fmt(cls.canonical.sec);

        // Chercher dans title PUIS details
        let applied = false;
        if (s.title.includes(before)) {
          s.title = s.title.split(before).join(after);
          applied = true;
        }
        if (s.details.includes(before)) {
          s.details = s.details.split(before).join(after);
          applied = true;
        }

        if (applied) {
          corrections.push({
            week: week.weekNumber,
            day: s.dayName,
            sessionTitle: s.title,
            type: cls.simpleType ?? "?",
            before,
            after,
          });
          // eslint-disable-next-line no-console
          console.log(`🔧 Allure corrigée — ${id} : ${before} → ${after} (${cls.simpleType})`);
        } else {
          // MISS obligatoire : la regex a matché mais split n'a rien remplacé
          // eslint-disable-next-line no-console
          console.warn(`🔧 MISS — cherché: [${before}] — contenu réel title: [${s.title}] — details: [${s.details.slice(0, 200)}] — session: ${id}`);
          issues.push({
            week: week.weekNumber,
            day: s.dayName,
            sessionTitle: s.title,
            paceText: before,
            paceSec,
            expectedLabel: cls.canonical.label,
            expectedSec: cls.canonical.sec,
            deviationSec: dev,
            composite: false,
          });
        }
      }
    }
  }

  const summary = `${corrections.length} correction(s) auto, ${exempted} exempté(s) composite, ${issues.length}/${total} MISS/résiduel(s) (±${TOL_SEC}s).`;
  // eslint-disable-next-line no-console
  console.log(`🎯 validatePlanPaces : ${summary}`);
  if (issues.length) {
    // eslint-disable-next-line no-console
    console.warn("⚠️ Résiduels après correction :", issues.slice(0, 20));
  }

  return { totalPacesFound: total, corrections, issues, exempted, summary };
}
