import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAthletes } from '@/contexts/AthleteContext';
import { useCloudDataContext } from '@/contexts/CloudDataContext';
import { pickReferenceSnapshot } from '@/lib/referenceSnapshot';
import { criticalForSessions, parseStoredCriticalMetrics, type StoredCriticalSport } from '@/lib/criticalMetrics';
import type { CriticalSport } from '@/lib/criticalEfforts';

const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const pace = (mps: number) => fmtDur(1000 / mps);

function SportCard({ sport, m, onReview }: { sport: CriticalSport; m?: StoredCriticalSport; onReview: (r: StoredCriticalSport['coachReview']) => Promise<void> }) {
  const [verdict, setVerdict] = useState<'valid' | 'reserve' | 'reject'>(m?.coachReview?.verdict ?? 'reserve');
  const [text, setText] = useState(m?.coachReview?.text ?? '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setVerdict(m?.coachReview?.verdict ?? 'reserve'); setText(m?.coachReview?.text ?? ''); }, [m?.coachReview?.verdict, m?.coachReview?.text]);
  const run = sport === 'running';
  const today = new Date().toISOString().slice(0, 10);
  const usable = m ? criticalForSessions({ [sport]: m }, sport, today) : null;
  return <Card>
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
      <CardTitle className="text-lg">{run ? 'Course · Vitesse critique / D′' : 'Vélo · Puissance critique / W′'}</CardTitle>
      {m && <Badge variant={m.status === 'confirmed' ? 'default' : 'secondary'}>{m.status === 'confirmed' ? 'Tests confirmés' : 'Estimation à vérifier'}</Badge>}
    </CardHeader>
    <CardContent className="space-y-4">
      {!m ? <p className="text-sm text-muted-foreground">Données insuffisantes. Enregistre des efforts dans le bilan, section « Repères critiques ».</p> : <>
        <dl className="grid grid-cols-2 gap-4">
          <div><dt className="text-sm text-muted-foreground">{run ? 'Vitesse critique' : 'Puissance critique'}</dt><dd className="text-2xl font-semibold">{run ? `${(m.critical * 3.6).toFixed(2)} km/h` : `${Math.round(m.critical)} W`}</dd>{run && <dd className="text-sm">{pace(m.critical)} min/km</dd>}</div>
          <div><dt className="text-sm text-muted-foreground">{run ? 'D′' : 'W′'}</dt><dd className="text-2xl font-semibold">{run ? `${Math.round(m.reserve)} m` : `${(m.reserve / 1000).toFixed(1)} kJ`}</dd></div>
        </dl>
        <p className="text-xs text-muted-foreground">R² {m.r2 === null ? 'non vérifiable' : m.r2.toFixed(4)} · écart max {m.residualPct.toFixed(1)} % · sensibilité {m.sensitivityPct === null ? 'non vérifiable' : `${m.sensitivityPct.toFixed(1)} %`} · enregistré le {m.savedAt}</p>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-2 pr-3">Date</th><th className="pr-3">Durée</th><th className="pr-3">{run ? 'Distance' : 'Puissance'}</th><th className="pr-3">Séance / conditions</th><th>Statut</th></tr></thead>
          <tbody>{m.efforts.map(e => <tr key={e.id} className="border-b border-border"><td className="py-2 pr-3">{e.date || '—'}</td><td className="pr-3">{fmtDur(e.durationSec)}</td><td className="pr-3">{run ? `${Math.round(e.value)} m (${pace(e.value / e.durationSec)}/km)` : `${Math.round(e.value)} W`}</td><td className="pr-3">{[e.session, e.conditions].filter(Boolean).join(' · ') || '—'}</td><td>{e.confirmed ? 'Confirmé' : 'Non confirmé'} · {e.source === 'nolio' ? 'Nolio' : 'Manuel'}</td></tr>)}</tbody>
        </table></div>
        {m.warnings.map(w => <p key={w} className="text-sm text-destructive">{w}</p>)}
        <p className="text-sm">Ajustements de séances : {usable?.value ? 'proposés dans le plan, à accepter un par un.' : usable?.reason}</p>
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="font-medium">Avis du coach</h3>
          <RadioGroup value={verdict} onValueChange={v => setVerdict(v as typeof verdict)} className="flex flex-wrap gap-4">
            {([['valid', 'Valide'], ['reserve', 'Avec réserves'], ['reject', 'À écarter']] as const).map(([v, l]) => <div key={v} className="flex min-h-11 items-center gap-2"><RadioGroupItem value={v} id={`${sport}-${v}`} /><Label htmlFor={`${sport}-${v}`}>{l}</Label></div>)}
          </RadioGroup>
          <Textarea aria-label={`Avis du coach ${run ? 'course' : 'vélo'}`} placeholder="Qualité des tests, conditions, usage recommandé…" value={text} onChange={e => setText(e.target.value)} />
          <p className="text-xs text-muted-foreground">« À écarter » bloque les propositions d’ajustement. « Valide » ne transforme pas une estimation en test confirmé.</p>
          <div className="flex flex-wrap items-center gap-3"><Button disabled={saving} onClick={async () => { setSaving(true); await onReview({ verdict, text: text.trim(), date: today }); setSaving(false); }}>Enregistrer l’avis</Button>{m.coachReview && <span className="text-xs text-muted-foreground">Dernier avis le {m.coachReview.date}</span>}</div>
        </div>
      </>}
    </CardContent>
  </Card>;
}

export default function CriticalMetricsPage() {
  const navigate = useNavigate();
  const { currentAthlete } = useAthletes();
  const { snapshots, updateSnapshot } = useCloudDataContext();
  const snap = pickReferenceSnapshot(snapshots, currentAthlete?.id, (currentAthlete as { active_snapshot_id?: string | null } | null)?.active_snapshot_id ?? null);
  const metrics = parseStoredCriticalMetrics((snap as { critical_metrics?: unknown } | null)?.critical_metrics);
  const save = async (sport: CriticalSport, review: StoredCriticalSport['coachReview']) => {
    if (!snap || !metrics[sport]) return;
    const next = { ...metrics, [sport]: { ...metrics[sport]!, coachReview: review } };
    await updateSnapshot(snap.id, { critical_metrics: next as never });
  };
  return <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
    <header className="space-y-1">
      <h1 className="text-2xl font-semibold">Puissance et vitesse critiques</h1>
      <p className="text-sm text-muted-foreground">{currentAthlete ? `${currentAthlete.nom} · bilan de référence ${snap?.date ?? 'absent'}` : 'Choisis un athlète.'}</p>
      <p className="text-xs text-muted-foreground">Repères complémentaires à LT1/MLSS : utiles pour les intervalles de 2 à 15 min au-dessus du seuil critique, sans mesurer la durabilité.</p>
    </header>
    {!snap ? <p className="text-sm">Données insuffisantes : aucun bilan pour cet athlète.</p> : <div className="grid gap-6 lg:grid-cols-2">
      <SportCard sport="cycling" m={metrics.cycling} onReview={r => save('cycling', r)} />
      <SportCard sport="running" m={metrics.running} onReview={r => save('running', r)} />
    </div>}
    <Button variant="outline" onClick={() => navigate('/')}>Modifier les efforts dans le bilan</Button>
  </main>;
}
