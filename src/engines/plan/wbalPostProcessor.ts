/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * W'bal POST-PROCESSOR — Recalcul individualisé des temps de repos
 *
 * Après parsing du plan IA, scanne chaque session pour détecter des patterns
 * d'intervalles cyclistes ("N×Tmin @ X%FTP, R=Ymin"), puis remplace la valeur
 * de repos textuelle par la prescription W'bal individualisée calculée via
 * `prescribeIntervalRecovery()` (Skiba 2012, basé sur le CP/W' de l'athlète).
 *
 * PORTÉE :
 *   - Cyclisme uniquement (CP/W' = modèle vélo)
 *   - Intervalles supra-CP (sinon W'bal n'apporte rien)
 *   - Sessions avec un workoutId catalogue OU séances Custom qui exposent
 *     un format reconnaissable
 *
 * NOTE : Le texte original est conservé entre parenthèses pour traçabilité.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ParsedPlan, ParsedSession, PlanAthleteData } from "./types";
import {
  analyzeCriticalPower,
  prescribeIntervalRecovery,
  effectiveWprime,
  effectiveWprimeWithMeta,
  type CriticalPowerResult,
} from "@/lib/v2/criticalPowerModel";

// ─── Pattern d'intervalles cycliste ────────────────────────────────────────
// Capture : reps × duration (min|s) @ pct%FTP|CP, R=rest (min|s)
// Exemples reconnus :
//   "5×4min @ 110%FTP, R=3min"
//   "8 x 3 min à 105% FTP — repos 2min30"
//   "6×30s @ 130%FTP R=30s"
//
// IMPORTANT : utilisé en mode global (g) pour matcher TOUTES les occurrences
// dans une même session (pyramides, blocs multiples, sets composés).
// IMPORTANT : utilisé en mode global (g) pour matcher TOUTES les occurrences
// dans une même session (pyramides, blocs multiples, sets composés).
// Le 8ème groupe capture les secondes additionnelles dans un format composé
// "2min30" → reps=N, mins=2, sec=30 → 150s.
const INTERVAL_PATTERN_SOURCE =
  "(\\d{1,2})\\s*[x×]\\s*(\\d{1,3})\\s*(min|s|sec|secondes?|minutes?)\\s*[@à]?\\s*(\\d{2,3})\\s*%\\s*(ftp|cp)[^.]*?(?:r\\s*[=:]?|repos|rest)\\s*(\\d{1,3})\\s*(min|s|sec|secondes?|minutes?)?\\s*(\\d{1,2})?";

const INTERVAL_PATTERN = new RegExp(INTERVAL_PATTERN_SOURCE, "i");
const INTERVAL_PATTERN_GLOBAL = new RegExp(INTERVAL_PATTERN_SOURCE, "gi");

export interface DetectedInterval {
  reps: number;
  durationSec: number;
  pctIntensity: number;
  intensityRef: "FTP" | "CP";
  originalRestSec: number;
  originalRestText: string;
  /** Index (char) du match dans le texte source — utile pour substitution multi-blocs */
  matchIndex?: number;
  /** Texte complet matché (pour substitution ciblée) */
  fullMatch?: string;
}

function toSeconds(value: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith("min") || u === "m") return value * 60;
  return value;
}

function parseMatch(m: RegExpMatchArray | RegExpExecArray): DetectedInterval | null {
  const reps = parseInt(m[1], 10);
  const durValue = parseInt(m[2], 10);
  const durUnit = m[3];
  const pct = parseInt(m[4], 10);
  const ref = m[5].toUpperCase() as "FTP" | "CP";
  const restValue = parseInt(m[6], 10);
  const restUnit = m[7] || "min";
  // m[8] : secondes additionnelles dans un format composé "2min30"
  const restExtraSec = m[8] ? parseInt(m[8], 10) : 0;

  if (reps < 2 || reps > 30) return null;
  if (pct < 70 || pct > 200) return null;

  const durationSec = toSeconds(durValue, durUnit);
  const baseRestSec = toSeconds(restValue, restUnit);
  // N'ajoute les secondes que si l'unité principale est "min" (sinon "30s 30" n'a pas de sens)
  const isMinUnit = restUnit.toLowerCase().startsWith("min") || restUnit.toLowerCase() === "m";
  const originalRestSec = baseRestSec + (isMinUnit ? restExtraSec : 0);

  if (durationSec < 10 || durationSec > 1800) return null;
  if (originalRestSec < 10 || originalRestSec > 1800) return null;

  return {
    reps,
    durationSec,
    pctIntensity: pct,
    intensityRef: ref,
    originalRestSec,
    originalRestText: m[0],
    fullMatch: m[0],
    matchIndex: (m as RegExpExecArray).index,
  };
}

