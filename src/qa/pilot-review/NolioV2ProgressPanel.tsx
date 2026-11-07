/**
 * Progression réelle Nolio V2 (QA) : configurée → autorisée → athlète de test →
 * refs chargées → refs confirmées → prête pour essai. L'envoi calendrier reste
 * ABSENT ; la simulation n'est affirmée que depuis un reçu relu (prop `simulation`).
 * Toute action = clic délibéré ; changement de coach/athlète/génération/refs ⇒
 * brouillon effacé.
 */
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExerciseMappingEditor } from "./ExerciseMappingEditor";
import { mappingRows, canSaveMappings, finalExerciseIds } from "./exerciseMapping";

type Sport = { id: string; sport: string; name: string; isActive: boolean; structuredEnabled: boolean };
type Exercise = { id: string; name: string; type: string | null };
export type V2Stages = { configured: boolean; authorized: boolean; testAthleteSelected: boolean; refsLoaded: boolean; refsConfirmed: boolean; readyForTrial: boolean; realDryRunOrSendProof: "ABSENT" };
export type ActiveRefsView = { sha256: string; sportIds: Record<string, string>; exerciseIds: Record<string, string>; competition: unknown; calendarTimeZone: string | null };
export type RaceSourceView = { date: string; name: string; sport: string } | null;
export type V2StatusView = {
  stages?: V2Stages;
  activeRefs?: ActiveRefsView | null;
  grant?: null | { status: string; refreshState?: string; generation?: number; selectedAthleteRef: string | null;
    remoteRefs?: null | { loadedAt: string | null; digest: string; sports: Sport[]; exercises: { status: string; items: Exercise[] } } };
};

const STAGE_LABELS: Array<[keyof V2Stages, string]> = [
  ["configured", "Application configurée"], ["authorized", "Autorisée par Nolio"], ["testAthleteSelected", "Athlète de test choisi + consentement"],
  ["refsLoaded", "Sports Nolio chargés"], ["refsConfirmed", "Sports confirmés (connexion active, sans envoi)"], ["readyForTrial", "Prête pour un essai manuel"],
];
const REFRESH_FR: Record<string, string> = { idle: "normal", refreshing: "en cours", needs_reconnect: "reconnexion nécessaire", unknown: "inconnu — reconnexion nécessaire" };

