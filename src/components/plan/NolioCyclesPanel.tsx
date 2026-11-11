import { useEffect, useMemo, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Calendar, Loader2, Send } from 'lucide-react';
import { format } from 'date-fns';
import type { ParsedPlan } from '@/lib/aiPlanParser';
import { buildNolioCycles } from '@/lib/plan/nolioCycles';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Preview = { entries: { state: 'create' | 'conflict' | 'existing'; cycle: { name: string; date_start: string; date_end: string } }[] };
async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('nolio-v2-oauth', { body });
  if (error) {
    let detail = error.message;
    if (error instanceof FunctionsHttpError) {
      const value = await error.context.json().catch(() => null);
      detail = value?.detail ?? value?.message ?? value?.error ?? detail;
    }
    throw new Error(detail);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function NolioCyclesPanel({ plan, athleteId, athleteName, startDate }: { plan: ParsedPlan; athleteId: string; athleteName?: string; startDate?: Date }) {
  const [date, setDate] = useState(startDate ? format(startDate, 'yyyy-MM-dd') : '');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [needsConnect, setNeedsConnect] = useState(false);
  const cycles = useMemo(() => buildNolioCycles(plan, date), [plan, date]);
  useEffect(() => { setDate(startDate ? format(startDate, 'yyyy-MM-dd') : ''); }, [startDate]);
  useEffect(() => { setPreview(null); setAccepted(false); setMessage(null); setNeedsConnect(false); }, [cycles, athleteId]);
  const conflicts = preview?.entries.filter(e => e.state === 'conflict').length ?? 0;
  const send = async (confirm: boolean) => {
    setBusy(true); setMessage(null); setNeedsConnect(false);
    try {
      const result = await call({ action: 'cycles', athlete_id: athleteId, cycles, confirm });
      if (result.entries) {
        setPreview(result);
        if (confirm) setMessage('Un cycle Nolio a changé : vérifiez les conflits avant de renvoyer.');
      }
      if (result.results && result.confirmed) {
        const created = result.results.filter((r: { state: string }) => r.state === 'created').length;
        setMessage(`${created} cycle(s) créé(s) et relu(s) dans Nolio · ${result.results.length - created} déjà présent(s).`);
        setPreview(null); setAccepted(false);
      }
    } catch (e) {
      const text = e instanceof Error ? e.message : 'Envoi impossible.';
      setNeedsConnect(/not_connected|reauthorization|missing_scope|planned:write/.test(text));
      setMessage(/not_connected/.test(text) ? 'Connectez Nolio pour envoyer les cycles.' : text);
      setAccepted(false);
    } finally { setBusy(false); }
  };
  const connect = async () => {
    setBusy(true);
    try { const result = await call({ action: 'start', write_cycles: true }); window.location.assign(result.url); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Connexion impossible.'); setBusy(false); }
  };
  return <CollapsibleCard defaultOpen={false} storageKey="ai_plan_nolio_cycles" icon={<Calendar className="h-4 w-4 text-primary" />} title="Cycles et chantiers → Nolio">
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1"><Label htmlFor="nolio-cycle-start">Début du plan</Label><Input id="nolio-cycle-start" type="date" value={date} disabled={busy} onChange={e => setDate(e.target.value)} className="w-44" /></div>
        <Button variant="outline" disabled={busy || !cycles.length} onClick={() => send(false)}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}Vérifier les cycles Nolio</Button>
      </div>
      <ul className="divide-y divide-border">{cycles.map(c => <li key={c.date_start} className="py-2 text-sm"><p className="font-medium break-words">{c.name}</p><p className="text-muted-foreground">{c.date_start} → {c.date_end}</p><p className="whitespace-pre-line text-xs text-muted-foreground mt-1 break-words">{c.description}</p></li>)}</ul>
      {!cycles.length && <p className="text-sm text-muted-foreground">Aucun cycle daté disponible.</p>}
      {preview && <div className="space-y-3">
        <ul className="space-y-1 text-sm">{preview.entries.map(e => <li key={e.cycle.date_start} className={e.state === 'conflict' ? 'text-destructive' : 'text-foreground'}>{e.cycle.name} — {e.state === 'conflict' ? 'Chevauche un cycle Nolio existant : aucun envoi' : e.state === 'existing' ? 'Déjà présent, non dupliqué' : 'À créer'}</li>)}</ul>
        {conflicts === 0 && <><label className="flex items-start gap-2 text-sm min-h-11"><Checkbox checked={accepted} disabled={busy} onCheckedChange={v => setAccepted(v === true)} /><span>Je confirme l’envoi de ces cycles pour {athleteName ?? 'cet athlète'}, aux dates affichées.</span></label><Button disabled={busy || !accepted} onClick={() => send(true)}><Send className="h-4 w-4 mr-2" />Envoyer les cycles dans Nolio</Button></>}
      </div>}
      {message && <Alert><AlertDescription className="break-words">{message}</AlertDescription></Alert>}
      {needsConnect && <Button variant="outline" disabled={busy} onClick={connect}>Autoriser les cycles dans Nolio</Button>}
    </div>
  </CollapsibleCard>;
}