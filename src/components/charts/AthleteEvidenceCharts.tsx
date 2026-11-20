import { clock } from '@/lib/lab/coachReview';
import { LabPeriodComparison } from './LabPeriodComparison';
import { LabSessionReview } from './LabSessionReview';
import { labProfile } from '@/lib/lab/labProfile';
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
import { readLabPeriodRecords } from '@/lib/lab/periodRecords';
import { Input } from '@/components/ui/input';

interface Props { input: CoachingCompassInput; snapshot: DbSnapshot; snapshots: DbSnapshot[]; tests: DbTest[]; selectedSport?: 'bike' | 'run' }

/** Read-only athlete evidence shared by Dashboard and Lab, never by Compass or plans. */
export function AthleteEvidenceCharts({ input, snapshot, snapshots, tests, selectedSport, athleteName, labReview, baseline }: Props & { athleteName?: string; labReview?: boolean; baseline?: DbSnapshot }) {
  const [months, setMonths] = useState(labReview ? 1 : 24);
  const [dates, setDates] = useState<{ from: string; to: string } | null>(null);
  const [nolioAthlete, setNolioAthlete] = useState('');
  const [catalogue, setCatalogue] = useState<{ id: string; name: string; has_api_access: boolean; is_self?: boolean }[]>([]);
  const [catalogueError, setCatalogueError] = useState(false);
  const from = dates?.from ?? monthsBefore(snapshot.date, months);
  const to = dates?.to ?? snapshot.date;
  const call = async (body: Record<string, string>) => {
    const { data, error } = await supabase.functions.invoke('nolio-v2-oauth', { body });
    if (error) throw error;
    return data;
  };
  useEffect(() => {
    let alive = true;
    setNolioAthlete('');
    setCatalogue([]);
    setCatalogueError(false);
    setDates(null);
    call({ action: 'catalogues' }).then(data => {
      if (!data.complete) throw new Error('Catalogue incomplet');
      if (!alive) return;
      setCatalogue(data.athletes);
      const norm = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
      const same = athleteName ? data.athletes.filter((a: { name: string; has_api_access: boolean }) => a.has_api_access && norm(a.name) === norm(athleteName)) : [];
      if (same.length === 1) setNolioAthlete(same[0].id);
    }).catch(() => { if (alive) setCatalogueError(true); });
    return () => { alive = false; };
  }, [snapshot.athlete_id, athleteName]);
  const [selection, setSelection] = useState<'bike' | 'run'>('bike');
  const sport = selectedSport ?? (input.sportFocus === 'run' ? 'run' : input.sportFocus === 'triathlon' ? selection : 'bike');
  const [read, setRead] = useState<{ athlete: string; rows: NolioRecordRow[]; loading: boolean; error: boolean }>({ athlete: '', rows: [], loading: true, error: false });
  const scope = [snapshot.athlete_id,nolioAthlete,sport,from,to].join("|");
  useEffect(() => {
    let alive = true;
    setRead({ athlete: scope, rows: [], loading: !!nolioAthlete && !!from && !!to && from <= to, error: false });
    if (!nolioAthlete || !from || !to || from > to) return;
    const load = async () => {
      const rows = await readLabPeriodRecords(nolioAthlete, sport, from, to, call);
      if (alive) setRead({ athlete: scope, rows, loading: false, error: false });
    };
    load().catch(() => { if (alive) setRead({ athlete: scope, rows: [], loading: false, error: true }); });
    return () => { alive = false; };
  }, [scope, nolioAthlete, sport, from, to]);
  const periodSnapshots = useMemo(() => snapshots.filter(s => s.athlete_id === snapshot.athlete_id && s.date >= from && s.date <= to), [snapshots, snapshot, from, to]);
  const periodTests = useMemo(() => tests.filter(t => t.athlete_id === snapshot.athlete_id && t.date.slice(0, 10) >= from && t.date.slice(0, 10) <= to), [tests, snapshot, from, to]);
  const env = useMemo(() => nolioEnvelope(read.athlete === scope ? read.rows : [], sport === 'bike' ? 'ppr' : 'par', sport === 'bike' ? NOLIO_BIKE_SPORTS : NOLIO_RUN_SPORTS, to, months, from), [read, scope, sport, months, from, to]);
  const bike = useMemo(() => sport === 'bike' ? fitBikeOnNolio(input, env) : null, [input, env, sport]);
  const run = useMemo(() => sport === 'run' ? fitRunOnNolio(env) : null, [env, sport]);
  const curve = labCurveSource(input, sport, bike, snapshot.date >= from && snapshot.date <= to);
  const compare = useMemo(() => baseline ? { input: labProfile(baseline,tests,input.objectif,input.ambition), date: baseline.date } : undefined, [baseline, tests, input.objectif, input.ambition]);
  const loading = read.loading || read.athlete !== scope;
  const recordLabel = (v:number) => sport === 'bike' ? Math.round(v)+' W' : labReview ? clock(3600 / v)+'/km' : v.toFixed(1)+' km/h';
  const points = env.map(p => ({ seconds: p.durationSec, observed: p.value * (sport === 'run' ? 3.6 : 1), date: p.date, fitted: sport === 'run' && run && p.durationSec >= 180 && p.durationSec <= 1200 ? run.csKmh + run.dPrimeM / p.durationSec * 3.6 : bike?.points.find(v => v.durationSec === p.durationSec)?.fitted ?? null }));
  return <section className="space-y-6" aria-label="Graphiques personnels TFCL">
    <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-muted-foreground">Période : {from} → {to}</span><Select value={dates ? 'custom' : String(months)} onValueChange={v => { if (v === 'custom') setDates({ from, to }); else { setMonths(Number(v)); setDates(null); } }}><SelectTrigger aria-label="Période des données" className="w-40 min-h-11"><SelectValue /></SelectTrigger><SelectContent>{[1, 3, 6, 12, 24].map(m => <SelectItem key={m} value={String(m)}>{m} mois</SelectItem>)}<SelectItem value="custom">Dates au choix</SelectItem></SelectContent></Select>
      {input.sportFocus === 'triathlon' && !selectedSport && <Tabs value={sport} onValueChange={v => { if (v === 'bike' || v === 'run') setSelection(v); }}><TabsList><TabsTrigger value="bike">Vélo</TabsTrigger><TabsTrigger value="run">Course à pied</TabsTrigger></TabsList></Tabs>}
    </div>
    <div className="flex flex-wrap items-end gap-3">
      {dates && <><label className="text-sm">Du<Input aria-label="Début de période des graphiques" type="date" value={from} max={to} onChange={e => setDates({ from: e.target.value, to })} /></label>
      <label className="text-sm">Au<Input aria-label="Fin de période des graphiques" type="date" value={to} min={from} max={new Date().toISOString().slice(0, 10)} onChange={e => setDates({ from, to: e.target.value })} /></label></>}
      <Select value={nolioAthlete} onValueChange={setNolioAthlete}><SelectTrigger aria-label="Compte Nolio de l’athlète" className="w-full sm:w-64 min-h-11"><SelectValue placeholder={athleteName ? `Relier le compte Nolio de ${athleteName}` : 'Relier le compte Nolio'} /></SelectTrigger><SelectContent>{catalogue.filter(a => a.has_api_access).map(a => <SelectItem key={a.id} value={a.id}>{a.name}{a.is_self ? ' · Mon compte' : ''}</SelectItem>)}</SelectContent></Select>
    </div>
    {nolioAthlete && athleteName && catalogue.length > 0 && catalogue.find(a => a.id === nolioAthlete)?.name.trim().toLowerCase() !== athleteName.trim().toLowerCase() && <p role="alert" className="text-sm text-destructive">Le compte Nolio choisi ne porte pas le nom de {athleteName} : vérifie qu’il s’agit bien du même athlète.</p>}
    {catalogueError && <p role="alert" className="text-sm text-destructive">Connexion Nolio indisponible : aucun record absolu utilisé à la place.</p>}
    {read.error && <p role="alert" className="text-sm text-destructive">Lecture Nolio incomplète : courbes Nolio suspendues.</p>}
    <LabNolioCalibration sport={sport} bike={bike} run={run} checks={[]} loading={loading} recordCount={env.length} windowMonths={dates ? 0 : months} range={`${from} → ${to}`} />
    <section className="border-y border-border py-5 space-y-3"><h3 className="text-xl font-semibold">{sport === 'bike' ? 'Puissance' : 'Vitesse'}–durée · records Nolio</h3>
      {loading ? <p className="text-sm text-muted-foreground">Lecture des records…</p> : !points.length ? <p className="text-sm text-muted-foreground">Aucun record Nolio daté sur cette période. Les résultats enregistrés dans le bilan restent disponibles ci-dessous.</p> : <><div className="h-64"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={points} margin={{ top: 10, right: 15, bottom: 10, left: 0 }}><CartesianGrid {...bevelGridProps} /><XAxis dataKey="seconds" type="number" scale="log" domain={['dataMin', 'dataMax']} tickFormatter={s => `${Number(s) < 60 ? s + ' s' : Math.round(Number(s) / 60) + ' min'}`} {...bevelAxisProps} /><YAxis width={56} tickFormatter={sport === 'run' && labReview ? recordLabel : undefined} {...bevelAxisProps} domain={['auto', 'auto']} /><Tooltip labelFormatter={s => `${s} s`} formatter={(v: number, n: string) => [recordLabel(v), n]} /><Scatter dataKey="observed" name="Record Nolio" fill={c.amber} isAnimationActive={false} /><Line dataKey="fitted" name="Courbe TFCL personnalisée" stroke={c.periwinkle} dot={false} connectNulls={false} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th>Durée</th><th>Record</th><th>Date Nolio</th></tr></thead><tbody>{points.map(p => <tr key={p.seconds} className="border-t border-border"><td className="py-2">{p.seconds} s</td><td>{recordLabel(p.observed)}</td><td>{p.date}</td></tr>)}</tbody></table></div></>}
    </section>
    {labReview && from && to && from <= to && <>
      {nolioAthlete && !loading && !read.error && <LabPeriodComparison key={scope} athlete={nolioAthlete} owner={snapshot.athlete_id} snapshots={snapshots} ambition={input.ambition} sport={sport} from={from} to={to} latest={env} goal={input.objectif}/>}
      <LabSessionReview key={scope} athlete={nolioAthlete} sport={sport} goal={input.objectif} tri={input.sportFocus === 'triathlon'} raw={snapshot.critical_metrics} from={from} to={to}/>
    </>}
    <div id={labReview ? 'lab-metabolisme' : undefined}/>
    {curve && <><p className="text-sm text-muted-foreground">{curve.source === 'nolio' ? 'Courbes personnalisées sur les records Nolio de la période.' : `Courbes personnalisées sur vos valeurs TFCL du bilan du ${snapshot.date}. Le recalage Nolio est complémentaire, pas obligatoire.`}</p><LabLoadCharacteristics compare={curve.source === 'bilan' ? compare : undefined} coachReading={labReview} input={curve.input} snapshot={snapshot} sport={sport} /></>}
    {!curve && <p className="text-sm text-muted-foreground">Le calcul métabolique attend des valeurs enregistrées de VO₂max, poids et VLamax pour ce sport. Un test réalisé mais non enregistré doit être récupéré, pas remplacé par une valeur inventée.</p>}
    <PhysiologicalProfileCurves input={input} snapshots={periodSnapshots} snapshot={snapshot} selectedSport={sport} tfclLabels hideExploratory />
    <TestMeasurementCurves tests={periodTests} athleteId={snapshot.athlete_id} />
    <p className="text-xs text-muted-foreground">Les points puissance–durée sont les records Nolio datés. Les courbes métaboliques sont des calculs TFCL personnalisés, pas des prélèvements de lactate ou des mesures d’oxygène. {labReview ? 'Les tours et la fréquence cardiaque disponibles se lisent dans la section Tenue de l’effort.' : ''}</p>
  </section>;
}