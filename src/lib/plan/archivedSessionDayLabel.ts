const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
/** Display archived days without guessing Monday from a missing or invalid field. */
export function archivedSessionDayLabel(session: { dayName?: unknown; dayIndex?: unknown; day?: unknown }): string {
  const namedDay = (value: unknown) => typeof value === "string" ? DAYS.findIndex(d => d.toLowerCase() === value.trim().toLowerCase()) : -1;
  const indices = [namedDay(session.dayName), namedDay(session.day)];
  if (typeof session.dayIndex === "number" && Number.isInteger(session.dayIndex) && session.dayIndex >= 0 && session.dayIndex <= 6) indices.push(session.dayIndex);
  if (typeof session.day === "number" && Number.isInteger(session.day) && session.day >= 1 && session.day <= 7) indices.push(session.day - 1);
  const valid = [...new Set(indices.filter(i => i >= 0))];
  return valid.length === 1 ? DAYS[valid[0]] : valid.length > 1 ? "Jour incohérent" : "Jour non renseigné";
}
