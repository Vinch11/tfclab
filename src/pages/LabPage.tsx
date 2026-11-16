import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, ArrowLeft, Loader2 } from 'lucide-react';
import { useAthletes } from '@/contexts/AthleteContext';
import { useCloudDataContext } from '@/contexts/CloudDataContext';
import { pickReferenceSnapshot } from '@/lib/referenceSnapshot';
import { labProfile } from '@/lib/lab/labProfile';
import { completeProfile } from '@/lib/coachingCompass/completeProfile';
import { PhysiologicalProfileCurves } from '@/components/charts/PhysiologicalProfileCurves';
import { LabMetabolicCurves } from '@/components/charts/LabMetabolicCurves';
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
  const sport = input?.sportFocus === 'triathlon' ? selection : input?.sportFocus === 'run' ? 'run' : 'bike';
  const disciplines = useMemo(() => input ? completeProfile(input, snapshot?.css ?? null) : [], [input, snapshot]);
  const indicators = disciplines.find(d => d.sport === (sport === 'run' ? 'Course à pied' : 'Vélo'))?.indicators ?? [];
  return <div className="min-h-screen bg-background pb-24">
    <header className="border-b border-border"><div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><Button asChild variant="ghost" size="icon" aria-label="Revenir au Dashboard"><Link to="/"><ArrowLeft className="h-5 w-5" /></Link></Button><FlaskConical className="h-6 w-6 text-primary" /><h1 className="text-2xl font-bold">100%lab</h1></div><Select value={currentAthlete?.id ?? ''} onValueChange={id => { setSelectedAthleteId(id); setSelection('bike'); }}><SelectTrigger aria-label="Athlète du laboratoire" className="w-full sm:w-64 min-h-11"><SelectValue placeholder="Choisir un athlète" /></SelectTrigger><SelectContent>{visibleAthletes.map(a => <SelectItem key={a.id} value={a.id}>{a.nom}</SelectItem>)}</SelectContent></Select></div></header>
    <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      <section className="space-y-3"><p className="text-xs font-semibold text-primary">TFCLAB · PROFIL MÉTABOLIQUE</p><h2 className="text-3xl font-bold">{currentAthlete?.nom ?? 'Votre laboratoire'}</h2><p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">Vos valeurs TFCL · bilan du {snapshot?.date ?? '—'}.</p></section>
      {loading ? <Loader2 aria-label="Chargement des bilans" className="h-6 w-6 animate-spin text-primary" /> : !input || !snapshot ? <section className="border-y border-border py-12"><h3 className="text-lg font-semibold">Aucun bilan disponible</h3><p className="text-muted-foreground mt-2">Les courbes nécessitent un bilan enregistré pour cet athlète.</p><Button asChild variant="outline" className="mt-5"><Link to="/essentiels">Ouvrir les bilans</Link></Button></section> : <>
        {input.sportFocus === 'triathlon' && <Tabs value={sport} onValueChange={v => { if (v === 'bike' || v === 'run') setSelection(v); }}><TabsList className="min-h-12"><TabsTrigger value="bike" className="min-h-11">Vélo</TabsTrigger><TabsTrigger value="run" className="min-h-11">Course à pied</TabsTrigger></TabsList></Tabs>}
        <section className="border-y border-border py-6"><h3 className="font-semibold mb-5">Repères · {sport === 'run' ? 'Course à pied' : 'Vélo'}</h3><dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6">{indicators.map(i => <div key={i.key}><dt className="text-xs text-muted-foreground">{i.label}</dt><dd className="mt-2 text-xl font-semibold tabular-nums">{i.value == null ? '—' : Number(i.value.toFixed(2))} <span className="text-xs font-normal">{i.value == null ? '' : i.unit}</span></dd><p className="text-xs text-muted-foreground mt-1">{i.value == null ? 'Données insuffisantes' : /estimat|model|calcul/i.test(i.source) ? 'Valeur TFCL' : 'Valeur enregistrée'}</p><p className="text-xs text-muted-foreground leading-relaxed mt-2">{i.explanation}</p></div>)}</dl></section>
        <LabMetabolicCurves input={input} sport={sport} />
        <PhysiologicalProfileCurves key={`${currentAthlete.id}-${sport}`} input={input} tfclLabels selectedSport={sport} snapshots={snapshots} snapshot={snapshot} />
        <section className="border-t border-border pt-6 space-y-4"><h3 className="text-xl font-semibold">Puissance–durée et réserve</h3><p className="text-sm text-muted-foreground">Les points représentent les efforts enregistrés ; la courbe TFCL met en perspective la puissance soutenable selon leur durée. CP/W′ vélo et vitesse critique/D′ course sont des paramètres distincts, pas des mesures de force ou de VLamax.</p>{sport === 'bike' ? <PowerDurationUnifiedChart vo2max={input.vo2max} vlamax={input.vlamaxEffectif.value} ftp={input.ftp} weight={input.poids} pmax5s={input.pmax5s} p30s={input.p30sW} p60s={input.p60sW} map5min={input.map5minW} /> : <p className="text-sm text-muted-foreground">Les repères critiques course enregistrés figurent ci-dessus ; aucune courbe puissance vélo n’est transférée à la course.</p>}</section>
        {input.sportFocus === 'triathlon' && <section className="border-t border-border pt-6"><h3 className="text-xl font-semibold">Natation</h3><p className="text-2xl font-semibold mt-3">{snapshot.css ?? '—'} <span className="text-sm font-normal">{snapshot.css ? 's/100 m · CSS enregistrée' : 'Données insuffisantes'}</span></p><p className="text-sm text-muted-foreground mt-2">La CSS est un repère de nage, pas un profil métabolique mesuré ; aucune courbe course ou vélo n’est transposée.</p></section>}
        <TestMeasurementCurves key={currentAthlete.id} tests={tests} athleteId={currentAthlete.id} />
        <p className="text-sm text-muted-foreground border-t border-border pt-5">Les valeurs importées dans un bilan restent utilisables même sans fiche de test. Sans série brute stockée, une courbe de test ne peut pas être reconstruite. Valeurs TFCL issues des modèles Mader–Heck et TFCLab ; elles ne remplacent pas des mesures de laboratoire. Seuils et zones : doctrine TFCL.</p>
      </>}
    </main><MobileBottomNav activeTab="lab" onTabChange={() => {}} />
  </div>;
}