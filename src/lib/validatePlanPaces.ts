/**
 * Post-parse validation + correction déterministe des allures.
 *
 * - Séances SIMPLES (EF/Z2 pur, seuil continu, tempo semi, jour J, VMA) :
 *   si l'allure est hors plage → substitution automatique par l'allure canonique.
 * - Séances COMPOSITES (SL negative split, fartlek, pyramide, brick, finish fast) :
 *   set d'allures autorisées (Z2 + seuilBas + allureSemi) → warn seulement si AUCUNE ne matche.
 *
 * Mute plan.weeks[i].sessions[j].details lors des corrections.
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
  summary: string;
}

const PACE_RX = /(\d{1,2}):(\d{2})\s*\/\s*km/gi;
const TOL_SEC = 8;

function fmt(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}/km`;
}

type Target = { label: string; sec: number };

interface Classification {
  simpleType: "z2" | "seuil_bas" | "seuil_haut" | "vo2max" | "race_pace" | null;
  composite: boolean;
  allowed: Target[]; // set d'allures autorisées (composite)
  canonical: Target | null; // allure canonique (simple)
}

const COMPOSITE_RX = /negative\s*split|pyramide|fartlek|navette|brick|finish\s*fast|progressi(f|ve)|hérisson|herisson|split|intermitt|billat|30\/30|30-30|puma/i;

function classify(session: ParsedSession, pt: PaceTargets): Classification {
  const text = `${session.title} ${session.details}`.toLowerCase();
  const z2Mid = pt.allureZ2 ? Math.round((pt.allureZ2.lo + pt.allureZ2.hi) / 2) : null;

  const targets = {
    z2: z2Mid ? { label: "Z2", sec: z2Mid } : null,
    seuilBas: { label: "Seuil bas", sec: pt.seuilBas },
    seuilHaut: { label: "Seuil haut", sec: pt.seuilHaut },
    vo2: pt.allureVO2max ? { label: "VO2max", sec: pt.allureVO2max } : null,
    race: { label: "Allure course", sec: pt.allureSemiCible },
  };

  const composite = COMPOSITE_RX.test(text);

  // Detect simple type FIRST
  let simpleType: Classification["simpleType"] = null;
  let canonical: Target | null = null;

  if (/jour\s*j|race\s*day|course\s*[:—-]/.test(text)) {
    simpleType = "race_pace";
    canonical = targets.race;
  } else if (/^ef\b|^footing|endurance\s*fond|z2\s*pur|ef\s*pur|récup|recup|easy(?!\s*run)|z1/.test(text)) {
    simpleType = "z2";
    canonical = targets.z2;
  } else if (/vo2|vma\b/.test(text) && !composite) {
    simpleType = "vo2max";
    canonical = targets.vo2;
  } else if (/tempo\s*semi|allure\s*semi|race[- ]pace|juge\s*de\s*paix|simulation\s*race/.test(text) && !composite) {
    simpleType = "race_pace";
    canonical = targets.race;
  } else if (/seuil\s*continu|seuil\s*bas|z4b/.test(text) && !composite) {
    simpleType = "seuil_bas";
    canonical = targets.seuilBas;
  } else if (/seuil\s*haut|z5\b/.test(text) && !composite) {
    simpleType = "seuil_haut";
    canonical = targets.seuilHaut;
  }

  // Allowed set for composites: Z2 + seuilBas + race + (seuilHaut if intense keyword)
  const allowed: Target[] = [];
  if (targets.z2) allowed.push(targets.z2);
  allowed.push(targets.seuilBas);
  allowed.push(targets.race);
  if (/seuil\s*haut|z5|pyramide|billat|intermitt|vo2|vma/.test(text) && targets.seuilHaut) allowed.push(targets.seuilHaut);
  if (targets.vo2 && /vma|vo2|billat|30\/30|30-30|intermitt/.test(text)) allowed.push(targets.vo2);

  return { simpleType, composite: composite || !simpleType, allowed, canonical };
}

function nearest(paceSec: number, targets: Target[]): Target {
  return targets.reduce((b, c) => Math.abs(c.sec - paceSec) < Math.abs(b.sec - paceSec) ? c : b);
}

export function validatePlanPaces(plan: ParsedPlan, paceTargets: PaceTargets | null): PaceValidationReport {
  const issues: PaceCalibrationIssue[] = [];
  const corrections: PaceCorrection[] = [];
  let total = 0;

  if (!paceTargets) {
    return { totalPacesFound: 0, corrections: [], issues: [], summary: "Aucun paceTargets fourni — validation ignorée." };
  }

  for (const week of plan.weeks) {
    for (const s of week.sessions) {
      if (s.isRest) continue;
      const cls = classify(s, paceTargets);
      const text = `${s.title} ${s.details}`;
      const matches = [...text.matchAll(PACE_RX)];

      for (const m of matches) {
        total++;
        const paceSec = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
        if (paceSec < 150 || paceSec > 600) continue;

        if (cls.composite) {
          // Composite : accepter si matche AU MOINS une allure du set ±TOL
          const okSet = cls.allowed.some(t => Math.abs(paceSec - t.sec) <= TOL_SEC);
          if (!okSet) {
            const near = nearest(paceSec, cls.allowed);
            issues.push({
              week: week.weekNumber,
              day: s.dayName,
              sessionTitle: s.title,
              paceText: m[0],
              paceSec,
              expectedLabel: `composite {${cls.allowed.map(t => t.label).join(", ")}}`,
              expectedSec: near.sec,
              deviationSec: paceSec - near.sec,
              composite: true,
            });
          }
          continue;
        }

        // Simple : correction déterministe si hors plage
        if (!cls.canonical) continue;
        const dev = paceSec - cls.canonical.sec;
        if (Math.abs(dev) > TOL_SEC) {
          const before = m[0];
          const after = fmt(cls.canonical.sec);
          // Remplacement dans details (title rarely holds a pace)
          const newDetails = s.details.split(before).join(after);
          if (newDetails !== s.details) {
            s.details = newDetails;
            corrections.push({
              week: week.weekNumber,
              day: s.dayName,
              sessionTitle: s.title,
              type: cls.simpleType ?? "?",
              before,
              after,
            });
            // eslint-disable-next-line no-console
            console.log("🔧 Allure corrigée", { semaine: week.weekNumber, séance: s.title, avant: before, après: after, type: cls.simpleType });
          } else {
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
  }

  const summary = `${corrections.length} correction(s) auto, ${issues.length}/${total} restant(s) hors calibration (±${TOL_SEC}s).`;
  // eslint-disable-next-line no-console
  console.log(`🎯 validatePlanPaces : ${summary}`);
  if (corrections.length) {
    // eslint-disable-next-line no-console
    console.log("🔧 Corrections déterministes :", corrections);
  }
  if (issues.length) {
    // eslint-disable-next-line no-console
    console.warn("⚠️ Allures composites/hors calibration résiduelles :", issues.slice(0, 20));
  }

  return { totalPacesFound: total, corrections, issues, summary };
}
