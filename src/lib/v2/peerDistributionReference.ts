/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Peer reference — positionnement vs cohorte publiée (VO₂max / VLamax)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Compare une valeur athlète aux DISTRIBUTIONS PUBLIÉES (mean ± SD) de
 * `literatureReferences.ts`, plutôt qu'à nos seules cohortes internes.
 * Sortie = un z-score et une phrase courte lisible par l'athlète.
 *
 * ⚠️ Comparaison de GROUPE : indicatif, jamais un diagnostic individuel.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  REFERENCE_DISTRIBUTIONS,
  LITERATURE_REFERENCES,
  type Discipline,
  type AthleteTier,
} from "@/lib/v2/literatureReferences";

export type PeerMetric = "vo2max" | "vlamax";

export interface PeerPosition {
  z: number;
  mean: number;
  sd: number;
  unit: string;
  tier: AthleteTier;
  discipline: Discipline;
  cohortLabel: string;
  /** Phrase courte prête à afficher. */
  sentence: string;
}

/** Déduit le tier de cohorte depuis l'ambition TFCL. */
export function tierFromAmbition(ambition: string | null | undefined): AthleteTier {
  const a = (ambition || "").toLowerCase();
  if (a.includes("world") || a.includes("elite") || a.includes("pro")) return "subelite";
  if (a.includes("competit") || a.includes("podium") || a.includes("perf")) return "trained";
  return "trained";
}

/** Déduit la discipline littérature depuis l'objectif / sport principal. */
export function disciplineFromSport(sportOrGoal: string | null | undefined): Discipline {
  const s = (sportOrGoal || "").toLowerCase();
  if (s.includes("run") || s.includes("trail") || s.includes("marathon") || s.includes("semi") || s.includes("km") || s.includes("cap")) {
    return "run";
  }
  return "bike";
}

/**
 * Positionne une valeur athlète dans la distribution publiée correspondante.
 * Retourne null si aucune distribution n'est disponible pour ce couple.
 */
export function getPeerPosition(
  metric: PeerMetric,
  value: number | null | undefined,
  discipline: Discipline,
  tier: AthleteTier,
): PeerPosition | null {
  if (value == null || !Number.isFinite(value)) return null;

  const byTier = REFERENCE_DISTRIBUTIONS[discipline];
  const dist = byTier?.[tier] ?? byTier?.trained ?? byTier?.subelite;
  if (!dist) return null;

  const ref = dist[metric];
  if (!ref || !ref.sd) return null;

  const z = (value - ref.mean) / ref.sd;
  const source = LITERATURE_REFERENCES[ref.source];
  const cohortLabel = source
    ? `${source.population} (N=${source.n})`
    : "cohorte de référence publiée";

  // Pour la VLamax, "plus bas" = plus orienté endurance (pas "moins bon").
  const higherIsBetter = metric === "vo2max";
  let qualitative: string;
  if (Math.abs(z) < 0.5) qualitative = "dans la moyenne";
  else if (z >= 0.5)
    qualitative = higherIsBetter ? "au-dessus de la moyenne" : "au-dessus de la moyenne (profil plus glycolytique)";
  else
    qualitative = higherIsBetter ? "en dessous de la moyenne" : "en dessous de la moyenne (profil plus aérobie)";

  const decimals = metric === "vlamax" ? 2 : 1;
  const sentence =
    `Repère cohorte : ${qualitative} — ${value.toFixed(decimals)} ${ref.unit} ` +
    `vs ${ref.mean.toFixed(decimals)} ± ${ref.sd.toFixed(decimals)} chez ${cohortLabel}.`;

  return {
    z: Math.round(z * 100) / 100,
    mean: ref.mean,
    sd: ref.sd,
    unit: ref.unit,
    tier,
    discipline,
    cohortLabel,
    sentence,
  };
}

/** Raccourci : phrase seule, ou null. */
export function describePeerPosition(
  metric: PeerMetric,
  value: number | null | undefined,
  sportOrGoal: string | null | undefined,
  ambition: string | null | undefined,
): string | null {
  return (
    getPeerPosition(metric, value, disciplineFromSport(sportOrGoal), tierFromAmbition(ambition))
      ?.sentence ?? null
  );
}
