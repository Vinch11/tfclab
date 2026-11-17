import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LabNolioCalibration } from '@/components/charts/LabNolioCalibration';
import { NOLIO_BIKE_SPORTS, NOLIO_RUN_SPORTS, coherenceChecks, fitBikeOnNolio, fitRunOnNolio, nolioEnvelope, type NolioRecordRow } from '@/lib/lab/nolioCalibration';
import { Link } from 'react-router-dom';
import { FlaskConical, ArrowLeft, Loader2 } from 'lucide-react';
import { useAthletes } from '@/contexts/AthleteContext';
import { useCloudDataContext } from '@/contexts/CloudDataContext';
import { pickReferenceSnapshot } from '@/lib/referenceSnapshot';
import { labProfile } from '@/lib/lab/labProfile';
import { completeProfile } from '@/lib/coachingCompass/completeProfile';
import { PhysiologicalProfileCurves } from '@/components/charts/PhysiologicalProfileCurves';
import { LabLoadCharacteristics } from '@/components/charts/LabLoadCharacteristics';
import { PowerDurationUnifiedChart } from '@/components/charts/PowerDurationUnifiedChart';
import { TestMeasurementCurves } from '@/components/charts/TestMeasurementCurves';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LabPage() {
  const { currentAthlete, visibleAthletes, setSelectedAthleteId } = useAthletes();
  const { snapshots, tests, loading } = useCloudDataContext();
  const [selection, setSelection] = useState<'bike' | 'run'>('bike');
  const snapshot = useMemo(() => currentAthlete ? pickReferenceSnapshot(snapshots, currentAthlete.id, currentAthlete.active_snapshot_id) : null, [snapshots, currentAthlete]);
  const input = useMemo(() => snapshot ? labProfile(snapshot, tests, currentAthlete?.objectif ?? '', currentAthlete?.ambition ?? '') : null, [snapshot, tests, currentAthlete]);
  const [compareId, setCompareId] = useState('none');
  const others = useMemo(() => currentAthlete ? snapshots.filter(s => s.athlete_id === currentAthlete.id && s.id !== snapshot?.id).sort((a, b) => b.date.localeCompare(a.date)) : [], [snapshots, currentAthlete, snapshot]);
  const compare = useMemo(() => { const s = others.find(o => o.id === compareId); return s ? { input: labProfile(s, tests, currentAthlete?.objectif ?? '', currentAthlete?.ambition ?? ''), date: s.date } : null; }, [others, compareId, tests, currentAthlete]);
  const [records, setRecords] = useState<NolioRecordRow[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [windowMonths, setWindowMonths] = useState(24);
  const [recalibrated, setRecalibrated] = useState(true);
  useEffect(() => {
    if (!currentAthlete) return;
    let alive = true; setRecordsLoading(true); setRecords([]);
    supabase.from('nolio_records').select('cat, record_type, sport_id, item_seconds, value, date_recorded').eq('athlete_id', currentAthlete.id).then(({ data }) => { if (alive) { setRecords((data ?? []) as NolioRecordRow[]); setRecordsLoading(false); } });
    return () => { alive = false; };
  }, [currentAthlete]);
  const nolio = useMemo(() => {
    if (!input || !snapshot) return null;
    const bikeEnv = nolioEnvelope(records, 'ppr', NOLIO_BIKE_SPORTS, snapshot.date, windowMonths);
    const runEnv = nolioEnvelope(records, 'par', NOLIO_RUN_SPORTS, snapshot.date, windowMonths);
    const hrEnv = nolioEnvelope(records, 'phrr', null, snapshot.date, windowMonths);
    const bike = fitBikeOnNolio(input, bikeEnv), run = fitRunOnNolio(runEnv);
    return { bike, run, checks: coherenceChecks(input, snapshot, bike, bikeEnv, run, hrEnv), count: bikeEnv.length + runEnv.length + hrEnv.length, range: (() => { const d = [...bikeEnv, ...runEnv].map(p => p.date).filter(Boolean).sort() as string[]; return d.length ? `records du ${d[0]} au ${d[d.length - 1]}` : null; })() };
  }, [records, input, snapshot, windowMonths]);
  const sport = input?.sportFocus === 'triathlon' ? selection : input?.sportFocus === 'run' ? 'run' : 'bike';
  const chartInput = useMemo(() => input && sport === 'bike' && recalibrated && nolio?.bike ? { ...input, vo2max: nolio.bike.vo2max, vlamaxEffectif: { ...input.vlamaxEffectif, value: nolio.bike.vlamax } } : input, [input, sport, recalibrated, nolio]);
  const disciplines = useMemo(() => input ? completeProfile(input, snapshot?.css ?? null) : [], [input, snapshot]);
  const indicators = disciplines.find(d => d.sport === (sport === 'run' ? 'Course à pied' : 'Vélo'))?.indicators ?? [];
  return <div className="min-h-screen bg-background pb-24">
    <header className="border-b border-border"><div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><Button asChild variant="ghost" size="icon" aria-label="Revenir au Dashboard"><Link to="/"><ArrowLeft className="h-5 w-5" /></Link></Button><FlaskConical className="h-6 w-6 text-primary" /><h1 className="text-2xl font-bold">100%lab</h1></div><Select value={currentAthlete?.id ?? ''} onValueChange={id => { setSelectedAthleteId(id); setSelection('bike'); setCompareId('none'); }}><SelectTrigger aria-label="Athlète du laboratoire" className="w-full sm:w-64 min-h-11"><SelectValue placeholder="Choisir un athlète" /></SelectTrigger><SelectContent>{visibleAthletes.map(a => <SelectItem key={a.id} value={a.id}>{a.nom}</SelectItem>)}</SelectContent></Select></div></header>
    <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      <section className="space-y-3"><p className="text-xs font-semibold text-primary">TFCLAB · PROFIL MÉTABOLIQUE</p><h2 className="text-3xl font-bold">{currentAthlete?.nom ?? 'Votre laboratoire'}</h2><p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">Vos valeurs TFCL · bilan du {snapshot?.date ?? '—'}.</p></section>
      {loading ? <Loader2 aria-label="Chargement des bilans" className="h-6 w-6 animate-spin text-primary" /> : !input || !snapshot ? <section className="border-y border-border py-12"><h3 className="text-lg font-semibold">Aucun bilan disponible</h3><p className="text-muted-foreground mt-2">Les courbes nécessitent un bilan enregistré pour cet athlète.</p><Button asChild variant="outline" className="mt-5"><Link to="/essentiels">Ouvrir les bilans</Link></Button></section> : <>
        {input.sportFocus === 'triathlon' && <Tabs value={sport} onValueChange={v => { if (v === 'bike' || v === 'run') setSelection(v); }}><TabsList className="min-h-12"><TabsTrigger value="bike" className="min-h-11">Vélo</TabsTrigger><TabsTrigger value="run" className="min-h-11">Course à pied</TabsTrigger></TabsList></Tabs>}
        <section className="border-y border-border py-6"><h3 className="font-semibold mb-5">Repères · {sport === 'run' ? 'Course à pied' : 'Vélo'}</h3><dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6">{indicators.map(i => <div key={i.key}><dt className="text-xs text-muted-foreground">{i.label}</dt><dd className="mt-2 text-xl font-semibold tabular-nums">{i.value == null ? '—' : Number(i.value.toFixed(2))} <span className="text-xs font-normal">{i.value == null ? '' : i.unit}</span></dd><p className="text-xs text-muted-foreground mt-1">{i.value == null ? 'Données insuffisantes' : /estimat|model|calcul/i.test(i.source) ? 'Valeur TFCL' : 'Valeur enregistrée'}</p><p className="text-xs text-muted-foreground leading-relaxed mt-2">{i.explanation}</p></div>)}</dl></section>
        <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-muted-foreground">Comparer avec</span><Select value={compareId} onValueChange={setCompareId}><SelectTrigger aria-label="Bilan à comparer" className="w-full sm:w-56 min-h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Aucune comparaison</SelectItem>{others.map(o => <SelectItem key={o.id} value={o.id}>Bilan du {o.date}</SelectItem>)}</SelectContent></Select></div>
        <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-muted-foreground">Records Nolio sur</span><Select value={String(windowMonths)} onValueChange={v => setWindowMonths(Number(v))}><SelectTrigger aria-label="Période des records Nolio" className="w-full sm:w-40 min-h-11"><SelectValue /></SelectTrigger><SelectContent>{[6, 12, 24].map(m => <SelectItem key={m} value={String(m)}>{m} mois</SelectItem>)}</SelectContent></Select>
          {sport === 'bike' && nolio?.bike && <Tabs value={recalibrated ? 'fit' : 'bilan'} onValueChange={v => setRecalibrated(v === 'fit')}><TabsList className="min-h-12"><TabsTrigger value="fit" className="min-h-11">Recalé Nolio</TabsTrigger><TabsTrigger value="bilan" className="min-h-11">Valeurs du bilan</TabsTrigger></TabsList></Tabs>}</div>
        <LabNolioCalibration sport={sport} bike={nolio?.bike ?? null} run={nolio?.run ?? null} checks={nolio?.checks ?? []} loading={recordsLoading} recordCount={nolio?.count ?? 0} windowMonths={windowMonths} range={nolio?.range ?? null} />
        <LabLoadCharacteristics input={chartInput ?? input} snapshot={snapshot} sport={sport} compare={compare ?? (chartInput !== input ? { input, date: `${snapshot.date} (bilan)` } : null)} />
        <PhysiologicalProfileCurves key={`${currentAthlete.id}-${sport}`} input={input} tfclLabels selectedSport={sport} snapshots={snapshots} snapshot={snapshot} />
        <section className="border-t border-border pt-6 space-y-4"><h3 className="text-xl font-semibold">Puissance–durée et réserve</h3><p className="text-sm text-muted-foreground">Les points représentent les efforts enregistrés ; la courbe TFCL met en perspective la puissance soutenable selon leur durée. CP/W′ vélo et vitesse critique/D′ course sont des paramètres distincts, pas des mesures de force ou de VLamax.</p>{sport === 'bike' ? <PowerDurationUnifiedChart vo2max={input.vo2max} vlamax={input.vlamaxEffectif.value} ftp={input.ftp} weight={input.poids} pmax5s={input.pmax5s} p30s={input.p30sW} p60s={input.p60sW} map5min={input.map5minW} /> : <p className="text-sm text-muted-foreground">Les repères critiques course enregistrés figurent ci-dessus ; aucune courbe puissance vélo n’est transférée à la course.</p>}</section>
        {input.sportFocus === 'triathlon' && <section className="border-t border-border pt-6"><h3 className="text-xl font-semibold">Natation</h3><p className="text-2xl font-semibold mt-3">{snapshot.css ?? '—'} <span className="text-sm font-normal">{snapshot.css ? 's/100 m · CSS enregistrée' : 'Données insuffisantes'}</span></p><p className="text-sm text-muted-foreground mt-2">La CSS est un repère de nage, pas un profil métabolique mesuré ; aucune courbe course ou vélo n’est transposée.</p></section>}
        <TestMeasurementCurves key={currentAthlete.id} tests={tests} athleteId={currentAthlete.id} />
        <p className="text-sm text-muted-foreground border-t border-border pt-5">Les valeurs importées dans un bilan restent utilisables même sans fiche de test. Sans série brute stockée, une courbe de test ne peut pas être reconstruite. Valeurs TFCL issues des modèles Mader–Heck et TFCLab ; elles ne remplacent pas des mesures de laboratoire. Seuils et zones : doctrine TFCL.</p>
      </>}
    </main><MobileBottomNav activeTab="lab" onTabChange={() => {}} />
  </div>;
}