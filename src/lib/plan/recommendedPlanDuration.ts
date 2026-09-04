/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DURÉE DE PLAN RECOMMANDÉE — cohérence objectif × ambition
 * ═══════════════════════════════════════════════════════════════════════════════
 * Demande coach (audit fiabilité génération plan IA) : quand le coach fixe la
 * durée du plan directement (mode "X semaines", indépendant d'une date de
 * course précise), lui donner un signal non-bloquant si cette durée semble
 * incohérente avec l'objectif et l'ambition choisis — plutôt que de laisser
 * générer silencieusement un plan Ironman Elite en 4 semaines ou un plan 5K
 * Finisher en 30 semaines sans le signaler.
 *
 * Fourchettes calibrées sur la littérature d'entraînement standard (pas une
 * science exacte — volontairement large, message INFO non-bloquant, jamais
 * une interdiction). `idealMin`/`idealMax` = fenêtre confortable pour un
 * cycle de périodisation complet (base + build + peak + taper) ; `minViable`
 * = plancher sous lequel la préparation est structurellement compromise quel
 * que soit le niveau d'ambition.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { normalizeObjectiveKey } from "@/lib/normalizeObjectiveKey";

export interface DurationRange {
  minViable: number;
  idealMin: number;
  idealMax: number;
}

const RECOMMENDED_WEEKS: Record<string, DurationRange> = {
  StartToRun: { minViable: 4, idealMin: 6, idealMax: 12 },
  "5K": { minViable: 4, idealMin: 6, idealMax: 10 },
  "10K": { minViable: 5, idealMin: 8, idealMax: 12 },
  Semi: { minViable: 8, idealMin: 10, idealMax: 16 },
  Marathon: { minViable: 10, idealMin: 16, idealMax: 20 },
  Sprint: { minViable: 5, idealMin: 8, idealMax: 12 },
  Olympic: { minViable: 6, idealMin: 10, idealMax: 16 },
  "703": { minViable: 8, idealMin: 12, idealMax: 20 },
  IM: { minViable: 14, idealMin: 20, idealMax: 28 },
  TrailShort: { minViable: 6, idealMin: 10, idealMax: 16 },
  Trail: { minViable: 8, idealMin: 12, idealMax: 18 },
  TrailMountain: { minViable: 10, idealMin: 16, idealMax: 22 },
  TrailUltra: { minViable: 14, idealMin: 20, idealMax: 30 },
};

const HIGH_AMBITION = new Set(["world_class", "elite", "competitor"]);

export type DurationCoherence = "too_short" | "short_for_ambition" | "ok" | "long";

export interface DurationCoherenceResult {
  coherence: DurationCoherence;
  message: string;
  range: DurationRange | null;
}

/**
 * Évalue la cohérence d'une durée de plan (en semaines) pour un objectif et
 * une ambition donnés. Retourne `range: null` si l'objectif n'a pas de
 * référentiel connu — dans ce cas `coherence` vaut toujours "ok" (pas de
 * faux avertissement sur un objectif non couvert).
 */
export function evaluateDurationCoherence(
  weeks: number,
  objective: string | undefined,
  ambition: string | undefined,
): DurationCoherenceResult {
  const objKey = normalizeObjectiveKey(objective || "");
  const range = RECOMMENDED_WEEKS[objKey] ?? null;
  if (!range || !Number.isFinite(weeks) || weeks <= 0) {
    return { coherence: "ok", message: "", range: null };
  }

  const amb = (ambition || "").toLowerCase();
  const isHighAmbition = HIGH_AMBITION.has(amb);

  if (weeks < range.minViable) {
    return {
      coherence: "too_short",
      range,
      message: `⚠️ ${weeks} semaine(s) est court pour un objectif ${objKey} — en dessous du plancher habituellement recommandé (${range.minViable} sem min). Risque de préparation structurellement incomplète.`,
    };
  }
  if (isHighAmbition && weeks < range.idealMin) {
    return {
      coherence: "short_for_ambition",
      range,
      message: `⚠️ ${weeks} semaines est en dessous de la fenêtre confortable pour une ambition élevée sur ${objKey} (idéal ≥${range.idealMin} sem) — le cycle base/build/peak/taper complet sera compressé.`,
    };
  }
  if (weeks > range.idealMax * 1.4) {
    return {
      coherence: "long",
      range,
      message: `ℹ️ ${weeks} semaines est long pour un bloc unique sur ${objKey} (fourchette habituelle ${range.idealMin}-${range.idealMax} sem) — envisage de le découper avec un objectif intermédiaire.`,
    };
  }
  return {
    coherence: "ok",
    range,
    message: `✅ ${weeks} semaines est cohérent avec un objectif ${objKey} (fourchette habituelle ${range.idealMin}-${range.idealMax} sem).`,
  };
}
