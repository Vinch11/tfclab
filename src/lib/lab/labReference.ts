import type { CoachingCompassInput } from "@/lib/coachingCompass/types";
import { idealReference, type IdealFactor } from "@/lib/coachingCompass/idealReferences";

const IDEAL_KEYS = new Set<string>(["vo2max", "vma", "ftpkg"]);
const fmt = (n: number) => n.toLocaleString("fr-BE", { maximumFractionDigits: n < 10 ? 2 : 1 });

export interface LabReference {
  kind: "ideal" | "coaching";
  /** Libellé de la barre de comparaison. */
  label: string;
  value: number;
  display: string;
  /** Niveau de preuve en clair, ou `null` pour un repère de coaching. */
  tier: "measured" | "derived" | null;
  basis: string | null;
  adjustment: string | null;
}

/**
 * Repère affiché sur la page 100%lab pour un indicateur : l'idéal sourcé (même calcul, même âge et
 * même sexe que le Dashboard) pour la VO₂max, la VMA et le seuil vélo ; sinon la cible interne TFCL,
 * étiquetée comme telle. Affichage seul.
 */
export function labReference(
  indicator: { key: string; target: number | null; unit: string },
  input: CoachingCompassInput,
  sport: "run" | "bike",
  formatTarget: (value: number) => string,
): LabReference | null {
  const ideal = IDEAL_KEYS.has(indicator.key)
    ? idealReference(indicator.key as IdealFactor, { objective: input.objectif, ambition: input.ambition, sport, age: input.athleteAge, sex: input.athleteSex })
    : null;
  if (ideal) {
    return { kind: "ideal", label: ideal.tier === "measured" ? "Idéal (mesuré)" : "Idéal (dérivé)", value: ideal.point,
      display: `${fmt(ideal.low)}–${fmt(ideal.high)} ${ideal.unit}`, tier: ideal.tier, basis: ideal.basis, adjustment: ideal.adjustment };
  }
  if (indicator.target == null) return null;
  return { kind: "coaching", label: "Repère TFCL (cible interne)", value: indicator.target, display: formatTarget(indicator.target), tier: null, basis: null, adjustment: null };
}
