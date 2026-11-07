import { useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { canonicalJson } from '@/lib/plan/appendOnlyPlanVersionSave';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { describeSourceBlocks } from '@/lib/det/coachDetContext';
import { bindLibraryReview, prepareLibraryReview, type LibraryReviewRow } from '@/lib/det/librarySourceReview';
import type { FamilySourcePool } from '@/lib/det/familySourcePools';
import type { CoachAnswers, GenuineSourceReviews } from '@/lib/det/athleteDetBridge';

type ReviewDatabase = { public: { Tables: { det_library_source_reviews: {
  Row: LibraryReviewRow & Record<string, unknown>; Insert: Omit<LibraryReviewRow, 'id' | 'created_at'> & Record<string, unknown>;
  Update: never; Relationships: [];
} }; Views: Record<string, never>; Functions: Record<string, never> } };
const db = supabase as unknown as SupabaseClient<ReviewDatabase>;

/** A real human action, once per exact library manifest; no prechecked consent. */
export function LibrarySourceReview(props: {
  pool: FamilySourcePool; coachId: string; athleteId: string; fingerprint: string | null;
  answers: CoachAnswers; guard: () => Promise<{ userId: string; athleteId: string } | null>;
  onResolved: (review: GenuineSourceReviews | null) => void;
}) {
  const { pool, coachId, athleteId, fingerprint, answers, guard, onResolved } = props;
  const [prepared, setPrepared] = useState<Awaited<ReturnType<typeof prepareLibraryReview>> | null>(null);
  const [row, setRow] = useState<LibraryReviewRow | null>(null);
  const context = useRef('');
  const contextKey = `${coachId}|${pool.family}|${pool.pinnedFingerprint}`;
  context.current = contextKey;
  const [schemaReady, setSchemaReady] = useState(false), [uncertain, setUncertain] = useState(false);
  const [opened, setOpened] = useState(false), [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const supported = ['marathon', 'semi_marathon'].includes(pool.family);
  useEffect(() => {
    let current = true; setSchemaReady(false); setUncertain(false); setPrepared(null); setRow(null); setConfirmed(false); setOpened(false); setNotes('');
    if (!supported) return;
    void (async () => {
      try {
        const p = await prepareLibraryReview(pool);
        const result = await db.from('det_library_source_reviews').select('*').eq('coach_id', coachId)
          .eq('family', pool.family).eq('manifest_hash', p.hash)
          .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1).returns<LibraryReviewRow[]>().maybeSingle();
        if (!current) return;
        setPrepared(p);
        if (result.error) { setMessage('Revue groupée indisponible sur ce serveur : le schéma candidat doit être installé et vérifié en QA. La revue Avancé reste disponible.'); return; }
        setSchemaReady(true); setRow(result.data); setMessage('');
      } catch { if (current) setMessage('Le contenu du catalogue a changé : une nouvelle revue est nécessaire.'); }
    })();
    return () => { current = false; };
  }, [pool, coachId, supported]); // pool is pinned by family
  useEffect(() => {
    onResolved(prepared && fingerprint ? bindLibraryReview({ row, ...prepared,
      coachId: coachId, athleteId: athleteId, fingerprint: fingerprint, answers: answers }) : null);
  }, [prepared, row, coachId, athleteId, fingerprint, answers, onResolved]);

  if (!supported) return null;
  const save = async (decision: 'reviewed' | 'withdrawn') => {
    if (!prepared || !notes.trim() || (decision === 'reviewed' && (!opened || !confirmed))) return;
    setBusy(true);
    const keyAtStart = contextKey;
    const isCurrent = () => context.current === keyAtStart;
    try {
      const user = await guard();
      if (!isCurrent()) return;
      if (!user || user.userId !== coachId || user.athleteId !== athleteId) throw Error('Session ou athlète changé.');
      const current = await prepareLibraryReview(pool);
      if (!isCurrent()) return;
      if (current.hash !== prepared.hash) throw Error('Catalogue modifié pendant la revue.');
      const payload = { coach_id: user.userId, family: pool.family, manifest: prepared.manifest,
        manifest_hash: prepared.hash, decision, reviewer_notes: notes.trim() };
      const saved = await db.from('det_library_source_reviews').insert(payload).select('*').returns<LibraryReviewRow[]>().single();
      if (!isCurrent()) return;
      if (saved.error || !saved.data) { setUncertain(true); throw Error('Enregistrement non confirmé : rechargez pour vérifier avant de réessayer.'); }
      // Exact read-back; no success based only on a returned identifier.
      const read = await db.from('det_library_source_reviews').select('*').eq('id', saved.data.id).returns<LibraryReviewRow[]>().single();
      if (read.error || !read.data || read.data.manifest_hash !== prepared.hash || read.data.decision !== decision
        || read.data.coach_id !== coachId || read.data.reviewer_notes !== notes.trim()
        || canonicalJson(read.data.manifest) !== canonicalJson(prepared.manifest))
        { setUncertain(true); throw Error('Relecture non confirmée. Rechargez pour vérifier la revue enregistrée.'); }
      if (!isCurrent()) return;
      setRow(read.data); setConfirmed(false); setMessage(decision === 'reviewed' ? 'Revue du catalogue enregistrée et relue. Les vérifications propres à chaque athlète restent nécessaires.' : 'Revue retirée.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Revue non confirmée.'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-2 rounded border p-3" aria-label="Revue du catalogue">
    <p className="text-sm font-medium">Revue du catalogue — une fois pour cette version</p>
    <p className="text-xs">Relisez les séances et leurs adaptations autorisées. Cette revue sera réutilisable pour vos athlètes ; charge, fatigue, contre-indications et plan restent à vérifier séparément. Elle ne vaut pas attestation scientifique ni autorisation de prescription.</p>
    {row?.decision === 'reviewed' && <p className="text-sm">Revue enregistrée le {row.created_at.slice(0, 10)}.</p>}
    {prepared && <details onToggle={e => { if (e.currentTarget.open) setOpened(true); }}>
      <summary>Lire les {prepared.manifest.sources.length} séances et doses</summary>
      <div className="max-h-96 overflow-auto space-y-4">{prepared.manifest.sources.map(s => <article key={s.id}>
        <h4 className="font-medium">{s.title} · {s.sport}</h4>
        <p className="text-xs">Phases : {s.phases.join(', ')}</p>
        <ul className="text-xs">{describeSourceBlocks(s.blocks).map((b, i) => <li key={i}>{b}</li>)}</ul>
        {prepared.manifest.doses[s.id] && <p className="text-xs">Adaptation exacte : {JSON.stringify(prepared.manifest.doses[s.id])}</p>}
        <p className="text-xs">Prérequis : {s.prerequisites.join(' ; ') || 'aucun déclaré'}</p>
        <p className="text-xs">Contre-indications : {s.contraindications.join(' ; ') || 'aucune déclarée'}</p>
      </article>)}</div>
    </details>}
    <label className="flex gap-2 text-sm"><Checkbox checked={confirmed} onCheckedChange={v => setConfirmed(v === true)} />J'ai effectivement relu l'ensemble des séances et adaptations ci-dessus.</label>
    <textarea aria-label="Notes de revue du catalogue" className="w-full border rounded p-2 text-sm" maxLength={4000}
      placeholder="Vos observations de revue (obligatoires)" value={notes} onChange={e => setNotes(e.target.value)} />
    <div className="flex gap-2"><Button disabled={!schemaReady || uncertain || !prepared || !opened || !confirmed || !notes.trim() || busy} onClick={() => void save('reviewed')}>Enregistrer ma revue</Button>
      {row?.decision === 'reviewed' && <Button variant="outline" disabled={!schemaReady || uncertain || !notes.trim() || busy} onClick={() => void save('withdrawn')}>Retirer ma revue</Button>}</div>
    {message && <p className="text-sm" role="status">{message}</p>}
  </section>;
}
