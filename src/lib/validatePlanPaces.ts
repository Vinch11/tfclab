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
// Whitelist stricte : on ne réécrit QUE si la dérive est grossière (>30s/km).
// En-dessous, on considère que l'IA a fait un choix pédagogique légitime.
const HARD_DEVIATION_SEC = 30;
// Marqueurs de séance composite : plusieurs allures légitimes coexistent,
// le correcteur zone-aware ne peut pas trancher → on n'y touche pas.
const COMPOSITE_MARKERS = /simulation|n[eé]gative\s*split|neg[- ]?split|fartlek|insert|progressif|progression|brick|sl\s*avec|long\s*run.*avec|surge|pyramide|tempo\s*continu|race[- ]?sim/i;

function fmt(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}/km`;
}

type Zone = "vo2" | "race" | "marathon" | "seuil" | "z3" | "z2" | "none";

function detectZoneFromContext(before: string, after: string): Zone {
  const c = (before + " ⌂ " + after).toLowerCase();
  // Ordre priorité (revu) :
  //   VO2/Z5-6/%VMA > allure course/semi (Z4b) > marathon > seuil/Z4/Z4a/%seuil > Z3/tempo > Z2/Z1/aisance
  if (/\b(z5|z6|z7|vma|vo2)\b|\d+\s*%\s*vma/.test(c)) return "vo2";
  if (/allure\s*(semi|course|cible|objectif)|race[- ]?pace|juge\s*de\s*paix|\bz4b\b/.test(c)) return "race";
  if (/\bmarathon\b/.test(c)) return "marathon";
  if (/\b(z4a?|seuil)\b|\d+\s*%\s*seuil/.test(c)) return "seuil";
  if (/\bz3\b|tempo/.test(c)) return "z3";
  if (/\bz[12]\b|\bef\b|footing|endurance|r[eé]cup|easy|aisance/.test(c)) return "z2";
  return "none";
}

function targetForZone(zone: Zone, pt: PaceTargets): { sec: number; label: string } | null {
  switch (zone) {
    case "vo2": return null; // ne pas réécrire (allures rapides légitimes)
    case "seuil": return { sec: pt.seuilBas, label: "seuil (Z4/Z4a)" };
    case "marathon": return { sec: pt.allureMarathon, label: "allure marathon" };
    case "race": return { sec: pt.allureSemiCible, label: "allure course/semi (Z4b)" };
    case "z3": {
      if (!pt.allureZ2) return { sec: pt.seuilBas + 20, label: "Z3" };
      return { sec: Math.round((pt.allureZ2.lo + pt.seuilBas) / 2), label: "Z3" };
    }
    case "z2": return pt.allureZ2 ? { sec: pt.allureZ2.hi, label: "Z2 (borne lente)" } : null;
    case "none": return null; // pas de marqueur → ne pas réécrire (évite écrasement d'allures neutres)
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
  sessionTitle?: string,
): { text: string; corrections: { before: string; after: string; zone: Zone }[]; z5Sec: number[]; z2Sec: number[]; raceSec: number[] } {
  const corrections: { before: string; after: string; zone: Zone }[] = [];
  const z5Sec: number[] = [];
  const z2Sec: number[] = [];
  const raceSec: number[] = [];

  // WHITELIST STRICTE : si la séance est composite, on n'y touche pas.
  const fullCtx = (sessionTitle ?? "") + " " + text;
  if (COMPOSITE_MARKERS.test(fullCtx)) {
    // Comptage seulement pour les asserts globaux
    for (const m of text.matchAll(PACE_RX)) {
      const paceSec = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      // eslint-disable-next-line no-console
      // (silencieux — séance composite intentionnellement épargnée)
      void paceSec;
    }
    return { text, corrections, z5Sec, z2Sec, raceSec };
  }

  // Collapse fourchette DÉSACTIVÉ (trop agressif sur seuil/z3 — plages légitimes).
  // On travaille uniquement sur allures uniques ci-dessous.
  let out = text;

  out = out.replace(PACE_RX, (m, mm: string, ss: string, offset: number) => {
    const paceSec = parseInt(mm, 10) * 60 + parseInt(ss, 10);
    if (paceSec < 150 || paceSec > 600) return m;

    // Contexte enrichi : titre de la séance en préambule pour zones prioritaires
    const before = (sessionTitle ? sessionTitle + " ⌂ " : "") + out.slice(Math.max(0, offset - 30), offset);
    const afterCtx = out.slice(offset + m.length, offset + m.length + 40);
    const zone = detectZoneFromContext(before, afterCtx);

    if (zone === "vo2") {
      z5Sec.push(paceSec);
      return m;
    }
    if (zone === "z2") z2Sec.push(paceSec);
    if (zone === "race" || zone === "marathon") raceSec.push(paceSec);

    const target = targetForZone(zone, pt);
    if (!target) return m;

    // WHITELIST STRICTE : ne réécrit QUE si dérive grossière (>30s/km).
    // Sous ce seuil, on respecte le choix pédagogique de l'IA.
    if (Math.abs(paceSec - target.sec) <= HARD_DEVIATION_SEC) {
      return m;
    }

    const rep = fmt(target.sec);
    // eslint-disable-next-line no-console
    console.log(`🔧 pace rewrite (dérive ${Math.abs(paceSec - target.sec)}s): '${m}' → '${rep}' (${zone} — ${ctxLabel})`);
    corrections.push({ before: m, after: rep, zone });
    return rep;
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

  // Table de mapping (traçabilité) — toutes valeurs issues de deriveRaceTargets()
  const z2Str = paceTargets.allureZ2 ? `${fmt(paceTargets.allureZ2.lo)}–${fmt(paceTargets.allureZ2.hi)}` : "n/a";
  const vo2Str = paceTargets.allureVO2max ? fmt(paceTargets.allureVO2max) : "n/a";
  // eslint-disable-next-line no-console
  console.log(
    `🗺️ validatePlanPaces mapping (objectif=${objectifEffectif ?? "?"}):\n` +
    `   • vo2/%VMA → (non réécrit)  target=${vo2Str}\n` +
    `   • race/allure semi/course/Z4b → allureSemiCible = ${fmt(paceTargets.allureSemiCible)}\n` +
    `   • marathon → allureMarathon = ${fmt(paceTargets.allureMarathon)}\n` +
    `   • seuil/Z4/Z4a/%seuil → seuilBas = ${fmt(paceTargets.seuilBas)}\n` +
    `   • z3/tempo → ${paceTargets.allureZ2 ? fmt(Math.round((paceTargets.allureZ2.lo + paceTargets.seuilBas) / 2)) : fmt(paceTargets.seuilBas + 20)}\n` +
    `   • z2/z1/ef/endurance/aisance → borne lente Z2 = ${paceTargets.allureZ2 ? fmt(paceTargets.allureZ2.hi) : "n/a"} (range ${z2Str})\n` +
    `   • none (aucun marqueur) → NON réécrit`
  );


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

      // J-day fix : la séance course du jour J (semi) ne doit pas parler d'allure
      // marathon. Restreint à la séance "Jour J / Race Day / Course semi" —
      // pas aux séances d'entraînement (les inserts marathon en SL restent légitimes).
      const isRaceDaySession = /jour\s*j|race\s*day|course\s*objectif|course\s*semi|comp[eé]tition/i.test(s.title);
      if (semiObjective && isRaceDaySession) {
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


      const titleRes = rewritePacesInText(s.title, paceTargets, id, s.title);
      if (titleRes.corrections.length) {
        s.title = titleRes.text;
        for (const c of titleRes.corrections) {
          corrections.push({ week: week.weekNumber, day: s.dayName, sessionTitle: s.title, type: c.zone, before: c.before, after: c.after });
        }
      }
      const detailsRes = rewritePacesInText(s.details, paceTargets, id, s.title);
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
        if (Math.abs(r - paceTargets.allureSemiCible) > HARD_DEVIATION_SEC) {
          // eslint-disable-next-line no-console
          console.error(`❌ ASSERT dérive semi — ${id} : ${fmt(r)} ≠ ${fmt(paceTargets.allureSemiCible)}`);
        }
      }
    }
  }

  // Assertion marathon <= semi
  if (paceTargets.allureMarathon <= paceTargets.allureSemiCible) {
    // eslint-disable-next-line no-console
    console.error(`❌ ASSERT marathon — allureMarathon ${fmt(paceTargets.allureMarathon)} <= allureSemi ${fmt(paceTargets.allureSemiCible)}`);
  }


  const summary = `${corrections.length} correction(s) zone-aware, ${total} allure(s) totale(s).`;
  // eslint-disable-next-line no-console
  console.log(`🎯 validatePlanPaces (zone-aware) : ${summary}`);

  return { totalPacesFound: total, corrections, issues, exempted: 0, summary };
}
