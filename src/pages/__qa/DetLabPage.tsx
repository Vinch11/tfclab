/**
 * DEV-ONLY — laboratoire DET (QA). Fonctionne uniquement si : build DEV,
 * backend QA attendu, session vérifiée par getUser(), compte Coach A ou B.
 * Seuls les deux athlètes QA fictifs sont utilisables. Aucune prescription,
 * aucune publication, aucun Nolio. L'IA existante reste inchangée et n'est
 * jamais appelée en repli d'un refus DET.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AIPlanViewer } from "@/components/AIPlanViewer";
import { AthleteProviders } from "@/components/AthleteProviders";
import { AppendOnlyPlanVersionSaver, READBACK_COLUMNS, type SaveResult } from "@/lib/plan/appendOnlyPlanVersionSave";
import {
  QA_COACHES, identifyCoach, isExpectedQaOrigin, readSessionStatus, withTimeout,
  type QaCoachKey, type SessionStatus,
} from "@/pages/__qa/ReadOnlyRlsAuditPage";
import { DET_LAB_SCENARIOS, DET_LAB_PLAN_START, runDetLabScenario, type DetLabOutcome } from "@/qa/det-lab/detLab";
import { CoachDetInputsPanel } from "@/pages/__qa/CoachDetInputsPanel";
import type { CoachDetOutcome } from "@/lib/det/coachDetRun";
import { qaEngineChoiceEnabled } from "@/lib/plan/engineDispatch";

type Verified = { coach: QaCoachKey; userId: string; athleteId: string };

export function detEngineVersionFromRelease(info: unknown): { engineVersion: string | null; releaseId: string | null } {
  const i = info as { components?: Record<string, unknown>; releaseId?: unknown } | undefined;
  const v = i?.components?.["det-engine"];
  return {
    engineVersion: typeof v === "string" && /^[a-f0-9]{64}$/.test(v) ? v : null,
    releaseId: typeof i?.releaseId === "string" ? i.releaseId : null,
  };
}

/** Vérification serveur de l'identité avant toute génération / lecture / écriture. */
export async function verifyQaCoach(options?: { surface: "planning" }): Promise<Verified | { blocked: string }> {
  // The lab remains DEV-only. Only the ordinary planning panel may run in
  // the exact compiled QA preview, with every identity/ownership check below.
  if (options?.surface === "planning") {
    if (!qaEngineChoiceEnabled(import.meta.env.DEV, import.meta.env.VITE_SUPABASE_URL, globalThis.location?.origin)) return { blocked: "Aperçu de planification hors QA." };
  } else if (!import.meta.env.DEV) return { blocked: "Build non DEV." };
  if (!isExpectedQaOrigin(import.meta.env.VITE_SUPABASE_URL as string | undefined)) return { blocked: "Origine backend non QA." };
  try {
    const { data: sess } = await withTimeout(supabase.auth.getSession(), "getSession");
    if (!sess.session) return { blocked: "Aucune session." };
    const { data, error } = await withTimeout(supabase.auth.getUser(), "getUser");
    if (error || !data.user) return { blocked: "getUser() refusé." };
    if (data.user.id !== sess.session.user.id || data.user.role !== "authenticated") return { blocked: "Session incohérente." };
    const coach = identifyCoach(data.user.id);
    if (!coach) return { blocked: "Compte hors Coach A/B QA." };
    return { coach, userId: data.user.id, athleteId: QA_COACHES[coach].athleteId };
  } catch (e) {
    return { blocked: e instanceof Error ? e.message.slice(0, 200) : "Erreur de vérification." };
  }
}

const SAVE_TEXT: Record<SaveResult["status"], string> = {
  CONFIRMED: "Version enregistrée et relue à l'identique.",
  UNKNOWN: "Résultat inconnu : vérifiez l'historique avant de réessayer (un nouvel essai du même contenu réutilise le même identifiant).",
  FAILED: "Refusé par le serveur ; rien n'a été enregistré.",
  BLOCKED: "Bloqué : une ligne différente existe sous cet identifiant. Rien n'a été modifié.",
  IN_PROGRESS: "Une sauvegarde est déjà en cours.",
  NOT_SENT: "Non envoyé : contenu invalide ou empreinte indisponible.",
};

