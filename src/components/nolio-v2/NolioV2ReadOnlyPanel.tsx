import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AthleteDTO, Availability, CalendarDTO, LinkDTO, LocalAthlete, NolioV2Api, ReadResult, SportDTO, StatusDTO, ZoneDTO } from "@/lib/nolio-v2/types";
const labels: Record<Availability, string> = { complete: "Complètes", partial: "Partielles", denied: "Refusées", unavailable: "Indisponibles" };
const kinds = { training: "Entraînements", competition: "Compétitions", cycle: "Cycles", note: "Notes", message: "Messages planifiés", quiz: "Questionnaires planifiés" };
function period() {
  // Civil dates: do not format local midnight as UTC or silently shift a selected day.
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 27)).toISOString().slice(0, 10);
  return { from, to: end };
}
export function DataState({ result }: { result: ReadResult<unknown> }) {
  return <span>{labels[result.availability]}{result.issue ? ` (${result.issue.code}${result.issue.retryAfter != null ? `, réessayer après ${result.issue.retryAfter} s` : ""})` : ""}</span>;
}
export function NolioV2ReadOnlyPanel({ api, athletes }: { api: NolioV2Api; athletes: LocalAthlete[] }) {
  const [status, setStatus] = useState<StatusDTO | null>(null);
  const [candidates, setCandidates] = useState<ReadResult<AthleteDTO[]> | null>(null);
  const [local, setLocal] = useState(athletes[0]?.id ?? "");
  const [remote, setRemote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [link, setLink] = useState<LinkDTO | null>(null);
  const [dates, setDates] = useState(period);
  const [calendar, setCalendar] = useState<CalendarDTO | null>(null);
  const [sports, setSports] = useState<{ catalog: ReadResult<SportDTO[]>; profiles: ReadResult<SportDTO[]> } | null>(null);
  const [zones, setZones] = useState<ReadResult<ZoneDTO[]> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const clearViews = () => { setCalendar(null); setSports(null); setZones(null); };
  useEffect(() => {
    let active = true;
    setLink(null); setRemote(""); setConfirmed(false); setCalendar(null); setSports(null); setZones(null); setError("");
    setLinkLoading(!!local);
    if (local) void api.call<LinkDTO | null>("links", { action: "get", athleteId: local }).then(x => { if (active) { setLink(x); setLinkLoading(false); } }).catch(() => { if (active) { setError("Lien local indisponible"); setLinkLoading(false); } });
    return () => { active = false; };
  }, [api, local]);
  async function run(fn: () => Promise<void>) {
    setBusy(true); setError("");
    try { await fn(); } catch (e) { clearViews(); setStatus(null); setError(e instanceof Error ? e.message : "unavailable"); }
    finally { setBusy(false); }
  }
  const selected = candidates?.data.find(x => x.id === remote);
  const target = athletes.find(x => x.id === local);
  return <Card aria-label="Nolio v2 développement">
    <CardHeader><CardTitle>Nolio v2 — développement simulé, lecture seule</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p>Données fictives. Aucun envoi de séance ni accès Nolio réel.</p>
      <Button disabled={busy} onClick={() => run(async () => {
        clearViews(); setCandidates(null);
        setStatus(await api.call<StatusDTO>("read", { action: "status" }));
        setCandidates(await api.call<ReadResult<AthleteDTO[]>>("read", { action: "athletes" }));
      })}>Vérifier la connexion simulée</Button>
      {status && <p role="status">Application {status.applicationType} · {status.scopes.join(", ")} · Quota : {status.quota.hourlyRemaining}/{status.quota.hourlyLimit} heure, {status.quota.dailyRemaining}/{status.quota.dailyLimit} jour (simulation)</p>}
      {error && <p role="alert">Accès indisponible : {error}</p>}
      {candidates && <div><p>Athlètes Nolio : <DataState result={candidates} /></p><ul>{candidates.data.map(a => <li key={a.id}>{a.name} ({a.id}) — {a.hasApiAccess ? "Accessible" : "Accès refusé"}</li>)}</ul></div>}
      <div className="space-y-2">
        <label className="block">Athlète TFCLab <select aria-label="Athlète TFCLab v2" value={local} disabled={busy} onChange={e => setLocal(e.target.value)} className="border rounded p-2 bg-background">
          <option value="">Choisir un athlète</option>{athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select></label>
        {link ? <div><p>Association locale : {target?.name} ↔ {link.nolioUserId}</p>
          <Button variant="outline" disabled={busy} onClick={() => run(async () => { await api.call("links", { action: "unlink", athleteId: local }); setLink(null); clearViews(); })}>Retirer uniquement le lien local v2</Button>
        </div> : <>
          <label className="block">Utilisateur Nolio simulé <select aria-label="Utilisateur Nolio v2" value={remote} disabled={busy || !candidates} onChange={e => { setRemote(e.target.value); setConfirmed(false); }} className="border rounded p-2 bg-background">
            <option value="">Choisir explicitement</option>{candidates?.data.map(a => <option key={a.id} value={a.id} disabled={!a.hasApiAccess}>{a.name} — {a.id}{a.hasApiAccess ? "" : " — refusé"}</option>)}
          </select></label>
          <label className="block"><input type="checkbox" checked={confirmed} disabled={!local || !selected?.hasApiAccess || busy} onChange={e => setConfirmed(e.target.checked)} /> Je confirme {target?.name ?? "l’athlète local"} ↔ {selected?.name ?? "l’utilisateur choisi"} ({remote || "aucun"})</label>
          <Button disabled={busy || linkLoading || !local || !selected?.hasApiAccess || !confirmed} onClick={() => run(async () => {
            setLink(await api.call<LinkDTO>("links", { action: "associate", athleteId: local, nolioUserId: remote, confirmed: true })); setConfirmed(false);
          })}>Confirmer l’association locale v2</Button>
        </>}
      </div>
      <div className="flex flex-wrap gap-3">
        <label>Du <input aria-label="Début calendrier v2" type="date" value={dates.from} disabled={busy} onChange={e => { clearViews(); setDates({ ...dates, from: e.target.value }); }} /></label>
        <label>Au <input aria-label="Fin calendrier v2" type="date" value={dates.to} disabled={busy} onChange={e => { clearViews(); setDates({ ...dates, to: e.target.value }); }} /></label>
        <Button disabled={busy || !link} onClick={() => run(async () => {
          clearViews(); setCalendar(await api.call<CalendarDTO>("read", { action: "calendar", athleteId: local, ...dates }));
        })}>Consulter le calendrier</Button>
        <Button disabled={busy || !link} onClick={() => run(async () => {
          clearViews(); setSports(await api.call("read", { action: "sports", athleteId: local }));
          setZones(await api.call("read", { action: "zones", athleteId: local }));
        })}>Consulter sports et zones</Button>
      </div>
      {calendar && <section aria-label="Calendrier planifié v2"><p>{calendar.from} → {calendar.to}</p>{Object.entries(calendar.collections).map(([kind, result]) => <div key={kind}>
        <h3 className="font-medium">{kinds[kind as keyof typeof kinds]} — <DataState result={result} /></h3>
        {result.nextCursor && <p>Consultation incomplète : réduire la période avant une nouvelle lecture.</p>}
        <ul>{result.data.map(event => <li key={event.id}>{event.date}{event.time ? ` ${event.time}` : ""}{event.endDate ? ` → ${event.endDate}` : ""} · {event.name}{event.durationSeconds != null ? ` · ${event.durationSeconds} s` : ""}{event.restricted ? " · Mesures restreintes" : ""}</li>)}</ul>
      </div>)}</section>}
      {sports && <section aria-label="Sports v2"><h3>Catalogue : <DataState result={sports.catalog} /></h3><ul>{sports.catalog.data.map(x => <li key={x.id}>{x.name} ({x.id})</li>)}</ul><h3>Profil de l’athlète : <DataState result={sports.profiles} /></h3><ul>{sports.profiles.data.map(x => <li key={x.id}>{x.name} — {x.active ? "actif" : "inactif"}</li>)}</ul></section>}
      {zones && <section aria-label="Zones v2"><h3>Zones de consultation : <DataState result={zones} /></h3><p>Aucune correspondance automatique avec les domaines physiologiques TFCLab.</p>{zones.data.map(x => <div key={x.stream}><h4>{x.stream}</h4><pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(x.content, null, 2)}</pre></div>)}</section>}
    </CardContent>
  </Card>;
}
