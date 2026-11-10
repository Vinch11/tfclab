import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ParsedPlan, ParsedSession } from '@/lib/aiPlanParser';
import { criticalForSessions, parseStoredCriticalMetrics } from '@/lib/criticalMetrics';
import { ACCEPTED_MARKER, acceptanceNote, detectBikeIntervals, detectRunIntervals, proposeForInterval, type CriticalProposal } from '@/lib/criticalIntervalProposals';
import { isCyclingSession } from '@/engines/plan/wbalPostProcessor';

const isRun = (s: ParsedSession) => /course|run|cap\b|à pied/i.test(s.sport);

interface Row { key: string; week: number; day: string; title: string; proposal: CriticalProposal; w: number; si: number }

export function CriticalSessionProposals({ plan, criticalMetrics, ftp, onAccept }: { plan: ParsedPlan; criticalMetrics: unknown; ftp: number | null; onAccept?: (plan: ParsedPlan) => void }) {
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const today = new Date().toISOString().slice(0, 10);
  const metrics = useMemo(() => parseStoredCriticalMetrics(criticalMetrics), [criticalMetrics]);
  const bike = criticalForSessions(metrics, 'cycling', today), run = criticalForSessions(metrics, 'running', today);
  const rows = useMemo(() => {
    const out: Row[] = [];
    plan.weeks.forEach((week, w) => week.sessions.forEach((s, si) => {
      if (s.isRest || s.details.includes(ACCEPTED_MARKER)) return;
      const text = `${s.title}. ${s.details}`;
      const sport = isCyclingSession(s) ? 'cycling' : isRun(s) ? 'running' : null;
      const m = sport === 'cycling' ? bike.value : sport === 'running' ? run.value : null;
      if (!sport || !m) return;
      const intervals = sport === 'cycling' ? detectBikeIntervals(text, ftp, m.critical) : detectRunIntervals(text);
      intervals.forEach((i, ii) => {
        const p = proposeForInterval(i, m, sport);
        if (p && p.kind !== 'consistent') out.push({ key: `${week.weekNumber}-${si}-${ii}`, week: week.weekNumber, day: s.dayName, title: s.title, proposal: p, w, si });
      });
    }));
    return out;
  }, [plan, bike.value, run.value, ftp]);
  const visible = rows.filter(r => !ignored.has(r.key));
  const accept = (r: Row) => {
    const m = r.proposal.sport === 'cycling' ? bike.value! : run.value!;
    const weeks = plan.weeks.map((wk, w) => w !== r.w ? wk : { ...wk, sessions: wk.sessions.map((s, si) => si !== r.si ? s : { ...s, details: `${s.details}\n${acceptanceNote(r.proposal, m)}` }) });
    onAccept?.({ ...plan, weeks });
  };
  return <details className="rounded-lg border border-border p-3">
    <summary className="cursor-pointer text-sm font-medium">Ajustements proposés · CP/W′ vélo et VC/D′ course {visible.length > 0 && <Badge variant="secondary" className="ml-2">{visible.length}</Badge>}</summary>
    <div className="mt-3 space-y-3">
      <p className="text-xs text-muted-foreground">Vélo : {bike.reason ?? 'repères validés'} · Course : {run.reason ?? 'repères validés'}. Intervalles de 2 à 15 min au-dessus du repère critique uniquement. Rien n’est modifié sans ton accord ; LT1/MLSS restent les références des autres séances.</p>
      {!visible.length && <p className="text-sm">Aucun ajustement proposé.</p>}
      {visible.map(r => <div key={r.key} className="space-y-2 border-t border-border pt-3">
        <p className="text-sm font-medium">S{r.week} · {r.day} · {r.title}</p>
        <p className="text-sm">{r.proposal.message}{r.proposal.indicative && <span className="text-muted-foreground"> Récupération course indicative (modèle non validé en course).</span>}</p>
        <p className="text-xs text-muted-foreground">{r.proposal.interval.text} · {Math.round(r.proposal.repFraction * 100)} % de la réserve par répétition</p>
        <div className="flex flex-wrap gap-2">{onAccept && <Button size="sm" onClick={() => accept(r)}>Accepter</Button>}<Button size="sm" variant="outline" onClick={() => setIgnored(prev => new Set([...prev, r.key]))}>Ignorer</Button></div>
      </div>)}
    </div>
  </details>;
}
