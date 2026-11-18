/** Include only an already linked or explicitly requested owner; never infer a new link by name. */
export function includeLinkedOwner<T extends { nolio_id: number }>(athletes: T[], profile: unknown, linkedIds: number[]): Array<T | { nolio_id: number; name: string }> {
  if (!profile || typeof profile !== 'object') return athletes;
  const p = profile as Record<string, unknown>;
  const id = Number(p.id ?? p.pk);
  if (!Number.isSafeInteger(id) || id <= 0 || !linkedIds.includes(id) || athletes.some(a => Number(a.nolio_id) === id)) return athletes;
  const name = [p.first_name, p.last_name].filter(v => typeof v === 'string').join(' ').trim();
  return [...athletes, { nolio_id: id, name: name || (typeof p.name === 'string' ? p.name : 'Mon compte Nolio') }];
}