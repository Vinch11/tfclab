/**
 * Post-parse validation — scanne les descriptions de séances et compare toutes
 * les allures (m:ss/km) aux paceTargets canoniques. Chantier 1 — SOURCE UNIQUE.
 * Non-bloquant : loggue les écarts pour audit.
 */

import type { ParsedPlan } from "@/lib/aiPlanParser";
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
}

export interface PaceValidationReport {
  totalPacesFound: number;
  issues: PaceCalibrationIssue[];
  summary: string;
}

const PACE_RX = /(\d{1,2}):(\d{2})\s*\/\s*km/gi;
const TOL_SEC = 8; // ±8s/km (raisonnable pour tolérer arrondis + variations blocs)

function parsePaceSec(m: RegExpMatchArray): number {
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function nearestTarget(paceSec: number, pt: PaceTargets, sessionText: string): { label: string; sec: number } {
  const lower = sessionText.toLowerCase();
  // Guess intended target by context to reduce false positives
  if (/vo2|vma|100\s*%|puma|30\/30|30-30/.test(lower) && pt.allureVO2max) {
    return { label: "VO2max", sec: pt.allureVO2max };
  }
  if (/z2|endurance|footing|ef|récup|recup|easy|fondamental|z1/.test(lower) && pt.allureZ2) {
    const mid = Math.round((pt.allureZ2.lo + pt.allureZ2.hi) / 2);
    return { label: "Z2", sec: mid };
  }
  if (/seuil\s*bas|z4b|tempo/.test(lower)) return { label: "Seuil bas", sec: pt.seuilBas };
  if (/seuil\s*haut|z5/.test(lower)) return { label: "Seuil haut", sec: pt.seuilHaut };
  // Default: closest of {allureSemi, seuilBas, seuilHaut, vo2}
  const candidates: { label: string; sec: number }[] = [
    { label: "Allure course", sec: pt.allureSemiCible },
    { label: "Seuil bas", sec: pt.seuilBas },
    { label: "Seuil haut", sec: pt.seuilHaut },
  ];
  if (pt.allureVO2max) candidates.push({ label: "VO2max", sec: pt.allureVO2max });
  if (pt.allureZ2) {
    const mid = Math.round((pt.allureZ2.lo + pt.allureZ2.hi) / 2);
    candidates.push({ label: "Z2", sec: mid });
  }
  return candidates.reduce((best, c) => Math.abs(c.sec - paceSec) < Math.abs(best.sec - paceSec) ? c : best);
}

export function validatePlanPaces(plan: ParsedPlan, paceTargets: PaceTargets | null): PaceValidationReport {
  const issues: PaceCalibrationIssue[] = [];
  let total = 0;

  if (!paceTargets) {
    return { totalPacesFound: 0, issues: [], summary: "Aucun paceTargets fourni — validation ignorée." };
  }

  for (const week of plan.weeks) {
    for (const s of week.sessions) {
      if (s.isRest) continue;
      const text = `${s.title} ${s.details}`;
      const matches = [...text.matchAll(PACE_RX)];
      for (const m of matches) {
        total++;
        const paceSec = parsePaceSec(m);
        if (paceSec < 150 || paceSec > 600) continue; // outliers (probably cadence, HR, etc.)
        const target = nearestTarget(paceSec, paceTargets, text);
        const dev = paceSec - target.sec;
        if (Math.abs(dev) > TOL_SEC) {
          issues.push({
            week: week.weekNumber,
            day: s.dayName,
            sessionTitle: s.title,
            paceText: m[0],
            paceSec,
            expectedLabel: target.label,
            expectedSec: target.sec,
            deviationSec: dev,
          });
        }
      }
    }
  }

  const summary = issues.length === 0
    ? `✅ ${total} allure(s) scannée(s) — toutes dans la tolérance ±${TOL_SEC}s.`
    : `⚠️ ${issues.length}/${total} allure(s) hors calibration (±${TOL_SEC}s).`;

  // eslint-disable-next-line no-console
  console.log(`🎯 validatePlanPaces : ${summary}`);
  if (issues.length > 0) {
    // eslint-disable-next-line no-console
    console.warn("⚠️ Allures hors calibration :", issues.slice(0, 20));
  }

  return { totalPacesFound: total, issues, summary };
}
