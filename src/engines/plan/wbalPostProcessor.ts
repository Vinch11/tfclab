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
  type CriticalPowerResult,
} from "@/lib/v2/criticalPowerModel";

// ─── Pattern d'intervalles cycliste ────────────────────────────────────────
// Capture : reps × duration (min|s) @ pct%FTP|CP, R=rest (min|s)
// Exemples reconnus :
//   "5×4min @ 110%FTP, R=3min"
//   "8 x 3 min à 105% FTP — repos 2min30"
//   "6×30s @ 130%FTP R=30s"
const INTERVAL_PATTERN =
  /(\d{1,2})\s*[x×]\s*(\d{1,3})\s*(min|s|sec|secondes?|minutes?)\s*[@à]?\s*(\d{2,3})\s*%\s*(ftp|cp)[^.]*?(?:r\s*[=:]?|repos|rest)\s*(\d{1,3})\s*(min|s|sec|secondes?|minutes?)?(\d{1,2})?/i;

// Pattern simplifié pour la substitution finale du repos
const REST_REPLACE_PATTERN =
  /((?:r\s*[=:]?|repos|rest)\s*)(\d{1,3}(?:min|s|sec|minutes?|secondes?)?(?:\d{1,2})?)/gi;

export interface DetectedInterval {
  reps: number;
  durationSec: number;
  pctIntensity: number;
  intensityRef: "FTP" | "CP";
  originalRestSec: number;
  originalRestText: string;
}

function toSeconds(value: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith("min") || u === "m") return value * 60;
  return value;
}

function detectInterval(text: string): DetectedInterval | null {
  const m = INTERVAL_PATTERN.exec(text);
  if (!m) return null;

  const reps = parseInt(m[1], 10);
  const durValue = parseInt(m[2], 10);
  const durUnit = m[3];
  const pct = parseInt(m[4], 10);
  const ref = m[5].toUpperCase() as "FTP" | "CP";
  const restValue = parseInt(m[6], 10);
  const restUnit = m[7] || "min"; // si absent, considéré minutes

  // Garde-fous physiologiques
  if (reps < 2 || reps > 30) return null;
  if (pct < 70 || pct > 200) return null;

  const durationSec = toSeconds(durValue, durUnit);
  const originalRestSec = toSeconds(restValue, restUnit);

  if (durationSec < 10 || durationSec > 1800) return null;
  if (originalRestSec < 10 || originalRestSec > 1800) return null;

  return {
    reps,
    durationSec,
    pctIntensity: pct,
    intensityRef: ref,
    originalRestSec,
    originalRestText: m[0],
  };
}

function isCyclingSession(session: ParsedSession): boolean {
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
  scanned: number;
  rewritten: number;
  skipped: number;
}

/**
 * Recalcule les temps de repos via W'bal pour toutes les sessions cyclistes
 * du plan parsé. Mute le plan en place et retourne des statistiques.
 *
 * Si l'athlète n'a pas de CP/W' calculable (P30s, P60s, MAP5min manquants),
 * le post-traitement est un no-op silencieux (les valeurs IA sont conservées).
 */
export function applyWbalRecoveryRecalc(
  plan: ParsedPlan,
  athleteData: PlanAthleteData
): WbalRecalcStats {
  const stats: WbalRecalcStats = { scanned: 0, rewritten: 0, skipped: 0 };

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
    // Pas assez de données pour CP/W' → on ne touche pas au plan
    return stats;
  }

  const cp = cpResult.effectiveCP;
  const wprime = effectiveWprime(cpResult.wprime); // [10kJ ; 35kJ]
  const ftp = athleteData.ftp ?? cp;

  // 2) Parcourir toutes les sessions
  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      if (session.isRest) continue;
      if (!isCyclingSession(session)) continue;

      stats.scanned++;

      const detected = detectInterval(session.details);
      if (!detected) {
        stats.skipped++;
        continue;
      }

      // 3) Calculer la puissance d'intervalle absolue
      const refWatts = detected.intensityRef === "FTP" ? ftp : cp;
      const intervalPowerW = Math.round((refWatts * detected.pctIntensity) / 100);

      // Skip si supra-CP non atteint (W'bal n'apporte rien sous CP)
      if (intervalPowerW <= cp) {
        stats.skipped++;
        continue;
      }

      // 4) Prescription W'bal (récup passive par défaut)
      const prescription = prescribeIntervalRecovery(
        cp,
        wprime,
        intervalPowerW,
        detected.durationSec,
        0
      );

      const newRestSec = prescription.optimalRecoverySec;
      const newRestStr = formatRestSec(newRestSec);
      const wKJ = Math.round(wprime / 100) / 10;

      // 5) Substituer dans details (1ère occurrence seulement)
      let replaced = false;
      const newDetails = session.details.replace(REST_REPLACE_PATTERN, (match, prefix) => {
        if (replaced) return match;
        replaced = true;
        return `${prefix}${newRestStr}`;
      });

      if (replaced) {
        const annotation = ` *[W'bal: ${newRestStr} optimal pour ${prescription.maxReps} reps max — calibré W'=${wKJ}kJ, CP=${cp}W]*`;
        session.details = newDetails + annotation;
        stats.rewritten++;
      } else {
        stats.skipped++;
      }
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
