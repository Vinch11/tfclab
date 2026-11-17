import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import type { DbSnapshot, DbTest } from '@/hooks/useCloudData';
import type { CoachingCompassInput } from '@/lib/coachingCompass/types';
import { fitBikeOnNolio, fitRunOnNolio, monthsBefore, nolioEnvelope, NOLIO_BIKE_SPORTS, NOLIO_RUN_SPORTS, type NolioRecordRow } from '@/lib/lab/nolioCalibration';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LabNolioCalibration } from './LabNolioCalibration';
import { LabLoadCharacteristics } from './LabLoadCharacteristics';
import { PhysiologicalProfileCurves } from './PhysiologicalProfileCurves';
import { TestMeasurementCurves } from './TestMeasurementCurves';
import { BEVEL_CHART_COLORS as c, bevelAxisProps, bevelGridProps } from './bevelChartTheme';
import { labCurveSource } from '@/lib/lab/labProfile';

interface Props { input: CoachingCompassInput; snapshot: DbSnapshot; snapshots: DbSnapshot[]; tests: DbTest[]; selectedSport?: 'bike' | 'run' }

/** Read-only athlete evidence shared by Dashboard and Lab, never by Compass or plans. */
export function AthleteEvidenceCharts({ input, snapshot, snapshots, tests, selectedSport }: Props) {
  const [months, setMonths] = useState(24);
  const [selection, setSelection] = useState<'bike' | 'run'>('bike');
  const sport = selectedSport ?? (input.sportFocus === 'run' ? 'run' : input.sportFocus === 'triathlon' ? selection : 'bike');
  const [read, setRead] = useState<{ athlete: string; rows: NolioRecordRow[]; loading: boolean; error: boolean }>({ athlete: '', rows: [], loading: true, error: false });
  useEffect(() => {
    let alive = true;
    setRead({ athlete: snapshot.athlete_id, rows: [], loading: true, error: false });
    // Fetch all pages: a partial history must never masquerade as the period's best efforts.
    const load = async () => {
      const rows: NolioRecordRow[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('nolio_records').select('cat,record_type,sport_id,item_seconds,value,date_recorded').eq('athlete_id', snapshot.athlete_id).order('id').range(offset, offset + 499);
        if (error) throw error;
        rows.push(...(data ?? []) as NolioRecordRow[]);
        if (!data || data.length < 500) break;
      }
      if (alive) setRead({ athlete: snapshot.athlete_id, rows, loading: false, error: false });
    };
    load().catch(() => { if (alive) setRead({ athlete: snapshot.athlete_id, rows: [], loading: false, error: true }); });
    return () => { alive = false; };
  }, [snapshot.athlete_id]);
  const from = monthsBefore(snapshot.date, months);
  const periodSnapshots = useMemo(() => snapshots.filter(s => s.athlete_id === snapshot.athlete_id && s.date >= from && s.date <= snapshot.date), [snapshots, snapshot, from]);
  const periodTests = useMemo(() => tests.filter(t => t.athlete_id === snapshot.athlete_id && t.date.slice(0, 10) >= from && t.date.slice(0, 10) <= snapshot.date), [tests, snapshot, from]);
  const env = useMemo(() => nolioEnvelope(read.athlete === snapshot.athlete_id ? read.rows : [], sport === 'bike' ? 'ppr' : 'par', sport === 'bike' ? NOLIO_BIKE_SPORTS : NOLIO_RUN_SPORTS, snapshot.date, months), [read, snapshot, sport, months]);
  const bike = useMemo(() => sport === 'bike' ? fitBikeOnNolio(input, env) : null, [input, env, sport]);
  const run = useMemo(() => sport === 'run' ? fitRunOnNolio(env) : null, [env, sport]);
  const curve = labCurveSource(input, sport, bike, snapshot.date >= from);
  const loading = read.loading || read.athlete !== snapshot.athlete_id;
  const points = env.map(p => ({ seconds: p.durationSec, observed: p.value * (sport === 'run' ? 3.6 : 1), date: p.date, fitted: sport === 'run' && run && p.durationSec >= 180 && p.durationSec <= 1200 ? run.csKmh + run.dPrimeM / p.durationSec * 3.6 : bike?.points.find(v => v.durationSec === p.durationSec)?.fitted ?? null }));
  return <section className="space-y-6" aria-label="Graphiques personnels TFCL">
    <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-muted-foreground">Période : {from} → {snapshot.date}</span><Select value={String(months)} onValueChange={v => setMonths(Number(v))}><SelectTrigger aria-label="Période des données" className="w-40 min-h-11"><SelectValue /></SelectTrigger><SelectContent>{[6, 12, 24].map(m => <SelectItem key={m} value={String(m)}>{m} mois</SelectItem>)}</SelectContent></Select>
      {input.sportFocus === 'triathlon' && !selectedSport && <Tabs value={sport} onValueChange={v => { if (v === 'bike' || v === 'run') setSelection(v); }}><TabsList><TabsTrigger value="bike">Vélo</TabsTrigger><TabsTrigger value="run">Course à pied</TabsTrigger></TabsList></Tabs>}
    </div>
    {read.error && <p role="alert" className="text-sm text-destructive">Lecture Nolio incomplète : courbes Nolio suspendues.</p>}
    <LabNolioCalibration sport={sport} bike={bike} run={run} checks={[]} loading={loading} recordCount={env.length} windowMonths={months} range={`${from} → ${snapshot.date}`} />
    <section className="border-y border-border py-5 space-y-3"><h3 className="text-xl font-semibold">{sport === 'bike' ? 'Puissance' : 'Vitesse'}–durée · records Nolio</h3>
      {loading ? <p className="text-sm text-muted-foreground">Lecture des records…</p> : !points.length ? <p className="text-sm text-muted-foreground">Aucun record Nolio daté sur cette période. Les résultats enregistrés dans le bilan restent disponibles ci-dessous.</p> : <><div className="h-64"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={points} margin={{ top: 10, right: 15, bottom: 10, left: 0 }}><CartesianGrid {...bevelGridProps} /><XAxis dataKey="seconds" type="number" scale="log" domain={['dataMin', 'dataMax']} tickFormatter={s => `${Number(s) < 60 ? s + ' s' : Math.round(Number(s) / 60) + ' min'}`} {...bevelAxisProps} /><YAxis width={56} {...bevelAxisProps} domain={['auto', 'auto']} /><Tooltip labelFormatter={s => `${s} s`} formatter={(v: number, n: string) => [`${v.toFixed(1)} ${sport === 'bike' ? 'W' : 'km/h'}`, n]} /><Scatter dataKey="observed" name="Record Nolio" fill={c.amber} isAnimationActive={false} /><Line dataKey="fitted" name="Courbe TFCL personnalisée" stroke={c.periwinkle} dot={false} connectNulls={false} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th>Durée</th><th>Record</th><th>Date Nolio</th></tr></thead><tbody>{points.map(p => <tr key={p.seconds} className="border-t border-border"><td className="py-2">{p.seconds} s</td><td>{p.observed.toFixed(1)} {sport === 'bike' ? 'W' : 'km/h'}</td><td>{p.date}</td></tr>)}</tbody></table></div></>}
    </section>
    {curve && <><p className="text-sm text-muted-foreground">{curve.source === 'nolio' ? 'Courbes personnalisées sur les records Nolio de la période.' : `Courbes personnalisées sur vos valeurs TFCL du bilan du ${snapshot.date}. Le recalage Nolio est complémentaire, pas obligatoire.`}</p><LabLoadCharacteristics input={curve.input} snapshot={snapshot} sport={sport} /></>}
    {!curve && <p className="text-sm text-muted-foreground">Le calcul métabolique attend des valeurs enregistrées de VO₂max, poids et VLamax pour ce sport. Un test réalisé mais non enregistré doit être récupéré, pas remplacé par une valeur inventée.</p>}
    <PhysiologicalProfileCurves input={input} snapshots={periodSnapshots} snapshot={snapshot} selectedSport={sport} tfclLabels hideExploratory />
    <TestMeasurementCurves tests={periodTests} athleteId={snapshot.athlete_id} />
    <p className="text-xs text-muted-foreground">Les points puissance–durée sont les records Nolio datés. Les courbes métaboliques sont des calculs TFCL personnalisés, pas des prélèvements de lactate ou des mesures d’oxygène. Analyse des séances Nolio et cardio : non intégrée dans ces graphiques.</p>
  </section>;
}