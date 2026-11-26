/**
 * Tolérance glucides testée à l'entraînement (g/h), propre à l'athlète (pas au bilan) :
 * c'est la vraie limite pratique de l'apport en course. Rangée dans athletes.refs.carbTolerance.
 */
export interface CarbTolerance { gh: number; date: string | null }
export const CARB_TOLERANCE_OPTIONS = [45, 60, 75, 90, 105, 120] as const;

export function readCarbTolerance(refs: unknown): CarbTolerance | null {
  const v = refs && typeof refs === "object" ? (refs as Record<string, unknown>).carbTolerance : null;
  if (!v || typeof v !== "object") return null;
  const gh = (v as Record<string, unknown>).gh;
  const date = (v as Record<string, unknown>).date;
  return typeof gh === "number" && gh > 0 && gh <= 150 ? { gh, date: typeof date === "string" ? date : null } : null;
}

export function withCarbTolerance(refs: unknown, gh: number | null, date: string): Record<string, unknown> {
  const base = refs && typeof refs === "object" && !Array.isArray(refs) ? { ...(refs as Record<string, unknown>) } : {};
  if (gh == null) { delete base.carbTolerance; return base; }
  return { ...base, carbTolerance: { gh, date } };
}