export function detectInterval(text: string): DetectedInterval | null {
  const m = INTERVAL_PATTERN.exec(text);
  if (!m) return null;
  return parseMatch(m);
}

/**
 * Détecte TOUTES les occurrences d'intervalles dans un texte.
 * Utile pour les sessions à blocs multiples (pyramides, sets composés).
 */
export function detectAllIntervals(text: string): DetectedInterval[] {
  const results: DetectedInterval[] = [];
  INTERVAL_PATTERN_GLOBAL.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INTERVAL_PATTERN_GLOBAL.exec(text)) !== null) {
    const parsed = parseMatch(m);
    if (parsed) results.push(parsed);
    if (m.index === INTERVAL_PATTERN_GLOBAL.lastIndex) {
      INTERVAL_PATTERN_GLOBAL.lastIndex++;
    }
  }
  return results;
}

export function isCyclingSession(session: ParsedSession): boolean {
  const sport = session.sport.toLowerCase();
  return /vélo|velo|bike|cyclisme|cycle/.test(sport);
}

function formatRestSec(sec: number): string {
  if (sec >= 120) {
    const min = Math.round(sec / 60);
    return `${min}min`;
  }
  if (sec >= 60 && sec % 30 === 0) {
    const min = Math.floor(sec / 60);
    const rem = sec % 60;
    return rem === 0 ? `${min}min` : `${min}min${rem.toString().padStart(2, "0")}`;
  }
  return `${sec}s`;
}

// ─── API publique ──────────────────────────────────────────────────────────

export interface WbalRecalcStats {
  /** Sessions vélo non-repos analysées */
  scanned: number;
  /** Sessions ayant subi au moins une réécriture */
  rewritten: number;
  /** Sessions sans aucun bloc d'intervalle réécrit */
  skipped: number;
  /** Nombre total de blocs d'intervalles détectés (toutes sessions) */
  blocksDetected: number;
  /** Nombre total de blocs effectivement réécrits */
  blocksRewritten: number;
  /** Nombre de blocs skipped (sub-CP) */
  blocksSkipped: number;
}

/**
 * Réécrit la valeur de repos à l'intérieur d'un texte d'intervalle déjà matché.
 * Utilise un pattern local pour ne toucher qu'à la portion "R=...|repos ...|rest ..."
 * située à l'intérieur du fullMatch — préserve le reste (intensité, reps, etc.).
 */
function rewriteRestInMatch(matchText: string, newRestStr: string): string | null {
  // Pattern local non-global : on ne remplace que la 1ère occurrence DANS le match.
  // Le match d'intervalle ne contient par construction qu'une seule mention de repos.
  const localRestPattern =
    /((?:r\s*[=:]?|repos|rest)\s*)(\d{1,3}(?:min|s|sec|minutes?|secondes?)?(?:\d{1,2})?)/i;
  if (!localRestPattern.test(matchText)) return null;
  return matchText.replace(localRestPattern, (_full, prefix) => `${prefix}${newRestStr}`);
}

/**
 * Recalcule les temps de repos via W'bal pour toutes les sessions cyclistes
 * du plan parsé. Mute le plan en place et retourne des statistiques.
 *
 * Les sessions à blocs multiples (pyramides, sets composés) voient TOUS
 * leurs intervalles supra-CP recalculés indépendamment.
 *
 * Si l'athlète n'a pas de CP/W' calculable (P30s, P60s, MAP5min manquants),
 * le post-traitement est un no-op silencieux (les valeurs IA sont conservées).
 */
