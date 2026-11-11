export type Cycle = { name: string; description: string; date_start: string; date_end: string; id?: string };
export function overlapping(a: Cycle, b: Cycle) { return a.date_start <= b.date_end && b.date_start <= a.date_end; }
export function sameCycle(a: Cycle, b: Cycle) {
  return a.name === b.name && a.date_start === b.date_start && a.date_end === b.date_end && a.description === b.description;
}
export function classifyCycles(drafts: Cycle[], existing: Cycle[]) {
  return drafts.map(cycle => {
    const same = existing.find(e => sameCycle(cycle, e));
    if (same) return { cycle, state: 'existing' as const, id: same.id };
    if (existing.some(e => overlapping(cycle, e))) return { cycle, state: 'conflict' as const };
    return { cycle, state: 'create' as const };
  });
}