/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL WEEKLY VOLUME ESTIMATOR
 *
 * Correctif #7 (audit Cath 07/2026) : le libellé "Volume cible : 8h30 → 10h45"
 * était un placeholder textuel identique sur toutes les semaines (dont décharge).
 * On calcule ici le volume RÉEL de la semaine en sommant les durées estimées
 * de chaque séance à partir de son texte.
 *
 * HEURISTIQUE de parsing :
 *   1) Cherche des durées explicites : "1h30", "90min", "2h", "45'", "3h15"
 *      → additionne toutes les occurrences (les "Récup 3 min" sont exclues via
 *        filtre de contexte : on ignore les durées < 10min si "récup" est
 *        présent sur le même token).
 *   2) Si aucune durée détectée → fallback par sport (Z2 vélo=90min, run=60min,
 *      swim=45min, brick=120min, repos=0).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ParsedSession, ParsedWeek } from "./aiPlanParser";
import { extractCatalogId } from "./catalogIdExtractor";
import { getLibraryDurationMin } from "./libraryDurationIndex";

const DURATION_HHMM = /(\d{1,2})\s*h\s*(\d{1,2})?/gi;
const DURATION_MIN = /(\d{1,3})\s*(?:min|['′])/gi;

/** Extrait toutes les durées (en minutes) trouvées dans le texte. */
function extractDurationsFromText(text: string): number[] {
  const durations: number[] = [];
  const lower = text.toLowerCase();

  // Matches "1h30", "2h", "1h45min"
  DURATION_HHMM.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = DURATION_HHMM.exec(lower))) {
    const h = parseInt(m[1], 10);
    const mm = m[2] ? parseInt(m[2], 10) : 0;
    if (h >= 0 && h <= 12 && mm >= 0 && mm < 60) {
      durations.push(h * 60 + mm);
    }
  }

  // Matches "90 min", "45'", "30′"
  DURATION_MIN.lastIndex = 0;
  while ((m = DURATION_MIN.exec(lower))) {
    const minutes = parseInt(m[1], 10);
    // Ignore les micro-durées de récup/intervalle (< 10 min)
    if (minutes >= 10 && minutes <= 600) {
      const start = Math.max(0, m.index - 20);
      const context = lower.substring(start, m.index);
      // Skip si "récup", "repos", "r:", "recovery" dans le contexte immédiat
      if (!/récup|repos|recovery|\br\s*:/.test(context)) {
        durations.push(minutes);
      }
    }
  }

  return durations;
}

/** Durée fallback par sport (minutes). */
function fallbackDurationBySport(sport: string, title: string): number {
  const s = `${sport} ${title}`.toLowerCase();
  if (/repos|rest|off/.test(s)) return 0;
  if (/brick|enchaînement/.test(s)) return 120;
  if (/natation|swim|piscine/.test(s)) return 45;
  if (/vélo|velo|bike|cycl/.test(s)) return 90;
  if (/course|run|footing|cap/.test(s)) return 60;
  if (/renfo|force|strength|muscu|yoga/.test(s)) return 45;
  return 60;
}

/**
 * Estime la durée d'une séance à partir de son texte détails.
 * Renvoie la durée LA PLUS LONGUE trouvée (heuristique : c'est la durée
 * totale de la séance, les autres sont des blocs internes).
 */
export function estimateSessionDurationMin(session: ParsedSession): number {
  if (session.isRest) return 0;
  const text = `${session.title} ${session.details}`;
  const durations = extractDurationsFromText(text);
  if (durations.length === 0) {
    return fallbackDurationBySport(session.sport, session.title);
  }
  // Prendre la durée maximale (= durée totale, pas les blocs internes)
  return Math.max(...durations);
}

/** Somme les durées de toutes les séances d'une semaine. */
export function computeWeekVolumeMin(week: ParsedWeek): number {
  return week.sessions.reduce((sum, s) => sum + estimateSessionDurationMin(s), 0);
}

/** Formate une durée en minutes → "8h30" / "45min". */
export function formatMinutesToHm(totalMin: number): string {
  if (totalMin <= 0) return "0min";
  if (totalMin < 60) return `${totalMin}min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}
