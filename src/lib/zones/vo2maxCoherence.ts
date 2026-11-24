/**
 * VO₂max ≈ 3,5 × VMA (km/h) (Léger et Mercier). Un écart de plus de 10 % signale le plus souvent une
 * VO₂max de montre : elle ne doit alors ni être présentée comme un point d'appui, ni piloter un calcul.
 */
export const VO2MAX_PER_VMA = 3.5;
export const VO2MAX_VMA_TOLERANCE = 0.1;

export function vo2maxFromVma(vmaKmh: number): number {
  return VO2MAX_PER_VMA * vmaKmh;
}

/** true si la VO₂max saisie s'écarte de plus de 10 % de celle attendue pour la VMA. */
export function vo2maxVmaMismatch(vo2max: number | null | undefined, vmaKmh: number | null | undefined): boolean {
  if (!(typeof vo2max === "number" && vo2max > 0 && typeof vmaKmh === "number" && vmaKmh > 0)) return false;
  const expected = vo2maxFromVma(vmaKmh);
  return Math.abs(vo2max - expected) / expected > VO2MAX_VMA_TOLERANCE;
}
