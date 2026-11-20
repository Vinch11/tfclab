import { useMemo, useState } from 'react';
import type { CoachingCompassInput } from '@/lib/coachingCompass/types';
import { LabPriorities, SnapshotReview, BlindReview } from '@/components/charts/LabCoachReview';
import { Link } from 'react-router-dom';
import { FlaskConical, ArrowLeft, Loader2 } from 'lucide-react';
import { useAthletes } from '@/contexts/AthleteContext';
import { useCloudDataContext } from '@/contexts/CloudDataContext';
import { earlierBilans } from '@/lib/lab/coachReview';
import { pickReferenceSnapshot } from '@/lib/referenceSnapshot';
import { labProfile } from '@/lib/lab/labProfile';
import { completeProfile } from '@/lib/coachingCompass/completeProfile';
import { AthleteEvidenceCharts } from '@/components/charts/AthleteEvidenceCharts';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LabPage({ compass }: { compass?: CoachingCompassInput | null }) {
  const { currentAthlete, visibleAthletes, setSelectedAthleteId } = useAthletes();
  const { snapshots, tests, loading } = useCloudDataContext();
  const [blind, setBlind] = useState(false);
  const [selection, setSelection] = useState<'bike' | 'run'>('bike');
  const snapshot = useMemo(() => currentAthlete ? pickReferenceSnapshot(snapshots, currentAthlete.id, currentAthlete.active_snapshot_id) : null, [snapshots, currentAthlete]);
  const [baselineId, setBaselineId] = useState('');
  const earlier = snapshot ? earlierBilans(snapshots,snapshot) : [];
  const baseline = earlier.find(s=>s.id===baselineId) ?? earlier[0];
  const goal = compass?.athleteId === currentAthlete?.id ? compass?.objectif : currentAthlete?.objectif;
  const ambition = compass?.athleteId === currentAthlete?.id ? compass?.ambition : currentAthlete?.ambition;
  const input = useMemo(() => snapshot ? labProfile(snapshot, tests, goal ?? '', ambition ?? '') : null, [snapshot, tests, goal, ambition]);
  const sport = input?.sportFocus === 'triathlon' ? selection : input?.sportFocus === 'run' ? 'run' : 'bike';
  const disciplines = useMemo(() => input ? completeProfile(input, snapshot?.css ?? null) : [], [input, snapshot]);
  const indicators = disciplines.find(d => d.sport === (sport === 'run' ? 'Course à pied' : 'Vélo'))?.indicators ?? [];
  return <div className="min-h-screen bg-background pb-24">
    <header className="border-b border-border"><div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><Button asChild variant="ghost" size="icon" aria-label="Revenir au Dashboard"><Link to="/"><ArrowLeft className="h-5 w-5" /></Link></Button><FlaskConical className="h-6 w-6 text-primary" /><h1 className="text-2xl font-bold">100%lab</h1></div><Select value={currentAthlete?.id ?? ''} onValueChange={id => { setSelectedAthleteId(id); setSelection('bike'); setBlind(false); }}><SelectTrigger aria-label="Athlète du laboratoire" className="w-full sm:w-64 min-h-11"><SelectValue placeholder="Choisir un athlète" /></SelectTrigger><SelectContent>{visibleAthletes.map(a => <SelectItem key={a.id} value={a.id}>{a.nom}</SelectItem>)}</SelectContent></Select></div></header>
    <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      <section className="space-y-3"><p className="text-xs font-semibold text-primary">TFCLAB · PROFIL MÉTABOLIQUE</p><h2 className="text-3xl font-bold">{currentAthlete?.nom ?? 'Votre laboratoire'}</h2><p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">Vos valeurs TFCL · bilan du {snapshot?.date ?? '—'}.</p></section>
      {snapshot && <button className="text-sm text-primary underline" onClick={() => setBlind(!blind)}>{blind ? 'Revenir au bilan actuel' : 'Relire un bilan historique à l’aveugle'}</button>}
      {blind && snapshot ? <BlindReview athletes={visibleAthletes} tests={tests} birth={currentAthlete?.dateNaissance} key={snapshot.id} snapshots={snapshots} reference={snapshot} /> : loading ? <Loader2 aria-label="Chargement des bilans" className="h-6 w-6 animate-spin text-primary" /> : !input || !snapshot ? <section className="border-y border-border py-12"><h3 className="text-lg font-semibold">Aucun bilan disponible</h3><p className="text-muted-foreground mt-2">Les courbes nécessitent un bilan enregistré pour cet athlète.</p><Button asChild variant="outline" className="mt-5"><Link to="/essentiels">Ouvrir les bilans</Link></Button></section> : <>
        {compass && compass.athleteId === snapshot.athlete_id && <LabPriorities input={compass} snapshot={snapshot} tests={tests} />}
        {input.sportFocus === 'triathlon' && <Tabs value={sport} onValueChange={v => { if (v === 'bike' || v === 'run') setSelection(v); }}><TabsList className="min-h-12"><TabsTrigger value="bike" className="min-h-11">Vélo</TabsTrigger><TabsTrigger value="run" className="min-h-11">Course à pied</TabsTrigger></TabsList></Tabs>}
        <section className="border-y border-border py-6"><h3 className="font-semibold mb-5">Repères · {sport === 'run' ? 'Course à pied' : 'Vélo'}</h3><dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6">{indicators.map(i => <div key={i.key}><dt className="text-xs text-muted-foreground">{i.label}</dt><dd className="mt-2 text-xl font-semibold tabular-nums">{i.value == null ? '—' : Number(i.value.toFixed(2))} <span className="text-xs font-normal">{i.value == null ? '' : i.unit}</span></dd><p className="text-xs text-muted-foreground mt-1">{i.value == null ? 'Données insuffisantes' : /estimat|model|calcul/i.test(i.source) ? 'Valeur TFCL' : 'Valeur enregistrée'}</p><p className="text-xs text-muted-foreground leading-relaxed mt-2">{i.explanation}</p></div>)}</dl></section>
        <SnapshotReview baseline={baseline} onBaseline={setBaselineId} key={snapshot.id + sport} snapshots={snapshots} reference={snapshot} sport={sport} input={input} />
        <AthleteEvidenceCharts baseline={baseline} labReview key={currentAthlete?.id} input={input} snapshot={snapshot} snapshots={snapshots} tests={tests} selectedSport={sport} athleteName={currentAthlete?.nom} />
        {input.sportFocus === 'triathlon' && <section className="border-t border-border pt-6"><h3 className="text-xl font-semibold">Natation</h3><p className="text-2xl font-semibold mt-3">{snapshot.css ?? '—'} <span className="text-sm font-normal">{snapshot.css ? 's/100 m · CSS enregistrée' : 'Données insuffisantes'}</span></p><p className="text-sm text-muted-foreground mt-2">La CSS est un repère de nage, pas un profil métabolique mesuré ; aucune courbe course ou vélo n’est transposée.</p></section>}
        <p className="text-sm text-muted-foreground border-t border-border pt-5">Les valeurs importées dans un bilan restent utilisables même sans fiche de test. Sans série brute stockée, une courbe de test ne peut pas être reconstruite. Valeurs TFCL issues des modèles Mader–Heck et TFCLab ; elles ne remplacent pas des mesures de laboratoire. Seuils et zones : doctrine TFCL.</p>
      </>}
    </main><MobileBottomNav activeTab="lab" onTabChange={() => {}} />
  </div>;
}