export function NolioV2ProgressPanel(p: {
  status: V2StatusView; busy: boolean; ready: boolean; identityKey: string;
  planSports: string[]; exerciseLabels: string[];
  /** Identité SOURCE de la course objectif du plan affiché (proposée, jamais confirmée seule). */
  raceSource?: RaceSourceView;
  /** Action bornée gérée par la page (message + une relecture) ; ne rejette jamais. */
  act: (body: Record<string, unknown>) => Promise<void>;
  /** État de simulation dérivé uniquement d'un reçu relu par la page. */
  simulation?: "NONE" | "CONFIRMED" | "UNCONFIRMED";
}) {
  const st = p.status.stages;
  const g = p.status.grant ?? null;
  const refs = g?.remoteRefs ?? null;
  const active = p.status.activeRefs ?? null;
  const draftKey = `${p.identityKey}|${g?.generation ?? 0}|${refs?.digest ?? ""}|${active?.sha256 ?? ""}`;
  const [sportMap, setSportMap] = useState<Record<string, string>>({});
  const [exMap, setExMap] = useState<Record<string, string>>({});
  const [tz, setTz] = useState("");
  const [consent, setConsent] = useState(false);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [comp, setComp] = useState<{ date: string; name: string; sport: string } | null>(null);
  // Brouillon : connexion active ⇒ valeurs DÉJÀ confirmées (jamais de nouvelle proposition automatique).
  useEffect(() => {
    setSportMap(active ? { ...active.sportIds } : {}); setExMap(active ? { ...active.exerciseIds } : {});
    setTz(active?.calendarTimeZone ?? ""); setConsent(false); setReviewed(new Set());
    const c = active?.competition as { date?: unknown; name?: unknown; sport?: unknown } | null | undefined;
    setComp(c && typeof c.date === "string" && typeof c.name === "string" && typeof c.sport === "string" ? { date: c.date, name: c.name, sport: c.sport } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  const usable = useMemo(() => (refs?.sports ?? []).filter((s) => s.isActive && s.structuredEnabled), [refs]);
  const exercisesLoaded = refs?.exercises.status === "loaded";
  const chosenSports = Object.fromEntries(Object.entries(sportMap).filter(([, v]) => v));
  const chosenEx = Object.fromEntries(Object.entries(exMap).filter(([, v]) => v));
  const canActivate = !!refs && g?.status === "pending_refs" && Object.keys(chosenSports).length > 0 && consent && !p.busy && p.ready;
  const knownEx = useMemo(() => new Set((refs?.exercises.items ?? []).map((x) => x.id)), [refs]);
  const missingEx = p.exerciseLabels.filter((l) => !active?.exerciseIds[l] || !knownEx.has(active.exerciseIds[l]));
  const compSportOk = !comp || !!chosenSports[comp.sport];
  const exRows = useMemo(() => mappingRows(p.exerciseLabels, active?.exerciseIds ?? {}, exMap, refs?.exercises.items ?? []), [p.exerciseLabels, active, exMap, refs]);
  const exPending = canSaveMappings(exRows, reviewed).pending;
  const canUpdate = !!refs && !!active && g?.status === "active" && Object.keys(chosenSports).length > 0 && consent && compSportOk && exPending.length === 0 && !p.busy && p.ready;

  const sportsFor=(key:string)=>refs?refs.sports.filter(s=>s.isActive&&(s.structuredEnabled||(key===p.raceSource?.sport&&['brick','triathlon'].includes(key)))):[];
  const run = (body: Record<string, unknown>) => { void p.act(body).catch(() => {}); };

  return (
    <div data-testid="nolio-v2-progress" className="space-y-2">
      {st && <ol className="space-y-0.5">
        {STAGE_LABELS.map(([k, label]) => <li key={k} data-testid={`stage-${k}`}>{st[k] ? "✔" : "○"} {label} : {st[k] ? "oui" : "non"}</li>)}
        <li data-testid="stage-calendar">○ Envoi calendrier Nolio : ABSENT</li>
        <li data-testid="stage-simulation">{p.simulation === "CONFIRMED" ? "✔ Simulation : confirmée par reçu relu — résultat de simulation ci-dessous" : p.simulation === "UNCONFIRMED" ? "○ Simulation : non confirmée — voir résultat ci-dessous" : "○ Simulation : état inconnu (aucun reçu relu dans cette page)"}</li>
      </ol>}
      <p className="text-xs text-muted-foreground">Aucune étape n'est une attestation sportive ni une autorisation d'envoi. Une connexion active n'envoie rien automatiquement.</p>
      {g && <p>Rafraîchissement du jeton : {REFRESH_FR[g.refreshState ?? "idle"] ?? g.refreshState} · génération {g.generation ?? 1}</p>}

      {st?.testAthleteSelected && <Button size="sm" variant="outline" disabled={p.busy || !p.ready} onClick={() => run({ action: "load_refs" })}>Charger les sports Nolio</Button>}

      {refs && <div className="space-y-2 rounded-md border p-2">
        <p>Sports de l'athlète lus chez Nolio : {refs.sports.length} (utilisables pour séances structurées : {usable.length}) · chargés {refs.loadedAt ?? "?"}</p>
        <p>Exercices de force : {exercisesLoaded ? `${refs.exercises.items.length} chargés` : `NON chargés (${refs.exercises.status}) — séances de force bloquées`}</p>
        {g?.status === "active" && active && <div data-testid="nolio-active-refs" className="space-y-2">
          <p className="font-medium">Correspondances de la connexion ACTIVE (modification explicite, aucun envoi, jetons et consentement inchangés)</p>
          <p className="text-xs">Sports associés : {Object.keys(active.sportIds).join(", ") || "aucun"} · exercices confirmés : {Object.keys(active.exerciseIds).length} · compétition : {comp ? "confirmée" : "non confirmée"}</p>
          {p.planSports.map((k) => (
            <label key={k} className="flex items-center gap-2">
              <span className="w-24">{k}</span>
              <select aria-label={`Sport Nolio pour ${k}`} className="flex-1 rounded-md border bg-background p-1" value={sportMap[k] ?? ""} onChange={(e) => setSportMap({ ...sportMap, [k]: e.target.value })}>
                <option value="">— non associé —</option>
                {sportsFor(k).map((s) => <option key={s.sport} value={s.sport}>{s.name} · {s.sport}</option>)}
              </select>
            </label>
          ))}
          {p.exerciseLabels.length > 0 && <>
            <p className="font-medium">Exercices du plan exigeant un exercice officiel : {p.exerciseLabels.length} · manquants sur la connexion : {missingEx.length} {exercisesLoaded ? "" : "(bibliothèque non chargée : rechargez les références)"}</p>
            {exercisesLoaded && <ExerciseMappingEditor labels={p.exerciseLabels} current={active.exerciseIds} draft={exMap} catalog={refs.exercises.items}
              onDraft={setExMap} reviewed={reviewed} onReviewed={setReviewed} disabled={p.busy || !p.ready} />}
          </>}
          <div className="space-y-1 rounded-md border p-2">
            <p className="font-medium">Course objectif (compétition Nolio)</p>
            {p.raceSource ? <p className="text-xs">Séance source du plan : {p.raceSource.name} · {p.raceSource.date} · {p.raceSource.sport} · priorité : non portée par la source</p> : <p className="text-xs">Aucune course objectif unique dans le plan affiché.</p>}
            {p.raceSource && <Button size="sm" variant="outline" disabled={p.busy || !p.ready} onClick={() => setComp({ ...p.raceSource! })}>Reprendre les données de la séance source (à vérifier)</Button>}
            {comp && <div className="flex flex-wrap items-center gap-2">
              <input aria-label="Nom de la compétition" className="rounded-md border bg-background p-1" value={comp.name} onChange={(e) => setComp({ ...comp, name: e.target.value })} />
              <input aria-label="Date de la compétition" className="rounded-md border bg-background p-1" value={comp.date} onChange={(e) => setComp({ ...comp, date: e.target.value.trim() })} />
              <span>sport : {comp.sport}{compSportOk ? "" : " (non associé : associer ce sport d'abord)"}</span>
              <Button size="sm" variant="ghost" onClick={() => setComp(null)}>Retirer</Button>
            </div>}
          </div>
          <label className="flex items-center gap-2">Fuseau du calendrier Nolio (IANA, seulement si séances avec heure)
            <input aria-label="Fuseau du calendrier Nolio" className="rounded-md border bg-background p-1" placeholder="ex. Europe/Paris" value={tz} onChange={(e) => setTz(e.target.value.trim())} />
          </label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Je confirme ces correspondances (sports, exercices, compétition) pour l'athlète de test</label>
          <Button size="sm" disabled={!canUpdate} onClick={() => run({ action: "update_refs", consent: true, refsDigest: refs.digest, currentRefsSha: active.sha256, sportIds: chosenSports, exerciseIds: finalExerciseIds(active.exerciseIds, exMap, p.exerciseLabels), calendarTimeZone: tz || null, competition: comp })}>
            Enregistrer ces correspondances (aucun envoi)
          </Button>
          <p data-testid="mapping-effect-notice" className="text-xs text-muted-foreground">Effet d'un enregistrement : seules les PROCHAINES préparations utilisent ces correspondances. Les séances déjà présentes dans Nolio ne sont jamais modifiées. Une simulation complète faite avec les anciennes correspondances devient inapplicable (empreinte des références différente) : ses reçus restent conservés tels quels, mais une nouvelle simulation intégrale est exigée avant tout envoi. Cet écran de correspondances servira au futur écran d'export commun aux plans DET et IA ; il n'est pas activé en production.</p>
        </div>}
        {g?.status === "pending_refs" && <>
          <p className="font-medium">Associer chaque sport du plan à un sport Nolio confirmé :</p>
          {p.planSports.map((k) => (
            <label key={k} className="flex items-center gap-2">
              <span className="w-24">{k}</span>
              <select aria-label={`Sport Nolio pour ${k}`} className="flex-1 rounded-md border bg-background p-1" value={sportMap[k] ?? ""} onChange={(e) => setSportMap({ ...sportMap, [k]: e.target.value })}>
                <option value="">— non associé —</option>
                {sportsFor(k).map((s) => <option key={s.sport} value={s.sport}>{s.name} · {s.sport}</option>)}
              </select>
            </label>
          ))}
          {p.exerciseLabels.length > 0 && <>
            <p className="font-medium">Exercices de force du plan {exercisesLoaded ? "" : "(bloqué : bibliothèque non chargée)"}</p>
            {exercisesLoaded && p.exerciseLabels.map((l) => (
              <label key={l} className="flex items-center gap-2">
                <span className="w-40 truncate">{l}</span>
                <select aria-label={`Exercice Nolio pour ${l}`} className="flex-1 rounded-md border bg-background p-1" value={exMap[l] ?? ""} onChange={(e) => setExMap({ ...exMap, [l]: e.target.value })}>
                  <option value="">— non associé (séance refusée) —</option>
                  {refs.exercises.items.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.id}</option>)}
                </select>
              </label>
            ))}
          </>}
          <label className="flex items-center gap-2">Fuseau du calendrier Nolio (IANA, seulement si séances avec heure)
            <input aria-label="Fuseau du calendrier Nolio" className="rounded-md border bg-background p-1" placeholder="ex. Europe/Paris" value={tz} onChange={(e) => setTz(e.target.value.trim())} />
          </label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Je confirme ces associations et le consentement de l'athlète de test</label>
          <Button size="sm" disabled={!canActivate} onClick={() => run({ action: "activate", consent: true, refsDigest: refs.digest, sportIds: chosenSports, exerciseIds: chosenEx, calendarTimeZone: tz || null })}>
            Activer la connexion (aucun envoi)
          </Button>
        </>}
      </div>}
    </div>
  );
}
