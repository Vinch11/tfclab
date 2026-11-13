export function validTestDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
/** Coach declarations are necessary, never inferred from a test name or confidence. */
export function reviewedTte(raw: Record<string, unknown>, sport: string): boolean {
  const duration = raw.tte_minutes;
  return (sport === 'run' || sport === 'bike') && typeof duration === 'number' && Number.isFinite(duration) && duration > 0 && duration <= 120
    && raw.thresholdConfirmed === true && raw.continuousConfirmed === true && raw.exhaustionConfirmed === true
    && typeof raw.thresholdReference === 'string' && raw.thresholdReference.trim().length > 0
    && validTestDate(raw.thresholdDate) && validTestDate(raw.testDate)
    && raw.thresholdDate < raw.testDate && raw.protocolCapped !== true && raw.conditionsConfirmed === true;
}