export function applyWbalRecoveryRecalc(
  plan: ParsedPlan,
  athleteData: PlanAthleteData
): WbalRecalcStats {
  const stats: WbalRecalcStats = {
    scanned: 0,
    rewritten: 0,
    skipped: 0,
    blocksDetected: 0,
    blocksRewritten: 0,
    blocksSkipped: 0,
  };

  // 1) Calculer CP/W' à partir des données athlète
  const cpResult = analyzeCriticalPower({
    pmax_5s: athleteData.pmax5s ?? null,
    p30s_w: athleteData.p30s ?? null,
    p60s_w: athleteData.p60s ?? null,
    map5min_w: athleteData.map5min ?? null,
    ftp: athleteData.ftp ?? null,
    weight_kg: athleteData.weightKg ?? null,
  });

  if (!cpResult) {
    return stats;
  }

  const cp = cpResult.effectiveCP;
  const wprime = effectiveWprime(cpResult.wprime); // [10kJ ; 35kJ]
  const ftp = athleteData.ftp ?? cp;
  const wKJ = Math.round(wprime / 100) / 10;

  // 2) Parcourir toutes les sessions
  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      if (session.isRest) continue;
      if (!isCyclingSession(session)) continue;

      stats.scanned++;

      const detectedBlocks = detectAllIntervals(session.details);
      if (detectedBlocks.length === 0) {
        stats.skipped++;
        continue;
      }

      stats.blocksDetected += detectedBlocks.length;

      // 3) Calculer les nouvelles valeurs pour chaque bloc
      type Rewrite = {
        original: string;
        replacement: string;
        newRestSec: number;
        originalRestSec: number;
        originalRestStr: string;
        maxReps: number;
        reps: number;
        durationSec: number;
      };
      const rewrites: Rewrite[] = [];

      for (const block of detectedBlocks) {
        const refWatts = block.intensityRef === "FTP" ? ftp : cp;
        const intervalPowerW = Math.round((refWatts * block.pctIntensity) / 100);

        // Skip si supra-CP non atteint (W'bal n'apporte rien sous CP)
        if (intervalPowerW <= cp) {
          stats.blocksSkipped++;
          continue;
        }

        const prescription = prescribeIntervalRecovery(
          cp,
          wprime,
          intervalPowerW,
          block.durationSec,
          0
        );

        const newRestStr = formatRestSec(prescription.optimalRecoverySec);
        const originalRestStr = formatRestSec(block.originalRestSec);
        const original = block.fullMatch ?? block.originalRestText;

        // Substitution avec traçabilité inline : "R=NEW (IA: OLD)"
        // → préserve explicitement la valeur initiale proposée par l'IA à côté
        //   du repos recalculé via W'bal, pour audit coach.
        const traceabilitySuffix = ` (IA: ${originalRestStr})`;
        const replacement = rewriteRestInMatch(original, `${newRestStr}${traceabilitySuffix}`);

        if (!replacement) {
          stats.blocksSkipped++;
          continue;
        }

        rewrites.push({
          original,
          replacement,
          newRestSec: prescription.optimalRecoverySec,
          originalRestSec: block.originalRestSec,
          originalRestStr,
          maxReps: prescription.maxReps,
          reps: block.reps,
          durationSec: block.durationSec,
        });
      }

      if (rewrites.length === 0) {
        stats.skipped++;
        continue;
      }

      // 4) Appliquer toutes les substitutions (chaque match étant unique
      //    dans le texte source par construction du pattern d'intervalle).
      let newDetails = session.details;
      let appliedCount = 0;
      for (const rw of rewrites) {
        const idx = newDetails.indexOf(rw.original);
        if (idx === -1) continue;
        newDetails =
          newDetails.slice(0, idx) +
          rw.replacement +
          newDetails.slice(idx + rw.original.length);
        appliedCount++;
        stats.blocksRewritten++;
      }

      if (appliedCount === 0) {
        stats.skipped++;
        continue;
      }

      // 5) Annotation synthétique (1 ligne par bloc réécrit) — affiche
      //    explicitement la transition IA → W'bal pour traçabilité.
      const annotationLines = rewrites.map((rw) => {
        const dur = rw.durationSec >= 60 ? `${rw.durationSec / 60}min` : `${rw.durationSec}s`;
        return `${rw.reps}×${dur}: IA ${rw.originalRestStr} → W'bal ${formatRestSec(rw.newRestSec)} (max ${rw.maxReps} reps)`;
      });
      const annotation =
        rewrites.length === 1
          ? ` *[W'bal recalc: IA ${rewrites[0].originalRestStr} → ${formatRestSec(rewrites[0].newRestSec)} optimal pour ${rewrites[0].maxReps} reps max — calibré W'=${wKJ}kJ, CP=${cp}W]*`
          : ` *[W'bal multi-blocs (W'=${wKJ}kJ, CP=${cp}W): ${annotationLines.join(" | ")}]*`;

      session.details = newDetails + annotation;
      stats.rewritten++;
    }
  }

  return stats;
}

/**
 * Helper exposé pour debug / inspection (pas utilisé par le pipeline).
 */
export function getCpForAthlete(athleteData: PlanAthleteData): CriticalPowerResult | null {
  return analyzeCriticalPower({
    pmax_5s: athleteData.pmax5s ?? null,
    p30s_w: athleteData.p30s ?? null,
    p60s_w: athleteData.p60s ?? null,
    map5min_w: athleteData.map5min ?? null,
    ftp: athleteData.ftp ?? null,
    weight_kg: athleteData.weightKg ?? null,
  });
}
