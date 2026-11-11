import type { ParsedPlan } from '@/lib/aiPlanParser';
import { buildPhaseSegments, buildPlanTimeline } from './timeline/planTimeline';

export type NolioCycleDraft = { name: string; description: string; date_start: string; date_end: string };

/** One banner per existing phase; parallel workstreams stay inside its description. */
export function buildNolioCycles(plan: ParsedPlan, startDate: string): NolioCycleDraft[] {
  const date = new Date(`${startDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== startDate) return [];
  const weeks = buildPlanTimeline(plan);
  const day = (n: number) => { const d = new Date(date); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  return buildPhaseSegments(weeks, plan.phases).flatMap(seg => {
    const selected = plan.weeks.filter(w => w.weekNumber >= seg.start && w.weekNumber <= seg.end).sort((a, b) => a.weekNumber - b.weekNumber);
    if (!selected.length) return [];
    const first = selected[0].weekNumber, last = selected[selected.length - 1].weekNumber;
    const limiters = (plan.strategicRecap?.limiters ?? []).filter(l => {
      const nums = l.weeks.match(/\d+/g)?.map(Number) ?? [];
      return nums.length && nums[0] <= last && (nums[1] ?? nums[0]) >= first;
    }).sort((a, b) => a.rank - b.rank);
    const workstreams = limiters.map(l => `L${l.rank} · ${l.name} (${l.weeks})\n${l.block}${l.keySessions ? '\nSéances clés : ' + l.keySessions : ''}`);
    const themes = selected.filter(w => w.theme.trim()).map(w => `S${w.weekNumber} · ${w.theme}`);
    const names = [...new Set(limiters.map(l => l.name))];
    return [{
      name: `${seg.label}${names.length ? ' · ' + names.join(' / ') : ''}`.slice(0, 255),
      description: [`${plan.title} — S${first}–S${last}`, seg.objective, workstreams.length ? 'Chantiers\n' + workstreams.join('\n\n') : null, themes.join('\n')].filter(Boolean).join('\n\n').slice(0, 12000),
      date_start: day((first - 1) * 7), date_end: day(last * 7 - 1),
    }];
  });
}