export default function DetLabPage() {
  const [status, setStatus] = useState<SessionStatus>({ kind: "checking" });
  const [scenarioId, setScenarioId] = useState(DET_LAB_SCENARIOS[0].id);
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState<Verified | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<DetLabOutcome | null>(null);
  const [save, setSave] = useState<SaveResult | null>(null);
  const saverRef = useRef<AppendOnlyPlanVersionSaver | null>(null);
  const release = useMemo(() => detEngineVersionFromRelease(typeof __PLAN_RELEASE_INFO__ === "undefined" ? undefined : __PLAN_RELEASE_INFO__), []);

  useEffect(() => {
    let alive = true;
    readSessionStatus().then((s) => { if (alive) setStatus(s); });
    return () => { alive = false; };
  }, []);

  const guard = async (): Promise<Verified | null> => {
    const v = await verifyQaCoach();
    if ("blocked" in v) { setBlocked(v.blocked); setVerified(null); return null; }
    setBlocked(null); setVerified(v); return v;
  };

  const onGenerate = async () => {
    setBusy(true); setOutcome(null); setSave(null); setCoachOutcome(null);
    try {
      if (!(await guard())) return;
      await new Promise((r) => setTimeout(r, 30)); // laisser l'interface afficher « calcul… »
      setOutcome(runDetLabScenario(scenarioId, release));
    } finally { setBusy(false); }
  };

  const [coachOutcome, setCoachOutcome] = useState<CoachDetOutcome | null>(null);
  const [showCoach, setShowCoach] = useState(false);
  const accepted = outcome?.kind === "accepted" ? { plan: outcome.plan, sessions: outcome.sessions, objective: "Marathon", start: DET_LAB_PLAN_START }
    : coachOutcome?.kind === "accepted" ? { plan: coachOutcome.plan, sessions: coachOutcome.sessions, objective: String((coachOutcome.provenance.coachInputs as { objective?: unknown }).objective ?? ""), start: String((coachOutcome.provenance.coachInputs as { planStartDate?: unknown }).planStartDate ?? DET_LAB_PLAN_START) }
    : null;

  const onSave = async () => {
    if (!accepted) return;
    const v = await guard();
    if (!v) return;
    if (!saverRef.current) {
      saverRef.current = new AppendOnlyPlanVersionSaver({
        transport: {
          insert: async (row) => {
            const { error } = await supabase.from("plan_versions").insert(row as never);
            return { error: error ? { code: error.code, message: error.message } : null };
          },
          readById: async (id) => {
            const { data, error } = await supabase.from("plan_versions").select(READBACK_COLUMNS).eq("id", id).maybeSingle();
            return { data: (data as never) ?? null, error: error ? { code: error.code, message: error.message } : null };
          },
        },
      });
    }
    const p = accepted.plan;
    setSave(await saverRef.current.save({
      athlete_id: v.athleteId,
      coach_id: v.userId,
      plan_json: p,
      objective: accepted.objective,
      weeks_count: p.weeks.length,
      sessions_count: accepted.sessions,
      validator_score: null,
      validator_grade: null,
      validator_summary: null,
    }));
  };

  const ready = status.kind === "signed-in" && !!status.coach;

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-4">
      <Card>
        <CardHeader><CardTitle>Laboratoire DET — QA, dev uniquement, NON PRESCRIPTIF</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Génération réelle par le moteur déterministe DET, sur des scénarios synthétiques dont les approbations, horaires
            et placements sont artificiels. Rien ici n'est une prescription ni une validation sportive. Le générateur IA reste
            disponible à part et n'est jamais appelé si DET refuse.
          </p>
          <div className="rounded-md border p-3 space-y-1" data-testid="det-lab-session">
            {status.kind === "checking" && <p>Vérification de la session…</p>}
            {status.kind === "origin-blocked" && <p className="text-destructive font-semibold">BLOCKED — backend non QA.</p>}
            {status.kind === "signed-out" && <p className="font-semibold">Non connecté — connectez-vous avec Coach A ou Coach B.</p>}
            {status.kind === "signed-in" && status.coach && <p>Session : Coach {status.coach} (revérifiée par le serveur à chaque action).</p>}
            {status.kind === "signed-in" && !status.coach && <p className="text-destructive">Compte hors Coach A/B QA — laboratoire bloqué.</p>}
            {status.kind === "blocked" && <p className="text-destructive">BLOCKED — {status.message}</p>}
            {!ready && status.kind !== "checking" && <Button asChild variant="outline" size="sm"><Link to="/auth">Se connecter</Link></Button>}
            <p className="text-xs text-muted-foreground">Version moteur DET : {release.engineVersion ? release.engineVersion.slice(0, 12) : "indisponible"} · déclaration non attestée</p>
          </div>

          <div className="space-y-2">
            <label className="font-medium" htmlFor="det-scenario">Scénario synthétique</label>
            <select id="det-scenario" className="w-full rounded-md border bg-background p-2" value={scenarioId}
              onChange={(e) => { setScenarioId(e.target.value); setOutcome(null); setSave(null); }}>
              {DET_LAB_SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onGenerate} disabled={busy || !ready}>{busy ? "Calcul…" : "Générer avec DET Engine (synthétique)"}</Button>
              <Button variant="outline" onClick={() => { setShowCoach((x) => !x); setOutcome(null); setSave(null); }} disabled={busy || !ready}>DET avec les entrées coach</Button>
              <Button asChild variant="ghost"><Link to="/__qa/pilot-review">Revue pilote QA</Link></Button>
              <Button asChild variant="ghost"><Link to="/planning/ai-plan">Parcours IA existant (inchangé)</Link></Button>
            </div>
          </div>

          {blocked && <p className="text-destructive font-semibold" data-testid="det-lab-blocked">BLOCKED — {blocked}</p>}
          {verified && <p className="text-xs text-muted-foreground">Identité vérifiée : Coach {verified.coach} · athlète QA fictif uniquement.</p>}

          {showCoach && ready && (
            <CoachDetInputsPanel guard={guard} sourcesVersion={release.engineVersion} engineVersion={release.engineVersion} releaseId={release.releaseId}
              onOutcome={(o) => { setCoachOutcome(o); setSave(null); }} />
          )}

          {outcome?.kind === "refused" && (
            <div className="rounded-md border border-destructive p-3 space-y-1" data-testid="det-lab-refusal">
              <p className="font-semibold text-destructive">Refus DET{outcome.expectedRefusal ? " (refus historique attendu)" : ""} : {outcome.reason}</p>
              {outcome.blockingCodes.length > 0 && <p className="text-xs">Contrôles bloquants : {outcome.blockingCodes.join(", ")}</p>}
              <p className="text-xs">Aucun plan produit, aucune bascule vers l'IA. Nœuds explorés : {outcome.nodes}.</p>
            </div>
          )}
          {outcome?.kind === "blocked" && <p className="text-destructive font-semibold" data-testid="det-lab-run-blocked">BLOCKED — {outcome.reason}</p>}

          {accepted && (
            <div className="space-y-2" data-testid="det-lab-accepted">
              <p className="font-semibold">{outcome?.kind === "accepted" ? `Candidat DET accepté par les contrôles stricts du scénario — ${outcome.plan.weeks.length} semaines, ${outcome.sessions} séances, ${outcome.nodes} nœuds.` : `Candidat DET (entrées coach) — ${accepted.plan.weeks.length} semaines, ${accepted.sessions} séances.`} NON PRESCRIPTIF.</p>
              <Button onClick={onSave} disabled={save?.status === "CONFIRMED"}>Enregistrer comme version QA (append-only)</Button>
              {save && <p data-testid="det-lab-save" className={save.status === "CONFIRMED" ? "" : "text-destructive"}>{save.status} — {SAVE_TEXT[save.status]} ({save.reason})</p>}
              {save?.status === "CONFIRMED" && <p className="text-xs">Rouvrir / restaurer / PDF : ouvrez le parcours Plan IA pour l'athlète QA, puis l'historique des versions.</p>}
            </div>
          )}
        </CardContent>
      </Card>
      {accepted && (
        // Le lecteur réel dépend des providers de données (lecture RLS du coach) ; montés seulement
        // après une génération acceptée, donc après la vérification getUser + Coach A/B.
        <AthleteProviders>
          <AIPlanViewer plan={accepted.plan} startDate={new Date(`${accepted.start}T00:00:00`)} athleteName="Athlète QA fictif" />
        </AthleteProviders>
      )}
    </div>
  );
}
