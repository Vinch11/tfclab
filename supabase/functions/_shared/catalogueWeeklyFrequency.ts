/** Existing intra-week limits shared by coverage and final validation.
 * No repetition is prescribed here: capacity alone does not prove the dose,
 * role, sequence or recovery of a complete plan is appropriate. */
export function isOneTimeTestProtocol(entry: { tags?: readonly string[] }): boolean {
  return (entry.tags || []).some(tag => String(tag).toLowerCase() === "test");
}

/** Same explicit "Nx/semaine max" rule as the existing final validator. */
export function parseWeeklyFrequencyCap(when: string | undefined | null): number | null {
  if (!when) return null;
  const match = /(\d+)\s*x\s*\/\s*semaine\s*max/i.exec(when);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function catalogueWeeklyUsageCapacity(entry: { tags?: readonly string[]; when?: string | null }): number {
  return isOneTimeTestProtocol(entry) ? 1 : parseWeeklyFrequencyCap(entry.when) ?? Infinity;
}
