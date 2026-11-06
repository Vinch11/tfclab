import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { FrozenAppPlanningInput } from '@/lib/det/appPlanningInput';
import { buildAppPlanningDetDraft, type AppPlanningDetDraft, type DraftRestrictions } from '@/lib/det/appPlanningDetDraft';
import { LIMITER_LABELS } from '@/lib/det/coachDetContext';
const SPORTS: Record<string,string> = { run:'Course', bike:'Vélo', swim:'Natation', strength:'Renforcement', brick:'Enchaînement vélo-course' };
const ROLES = { race:'Épreuve déclarée', long:'Sortie longue', key:'Séance clé', support:'Soutien / récupération' };
export function DetPlanningDraft({ app, athleteId, coachId, guard, restrictions }: { restrictions: DraftRestrictions; app: FrozenAppPlanningInput | null; athleteId: string; coachId: string; guard: () => Promise<{userId:string;athleteId:string}|null> }) {
  const [draft,setDraft] = useState<AppPlanningDetDraft|null>(null);
  const [busy,setBusy] = useState(false), [open,setOpen] = useState(false), [error,setError] = useState('');
  const key = `${coachId}|${athleteId}|${app?.fingerprint ?? ''}|${JSON.stringify(restrictions)}`;
  const live = useRef(key); live.current = key;
  useEffect(() => { setDraft(null); setError(''); setOpen(false); setBusy(false); }, [key]);
  async function prepare() {
    if (!app || busy) return;
    const started = key; setBusy(true); setError('');
    try {
      const verified = await guard();
      if (live.current !== started) return;
      if (!verified || verified.userId !== coachId || verified.athleteId !== athleteId) throw Error('Connexion et athlète à vérifier avant préparation.');
      const next = await buildAppPlanningDetDraft(app, athleteId, restrictions);
      if (live.current !== started) return;
      setDraft(next); setOpen(true);
    } catch(e) { if(live.current === started) setError(e instanceof Error ? e.message : 'Préparation interrompue.'); }
    finally { if(live.current === started) setBusy(false); }
  }
  return <section className="space-y-2 rounded border p-3" aria-label="Préparation du brouillon DET">
    <p className="text-sm font-medium">Commencer avec le profil existant</p>
    <p className="text-sm">Préparez le calendrier et les séances candidates guidées par les limiteurs, sans remplir le questionnaire de revue.</p>
    <Button disabled={!app || busy} onClick={() => { void prepare(); }}>{busy ? 'Préparation…' : 'Préparer le brouillon DET'}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Brouillon de planification DET</DialogTitle></DialogHeader>
      {draft && <div className="space-y-4 text-sm">
        <p><b>{draft.objective}</b> · {draft.weeks.length} semaines · à revoir avant utilisation</p>
        <p>Limiteurs : {draft.limiterOrder.map(label => LIMITER_LABELS[label] ?? label).join(' → ')}</p>
        <p>Calendrier repris de la préparation commune IA/DET. Les fiches sont des propositions à examiner, sans dose ni horaire individuel confirmé.</p>
        <section className="rounded border p-3 space-y-2"><h3 className="font-medium">Pistes de travail par priorité</h3><p className="text-xs">Sources à examiner pour le plan ; leur placement et leur dose ne sont pas encore confirmés.</p>{draft.limiterCandidates.map((priority,index) => <div key={index}><p>{index + 1}. {LIMITER_LABELS[priority.limiter] ?? priority.limiter}</p>{priority.sources.length ? <ul className="list-disc pl-5">{priority.sources.map(source => <li key={source.id}>{source.title} · {source.id}</li>)}</ul> : <p className="text-xs">Aucune piste disponible dans cette famille ; à traiter lors de la revue.</p>}</div>)}</section>
        <details><summary className="cursor-pointer font-medium">Points à traiter lors de la revue</summary><ul className="list-disc pl-5">{draft.pending.map(item => <li key={item}>{item}</li>)}</ul></details>
        {draft.weeks.map(week => <details key={week.week} className="rounded border p-3"><summary className="cursor-pointer font-medium">Semaine {week.week} · {week.phase ?? 'phase à préciser'} · {week.weekType} · {week.limiterFocus.focus ? `focus : ${LIMITER_LABELS[week.limiterFocus.focus] ?? week.limiterFocus.focus}` : "maintien / intégration"}</summary><div className="grid gap-2 mt-3 sm:grid-cols-2">{week.days.map(day => <section key={day.day} className="rounded border p-2"><h4 className="font-medium capitalize">{day.day}</h4>{day.rest && <p>Repos prévu</p>}{day.slots.map((slot,i) => <div key={i} className="mt-2"><p><b>{SPORTS[slot.sport] ?? slot.sport}</b> · {ROLES[slot.role]}</p>{slot.minimumMinutes !== null && <p className="text-xs">Plancher du créneau : {slot.minimumMinutes} min — dose à ajuster</p>}{slot.candidates.length ? <ul className="space-y-2 mt-1">{slot.candidates.map(source => <li key={source.id}><p>{source.title}{source.limiterMatches.length ? ` · piste : ${source.limiterMatches.map(label => LIMITER_LABELS[label] ?? label).join(', ')}` : ''}</p><p className="text-xs text-muted-foreground">{source.intent} · {source.id}</p></li>)}</ul> : <p className="text-xs">{slot.role === 'race' ? 'Épreuve conservée dans le calendrier.' : 'Séance à choisir lors de la revue.'}</p>}</div>)}</section>)}</div></details>)}
      </div>}
    </DialogContent></Dialog>
  </section>;
}
