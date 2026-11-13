import { useMemo, useState } from 'react';
import { ArrowUpRight, ChevronDown, Fingerprint, FlaskConical, Waves } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { completeProfile } from '@/lib/coachingCompass/completeProfile';
import { staffEvidenceRows } from '@/lib/coachingCompass/staffEvidence';
import { metricSourceLabel } from '@/lib/coachingCompass/presentation';
import type { CoachingCompassInput } from '@/lib/coachingCompass/types';
import type { DbSnapshot, DbTest } from '@/hooks/useCloudData';

export function CompletePhysiologicalProfile({ input, snapshot, tests }: { input: CoachingCompassInput; snapshot: DbSnapshot | null; tests: DbTest[] }) {
  const disciplines = useMemo(() => completeProfile(input, snapshot?.css ?? null), [input, snapshot]);
  const evidence = useMemo(() => input.athleteId ? staffEvidenceRows(input.athleteId, snapshot, tests) : [], [input.athleteId, snapshot, tests]);
  const [tab, setTab] = useState('profile');
  return <section className="border-t border-border pt-6 space-y-5" data-testid="complete-physiological-profile">
    <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold flex items-center gap-2"><Fingerprint className="h-5 w-5 text-primary" />Profil physiologique complet</h3><p className="text-sm text-muted-foreground mt-1">Valeurs, sources et limites · {snapshot?.date ?? 'Bilan absent'}</p></div><Button asChild variant="ghost" size="icon" aria-label="Ouvrir les tests"><Link to="/diagnostic/tests"><ArrowUpRight className="h-5 w-5" /></Link></Button></div>
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="w-full grid grid-cols-2"><TabsTrigger value="profile" className="min-h-11"><Waves className="h-4 w-4 mr-2" />Indicateurs</TabsTrigger><TabsTrigger value="evidence" className="min-h-11"><FlaskConical className="h-4 w-4 mr-2" />Tests & sources</TabsTrigger></TabsList>
      <TabsContent value="profile" className="space-y-6 mt-5">{disciplines.map(d => <section key={d.sport} className="space-y-3"><h4 className="text-sm font-semibold text-primary">{d.sport}</h4><div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">{d.indicators.map(i => <details key={i.key} className="group border-b border-border py-4">
        <summary className="list-none cursor-pointer min-h-11 flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium text-sm">{i.label}</p><p className="text-xs text-muted-foreground mt-1">{i.value == null ? 'Données insuffisantes' : metricSourceLabel(i.source).replace('📋 Bilan — provenance à confirmer', '📋 Valeur du bilan')}</p></div><div className="text-right shrink-0"><p className="text-xl font-semibold tabular-nums">{i.value == null ? '—' : i.unit === 's/km' ? `${Math.floor(i.value / 60)}:${String(Math.round(i.value % 60)).padStart(2, '0')}` : i.value.toLocaleString('fr-BE', { maximumFractionDigits: i.unit === 'mmol/L/s' ? 2 : 1 })}<span className="text-xs font-normal text-muted-foreground ml-1">{i.value != null ? i.unit === 's/km' ? '/km' : i.unit : ''}</span></p><ChevronDown className="h-3 w-3 ml-auto mt-1 text-muted-foreground group-open:rotate-180 motion-reduce:transition-none" /></div></summary>
        <div className="pt-3 text-sm text-muted-foreground leading-relaxed space-y-2"><p>{i.explanation}</p>{i.target != null && <p>Cible interne : {i.target} {i.unit}.</p>}</div>
      </details>)}</div></section>)}</TabsContent>
      <TabsContent value="evidence" className="mt-5 space-y-4"><div className="flex justify-between items-center gap-3"><p className="text-sm text-muted-foreground">{evidence.length} entrées enregistrées · protocole non certifié automatiquement</p><Button asChild variant="outline" size="sm"><Link to="/diagnostic/tests">Tests<ArrowUpRight className="h-4 w-4 ml-2" /></Link></Button></div>{evidence.length ? evidence.map((r, n) => <details key={`${r.date}-${r.label}-${n}`} className="border-b border-border pb-4"><summary className="cursor-pointer list-none min-h-11"><p className="text-xs text-muted-foreground">{r.date} · {r.sport}</p><p className="font-medium mt-1">{r.label}</p><p className="text-sm mt-1 break-words">{r.result}</p></summary><div className="mt-3 space-y-1 text-xs text-muted-foreground break-words"><p>{r.source}</p><p>{r.status}</p><p>{r.protocol}</p><p>{r.sensor}</p></div></details>) : <p className="text-sm text-muted-foreground py-6">Aucun résultat brut enregistré pour cet athlète.</p>}</TabsContent>
    </Tabs>
  </section>;
}