import { RealVerificationHistory } from "@/components/plan/RealVerificationHistory";
/**
 * DEV + QA uniquement — /__qa/pilot-review. Revue des étapes restantes sur
 * plans DET SYNTHÉTIQUES NON PRESCRIPTIFS. Aucune IA, aucun Nolio réseau,
 * aucune attestation ; l'avis QA est enregistré seulement au clic explicite.
 */
import { HumanCoachReview } from "@/components/plan/HumanCoachReview";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { buildPlanHTML, exportAIPlanToPDF } from "@/lib/aiPlanPDFExport";
import { buildDetExpectations, checkPdfHtml } from "@/lib/plan/detExportConformity";
import { QA_COACHES, identifyCoach, isExpectedQaOrigin, readSessionStatus, withTimeout, type QaCoachKey, type SessionStatus } from "@/pages/__qa/ReadOnlyRlsAuditPage";
import { detEngineVersionFromRelease } from "@/pages/__qa/DetLabPage";
import { DET_LAB_PLAN_START, DET_LAB_SCENARIOS, runDetLabScenario, type DetLabOutcome } from "@/qa/det-lab/detLab";
import {
  DECISIONS, NOLIO_PREREQUISITES, PILOT_CHECKLIST, REVIEW_CRITERIA, REVIEW_LABEL, emptyDraft, limiterEvidence, missingSessionFields,
  nolioOfflinePreview, planSha256, planEngineBinding, DECISION_LABELS, submitReview, weekSummaries, type Draft, type ReviewDb, type ReviewSubject, type SubmitResult,
} from "@/qa/pilot-review/review";
import { validateNolioAuthorizeUrl } from "@/qa/pilot-review/nolioAuthorizeUrl";
import { usePreparedNolioLink } from "@/qa/pilot-review/usePreparedNolioLink";
import { NolioConnectPanel } from "@/qa/pilot-review/NolioConnectPanel";
import { createV2Runner, describeOutcome, StaleRun, type RunCtx, NOLIO_ACTION_CLIENT_MS, NOLIO_LOAD_REFS_CLIENT_MS } from "@/qa/pilot-review/boundedV2Action";
import { NolioV2ProgressPanel, type V2StatusView } from "@/qa/pilot-review/NolioV2ProgressPanel";
import { parseRealSendResp, gateFr, type RealSendResp } from "@/qa/pilot-review/realSendView";
import { TeamScopeDetails } from "@/qa/pilot-review/TeamScopeDetails";
import { DRY_RUN_FIXTURE_CODE, parseDryRunResponse, verifyReceipt, type DryRunView } from "@/qa/pilot-review/dryRunReceipt";
import { DRY_RUN_FIXTURE_PREVIEW as DRY_RUN_PREVIEW } from "../../../supabase/functions/_shared/nolioV2/dryRun";
import { TRIAL_PREVIEW } from "../../../supabase/functions/_shared/nolioV2/trialSession";
import { parseTrialResponse, verifyTrialReceipts, TRIAL_RECEIPT_COLS, TRIAL_RECIPE_CODE, type TrialView } from "@/qa/pilot-review/trialReceipt";
import { sessionsFromPlanJson } from "../../../supabase/functions/_shared/nolioV2/planSessions";
import { requiredExerciseLabels } from "../../../supabase/functions/_shared/nolioV2/plannedMapper";
import { parsePlanDryResp, confirmFullPlanDryRun, reasonFr, runPlanDrySequence, stopFr, PLAN_DRY_JOB_COLS, PLAN_DRY_RECEIPT_COLS, PLAN_DRY_SEQ_TOTAL_MS, PLAN_DRY_SEQ_CALL_MS, type PlanDryResp } from "@/qa/pilot-review/planDryRunView";
import { canonical, sha256Hex } from "../../../supabase/functions/_shared/nolioV2/dryRun";
import { raceIdentityOf } from "../../../supabase/functions/_shared/nolioV2/plannedMapper";
type PlanDryState = { coachId: string; planVersionId: string; resp: PlanDryResp | null; confirm: Awaited<ReturnType<typeof confirmFullPlanDryRun>> | null; message: string | null; seq?: string | null };

type Who = { coach: QaCoachKey; coachId: string; athleteId: string };

/** getSession + getUser serveur + compte A/B + athlète possédé. Fail-closed. */
export async function pilotGuard(): Promise<Who | { blocked: string }> {
  if (!import.meta.env.DEV) return { blocked: "Build non DEV." };
  if (!isExpectedQaOrigin(import.meta.env.VITE_SUPABASE_URL as string | undefined)) return { blocked: "Backend non QA." };
  try {
    const { data: s } = await withTimeout(supabase.auth.getSession(), "getSession");
    if (!s.session) return { blocked: "Non connecté dans ce navigateur." };
    const { data, error } = await withTimeout(supabase.auth.getUser(), "getUser");
    if (error || !data.user || data.user.id !== s.session.user.id) return { blocked: "getUser() refusé ou incohérent." };
    const coach = identifyCoach(data.user.id);
    if (!coach) return { blocked: "Compte hors Coach A/B QA." };
    const athleteId = QA_COACHES[coach].athleteId;
    const a = await withTimeout(supabase.from("athletes").select("id,coach_id").eq("id", athleteId).maybeSingle(), "athlète");
    if (a.error || !a.data || a.data.coach_id !== data.user.id) return { blocked: "Athlète QA non possédé ou illisible." };
    return { coach, coachId: data.user.id, athleteId };
  } catch (e) { return { blocked: e instanceof Error ? e.message.slice(0, 200) : "Erreur." }; }
}

type Source = { kind: "scenario"; id: string; plan: ParsedPlan & Record<string, unknown> } | { kind: "owned_version"; id: string; plan: ParsedPlan & Record<string, unknown> };
const MODES = [["portrait", "full"], ["portrait", "compact"], ["landscape", "full"], ["landscape", "compact"]] as const;

export default function PilotReviewPage() {
  const [status, setStatus] = useState<SessionStatus>({ kind: "checking" });
  const [who, setWho] = useState<Who | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState(DET_LAB_SCENARIOS[0].id);
  const [outcome, setOutcome] = useState<DetLabOutcome | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [sha, setSha] = useState<string | null>(null);
  const [owned, setOwned] = useState<{ id: string; created_at: string; plan: ParsedPlan & Record<string, unknown> }[] | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [submit, setSubmit] = useState<SubmitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const release = useMemo(() => detEngineVersionFromRelease(typeof __PLAN_RELEASE_INFO__ === "undefined" ? undefined : __PLAN_RELEASE_INFO__), []);

  useEffect(() => { let on = true; readSessionStatus().then((s) => on && setStatus(s)); return () => { on = false; }; }, []);
  // Tout changement de plan invalide le brouillon.
  useEffect(() => { setDraft(emptyDraft()); setSubmit(null); setSha(null); if (source) planSha256(source.plan).then(setSha); }, [source]);

  const guard = async () => { const g = await pilotGuard(); if ("blocked" in g) { setBlocked(g.blocked); setWho(null); return null; } setBlocked(null); setWho(g); return g; };
  const ready = status.kind === "signed-in" && !!status.coach;

  const onGenerate = async () => {
    setBusy(true); setOutcome(null); setSource(null);
    try {
      if (!(await guard())) return;
      await new Promise((r) => setTimeout(r, 30));
      const o = runDetLabScenario(scenarioId, release);
      setOutcome(o);
      if (o.kind === "accepted") setSource({ kind: "scenario", id: scenarioId, plan: o.plan });
    } finally { setBusy(false); }
  };

  const onLoadOwned = async () => {
    const g = await guard(); if (!g) return;
    const { data, error } = await withTimeout(supabase.from("plan_versions").select("id,created_at,plan_json").eq("athlete_id", g.athleteId).eq("coach_id", g.coachId).order("created_at", { ascending: false }).limit(50), "versions");
    if (error) { setBlocked(`Lecture versions : ${error.message}`); return; }
    // Seulement les vraies sorties DET structurées ; fixtures de stockage exclues.
    setOwned((data ?? []).flatMap((r) => {
      const p = r.plan_json as Record<string, unknown>;
      const prov = p?._provenance as Record<string, unknown> | undefined;
      const structured = Array.isArray(p?.weeks) && (p.weeks as { sessions?: unknown[] }[]).some((w) => (w.sessions ?? []).some((s) => !!(s as Record<string, unknown>).detStructuredWorkout));
      return ((prov?.engine === "det" && structured) || prov?.engine === "ai") && !p._qaRecipe ? [{ id: r.id, created_at: r.created_at, plan: p as ParsedPlan & Record<string, unknown> }] : [];
    }));
  };

  const start = typeof source?.plan._planStartDate === "string" ? source.plan._planStartDate : DET_LAB_PLAN_START;
  const pdfChecks = useMemo(() => {
    if (!source) return [];
    const exp = buildDetExpectations(source.plan as never, start);
    return MODES.map(([o, d]) => {
      try {
        const html = buildPlanHTML(source.plan, "QA_DET synthétique", new Date(start), undefined, o, d);
        const inc = checkPdfHtml(exp, html, start);
        return { mode: `${o}/${d}`, ok: inc.length === 0, n: inc.length, first: inc.slice(0, 3).map((i) => `${i.code}: ${i.detail}`) };
      } catch (e) { return { mode: `${o}/${d}`, ok: false, n: -1, first: [`export indisponible : ${e instanceof Error ? e.message : "?"}`] }; }
    });
  }, [source, start]);
  const weeks = useMemo(() => (source ? weekSummaries(source.plan) : []), [source]);
  const nolio = useMemo(() => (source ? nolioOfflinePreview(source.plan) : null), [source]);
  // Scénario généré maintenant : moteur du plan == moteur chargé. Version sauvegardée : moteur d'origine.
  const binding = useMemo(() => (source ? planEngineBinding(source.plan, source.kind === "scenario" ? release.engineVersion : undefined) : null), [source, release.engineVersion]);

  const onSubmit = async () => {
    if (!source || !sha || !binding || binding.ok === false) return;
    setBusy(true);
    const subject: ReviewSubject = { sourceKind: source.kind, scenarioId: source.kind === "scenario" ? source.id : null, planVersionId: source.kind === "owned_version" ? source.id : null, planSha256: sha, engineComponentHash: binding.engineVersion, releaseId: binding.releaseId };
    try {
      setSubmit(await submitReview({ db: supabase as unknown as ReviewDb, recheck: async () => { const g = await guard(); return g ? { coachId: g.coachId, athleteId: g.athleteId } : null; }, currentPlan: source.plan, subject, draft }));
    } finally { setBusy(false); }
  };

  // ---- Nolio V2 OAuth (QA) : actions uniquement sur clic délibéré ----
  const [v2, setV2] = useState<Record<string, unknown> | null>(null);
  const [v2Pick, setV2Pick] = useState<string>("");
  const [v2Consent, setV2Consent] = useState(false);
  const v2Return = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("nolio_v2") : null;
  // Garde + invoke PURS : aucun setter ici. Les effets (who/blocked/état) ne sont appliqués
  // par l'appelant que si l'exécution est encore courante (ni expirée, ni invalidée, ni démontée).
  type V2Res = { who: Who | null; blocked: string | null; data: Record<string, unknown> | null };
  const guardedInvoke = async (body: Record<string, unknown>, ctx: RunCtx): Promise<V2Res> => {
    const g = await pilotGuard();
    if (!ctx.isCurrent()) throw new StaleRun();
    if ("blocked" in g) return { who: null, blocked: g.blocked, data: null };
    const { data, error } = await supabase.functions.invoke("nolio-v2-oauth", { body: { ...body, athleteId: g.athleteId }, signal: ctx.signal });
    if (!ctx.isCurrent()) throw new StaleRun();
    return { who: g, blocked: null, data: error ? { status: "BLOCKED", reason: "appel_fonction_echoue" } : (data as Record<string, unknown>) };
  };
  const planSports = useMemo(() => {
    const ss = source ? sessionsFromPlanJson(source.plan).sessions.filter((x) => !x.isRest).map((x) => x.sport).filter(Boolean) : [];
    return ss.length ? [...new Set(ss)] : ["run", "bike", "swim", "strength"];
  }, [source]);
  // Toutes les feuilles force de la structure sauvegardée (pas seulement le 1er refus par séance).
  const exerciseLabels = useMemo(() => (source ? requiredExerciseLabels(sessionsFromPlanJson(source.plan).sessions) : []), [source]);
  const runner = useRef(createV2Runner()).current;
  const [v2Busy, setV2Busy] = useState<number | null>(null); // budget de l'action en cours (ms) ou null
  const [v2Msg, setV2Msg] = useState<string | null>(null);
  const [v2ReadbackMsg, setV2ReadbackMsg] = useState<string | null>(null);
  const [dry, setDry] = useState<DryRunView | null>(null);
  const [trial, setTrial] = useState<{ coachId: string; athleteName: string | null; nolioName: string | null; date: string | null; view: TrialView } | null>(null);
  const [planDry, setPlanDry] = useState<PlanDryState | null>(null);
  const [planSend, setPlanSend] = useState<{ coachId: string; planVersionId: string; resp: RealSendResp | null; message: string | null } | null>(null);
  const [planSendConsent, setPlanSendConsent] = useState(false);
  const [refsChangedNotice, setRefsChangedNotice] = useState(false);
  const resetV2 = () => { setV2(null); setV2Pick(""); setV2Consent(false); setV2Msg(null); setV2ReadbackMsg(null); setDry(null); setTrial(null); setPlanDry(null); setPlanSend(null); setPlanSendConsent(false); };
  /** Applique l'identité vérifiée renvoyée par l'action (jamais une closure capturée avant await). */
  const applyIdentity = (r: V2Res) => {
    if (r.blocked) { setBlocked(r.blocked); setWho(null); return; }
    setBlocked(null); setWho(r.who);
  };
  /** Exécution bornée sous verrou ; ne rejette jamais ; libère toujours les contrôles. */
  const v2Run = async <T,>(budgetMs: number, fn: (ctx: RunCtx) => Promise<T>) => {
    if (runner.isLocked()) return { kind: "busy" } as const;
    setV2Busy(budgetMs);
    try { return await runner.run(budgetMs, (_s, ctx) => fn(ctx)); } finally { setV2Busy(null); }
  };
  const blockedMsg = (r: V2Res) => (r.blocked ? `Accès bloqué : ${r.blocked}` : null);
  // Vérification d'état seule (20 s, garde comprise).
  const onV2Status = async () => {
    const o = await v2Run(NOLIO_ACTION_CLIENT_MS, (ctx) => guardedInvoke({ action: "status" }, ctx));
    if (o.kind !== "ok") { const m = describeOutcome("status", o); if (m) setV2Msg(m); return; }
    applyIdentity(o.data);
    if (o.data.blocked) { setV2Msg(blockedMsg(o.data)); return; }
    const d = o.data.data;
    if (d && "stages" in d) { setV2(d); setV2Msg(null); } else { setV2Msg(describeOutcome("status", { kind: "ok", data: d })); if (d && !v2) setV2(d); }
  };
  // load_refs / activate : action + UNE relecture sous le même verrou et le même budget global (45 s).
  // Le résultat de l'action est publié dès obtention et reste visible même si la relecture échoue.
  const v2Act = async (body: Record<string, unknown>) => {
    const action = String(body.action);
    let phase: "action" | "readback" = "action";
    const o = await v2Run(NOLIO_LOAD_REFS_CLIENT_MS, async (ctx) => {
      const a = await guardedInvoke(body, ctx);
      applyIdentity(a);
      setV2Msg(blockedMsg(a) ?? describeOutcome(action, { kind: "ok", data: a.data })); setV2ReadbackMsg(null);
      if (a.blocked) return null;
      phase = "readback";
      try { return await guardedInvoke({ action: "status" }, ctx); }
      catch (e) { if (e instanceof StaleRun) throw e; return { who: null, blocked: null, data: null, error: e instanceof Error ? e.message.slice(0, 200) : "erreur" } as V2Res & { error: string }; }
    });
    if (o.kind === "stale" || o.kind === "busy") return;
    if (o.kind !== "ok") {
      const m = describeOutcome(phase === "action" ? action : "status", o);
      if (phase === "action") setV2Msg(m); else setV2ReadbackMsg(`Relecture de l'état non obtenue : ${m}`);
      return;
    }
    const rb = o.data as (V2Res & { error?: string }) | null;
    if (!rb) return;
    if (rb.data && "stages" in rb.data) { applyIdentity(rb); setV2(rb.data); return; }
    setV2ReadbackMsg(`Relecture de l'état non obtenue : ${rb.error ?? rb.blocked ?? describeOutcome("status", { kind: "ok", data: rb.data })}`);
  };
  // VRAI changement d'identité (A→B, A→bloqué) ⇒ invalidation ; la première identité vérifiée n'invalide rien.
  const idRef = useRef<string | null>(null);
  const whoKey = who ? `${who.coachId}|${who.athleteId}` : null;
  useEffect(() => {
    const prev = idRef.current;
    if (prev !== null && whoKey !== prev) { runner.invalidate(); resetV2(); }
    if (whoKey !== null) idRef.current = whoKey; else if (prev !== null) idRef.current = null;
  }, [whoKey, runner]);
  // Auth : seuls déconnexion ou changement d'utilisateur invalident (pas l'initialisation ni un refresh).
  const authUid = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    let on = true;
    const { data } = supabase.auth.onAuthStateChange((ev, session) => {
      const uid = session?.user?.id ?? null;
      const prev = authUid.current; authUid.current = uid;
      if (ev === "SIGNED_OUT" || (prev !== undefined && prev !== uid)) {
        // Une SEULE invalidation, ici. who/idRef sont remis à zéro de façon cohérente pour que
        // l'effet whoKey ne ré-invalide pas la première identité vérifiée sous le nouvel utilisateur.
        runner.invalidate(); resetV2();
        idRef.current = null; setWho(null); setBlocked(null);
        if (ev === "SIGNED_OUT" || uid === null) setStatus({ kind: "signed-out" });
        else { setStatus({ kind: "checking" }); readSessionStatus().then((s) => on && authUid.current === uid && setStatus(s)); }
      }
    });
    return () => { on = false; data.subscription.unsubscribe(); runner.invalidate(); };
  }, [runner]);
  // URL d'autorisation : mémoire React seulement (jamais storage/logs/rapport).
  // Nolio refuse l'iframe Lovable → copie + onglet normal ; aucune navigation de cette frame.
  const sourceKey = source ? `${source.kind}:${source.id}` : "none";
  const { link: v2AuthUrl, setLink: setV2AuthUrl, clear: clearV2AuthUrl } = usePreparedNolioLink({ coachId: who?.coachId ?? null, athleteId: who?.athleteId ?? null, sourceKey, ready });
  const onV2Start = async () => {
    if (busy || runner.isLocked()) return; // pas de demandes concurrentes
    clearV2AuthUrl();
    const key = sourceKey;
    const o = await v2Run(NOLIO_ACTION_CLIENT_MS, (ctx) => guardedInvoke({ action: "start" }, ctx));
    if (o.kind !== "ok") { const m = describeOutcome("start", o); if (m) setV2Msg(m); return; }
    const r = o.data; applyIdentity(r);
    if (r.blocked || !r.who) { setV2Msg(blockedMsg(r)); return; }
    const d = r.data;
    const url = d?.status === "REDIRECT" ? validateNolioAuthorizeUrl(d.authorizeUrl) : null;
    // Clé du lien = identité vérifiée DANS le résultat (pas `who` capturé avant l'await).
    if (url) { setV2AuthUrl({ url, coachId: r.who.coachId, athleteId: r.who.athleteId, sourceKey: key, at: Date.now() }); setV2(null); setV2Msg(null); }
    else if (d?.status === "REDIRECT") setV2({ status: "BLOCKED", reason: "url_autorisation_invalide" });
    else if (d) setV2(d); else setV2Msg(describeOutcome("start", { kind: "ok", data: d }));
  };
  const onV2Select = async () => {
    const o = await v2Run(NOLIO_ACTION_CLIENT_MS, (ctx) => guardedInvoke({ action: "select", nolioAthleteRef: v2Pick, consent: v2Consent }, ctx));
    if (o.kind !== "ok") { const m = describeOutcome("select", o); if (m) setV2Msg(m); return; }
    applyIdentity(o.data);
    if (o.data.blocked) { setV2Msg(blockedMsg(o.data)); return; }
    if (o.data.data) setV2((cur) => ({ ...(cur ?? {}), selection: o.data.data })); else setV2Msg(describeOutcome("select", { kind: "ok", data: null }));
  };
  // Dry_run d'UNE séance technique fixe : clic délibéré seulement ; garde + appel + relecture du reçu
  // sous le MÊME verrou et la même échéance 45 s. Entrée minimale {athleteId, fixtureCode}.
  const onDryRun = async () => {
    setDry(null);
    const o = await v2Run(NOLIO_LOAD_REFS_CLIENT_MS, async (ctx) => {
      const g = await pilotGuard();
      if (!ctx.isCurrent()) throw new StaleRun();
      if ("blocked" in g) return { who: null as Who | null, blocked: g.blocked as string | null, view: null as DryRunView | null };
      const { data, error } = await supabase.functions.invoke("nolio-v2-dry-run", { body: { athleteId: g.athleteId, fixtureCode: DRY_RUN_FIXTURE_CODE }, signal: ctx.signal });
      if (!ctx.isCurrent()) throw new StaleRun();
      const resp = error ? null : parseDryRunResponse(data);
      if (!resp) return { who: g, blocked: null, view: { kind: "UNCONFIRMED", message: "Résultat non confirmé : réponse du serveur absente ou invalide." } as DryRunView };
      if (!resp.receiptId) return { who: g, blocked: null, view: verifyReceipt(resp, null, g) };
      const rb = await supabase.from("qa_nolio_v2_dry_run_receipts").select("*").eq("id", resp.receiptId).eq("coach_id", g.coachId).maybeSingle();
      if (!ctx.isCurrent()) throw new StaleRun();
      return { who: g, blocked: null, view: verifyReceipt(resp, rb.error ? null : rb.data, g) };
    });
    if (o.kind === "stale" || o.kind === "busy") return;
    if (o.kind !== "ok") { setDry({ kind: "UNCONFIRMED", message: `Résultat non confirmé : ${describeOutcome("dry_run", o) ?? "délai dépassé"}` }); return; }
    if (o.data.blocked) { setBlocked(o.data.blocked); setWho(null); setDry({ kind: "BLOCKED", message: `Accès bloqué : ${o.data.blocked}` }); return; }
    setBlocked(null); setWho(o.data.who); setDry(o.data.view);
  };
  // Essai réel unique : chaque action est un clic explicite ; garde + appel + relecture RLS des reçus
  // sous le MÊME verrou/échéance 45 s. Entrée minimale {athleteId, recipeCode, action}.
  const onTrial = async (action: "prepare" | "send" | "verify") => {
    const o = await v2Run(NOLIO_LOAD_REFS_CLIENT_MS, async (ctx) => {
      const g = await pilotGuard();
      if (!ctx.isCurrent()) throw new StaleRun();
      if ("blocked" in g) return { who: null as Who | null, blocked: g.blocked as string | null, name: null as string | null, nolioName: null as string | null, date: null as string | null, view: null as TrialView | null };
      const nm = await supabase.from("athletes").select("name").eq("id", g.athleteId).eq("coach_id", g.coachId).maybeSingle();
      if (!ctx.isCurrent()) throw new StaleRun();
      const name = nm.error ? null : ((nm.data as { name?: string } | null)?.name ?? null);
      const { data, error } = await supabase.functions.invoke("nolio-v2-trial-session", { body: { athleteId: g.athleteId, recipeCode: TRIAL_RECIPE_CODE, action }, signal: ctx.signal });
      if (!ctx.isCurrent()) throw new StaleRun();
      const resp = error ? null : parseTrialResponse(data);
      if (!resp) return { who: g, blocked: null, name, nolioName: null as string | null, date: null, view: { kind: "UNKNOWN", message: "Résultat inconnu : réponse du serveur absente ou invalide. Aucun nouvel envoi ; vérifiez seulement.", canSend: false, canVerify: action !== "prepare" } as TrialView };
      let rows: unknown[] | null = [];
      if (resp.receiptIds.length) {
        const rb = await supabase.from("qa_nolio_v2_trial_receipts").select(TRIAL_RECEIPT_COLS).in("id", resp.receiptIds).eq("coach_id", g.coachId);
        if (!ctx.isCurrent()) throw new StaleRun();
        rows = rb.error ? null : (rb.data as unknown[]);
      }
      return { who: g, blocked: null, name, nolioName: resp.recipient?.nolioName ?? null, date: resp.trialDate, view: verifyTrialReceipts(resp, rows, g) };
    });
    if (o.kind === "stale" || o.kind === "busy") return;
    if (o.kind !== "ok") { setTrial((t) => ({ coachId: t?.coachId ?? "", athleteName: t?.athleteName ?? null, nolioName: null, date: t?.date ?? null, view: { kind: "UNKNOWN", message: `Résultat inconnu : ${describeOutcome("essai", o) ?? "délai dépassé"} Aucun nouvel envoi ; vérifiez seulement.`, canSend: false, canVerify: action !== "prepare" } })); return; }
    if (o.data.blocked || !o.data.who || !o.data.view) { setBlocked(o.data.blocked); setWho(null); setTrial(null); return; }
    setBlocked(null); setWho(o.data.who); setTrial({ coachId: o.data.who.coachId, athleteName: o.data.name, nolioName: o.data.nolioName, date: o.data.date, view: o.data.view });
  };
  // Plan complet en simulation : précontrôle, UN lot, ou séquence bornée (4 min) de lots, chacun sur clic
  // explicite ; relecture RLS du job + de chaque reçu sous le même verrou. Aucun retry automatique.
  const planStopRef = useRef(false);
  const sourceIdRef = useRef<string | null>(null);
  sourceIdRef.current = source ? `${source.kind}:${source.id}` : null;
  const [planSeqRunning, setPlanSeqRunning] = useState(false);
  const readbackPlanDry = async (g: Who, planVersionId: string, resp: PlanDryResp, plan: unknown, ctx: RunCtx) => {
    if (!resp.progress) return null;
    const j = await supabase.from("qa_nolio_v2_plan_dry_run_jobs").select(PLAN_DRY_JOB_COLS).eq("id", resp.progress.jobId).eq("coach_id", g.coachId).maybeSingle();
    if (!ctx.isCurrent()) throw new StaleRun();
    const rc = await supabase.from("qa_nolio_v2_plan_dry_run_receipts").select(PLAN_DRY_RECEIPT_COLS).eq("job_id", resp.progress.jobId).eq("coach_id", g.coachId).limit(2000);
    if (!ctx.isCurrent()) throw new StaleRun();
    const localPlanSha256 = await sha256Hex(canonical(plan));
    return confirmFullPlanDryRun({ planVersionId, coachId: g.coachId, resp, job: j.error ? null : j.data, receipts: rc.error ? null : (rc.data as unknown[]), localPlanSha256 });
  };
  /** Un appel serveur borné à PLAN_DRY_SEQ_CALL_MS, annulé aussi par l'échéance globale. */
  const invokePlanDry = async (planVersionId: string, action: "precheck" | "run", ctx: RunCtx): Promise<PlanDryResp | null> => {
    const ctl = new AbortController();
    const onAbort = () => ctl.abort();
    ctx.signal.addEventListener("abort", onAbort);
    let t: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<null>((r) => { t = setTimeout(() => { ctl.abort(); r(null); }, Math.min(PLAN_DRY_SEQ_CALL_MS, ctx.remainingMs())); });
      const call = supabase.functions.invoke("nolio-v2-plan-dry-run", { body: { planVersionId, action }, signal: ctl.signal }).then(({ data, error }) => (error ? null : parsePlanDryResp(data)));
      return await Promise.race([call, timeout]);
    } catch { return null; } finally { clearTimeout(t); ctx.signal.removeEventListener("abort", onAbort); }
  };
  const onPlanDry = async (action: "precheck" | "run" | "sequence") => {
    if (source?.kind !== "owned_version") return;
    const planVersionId = source.id, plan = source.plan;
    planStopRef.current = false;
    if (action === "sequence") setPlanSeqRunning(true);
    const o = await v2Run(action === "sequence" ? PLAN_DRY_SEQ_TOTAL_MS + 20_000 : NOLIO_LOAD_REFS_CLIENT_MS, async (ctx) => {
      const g = await pilotGuard();
      if (!ctx.isCurrent()) throw new StaleRun();
      if ("blocked" in g) return { who: null as Who | null, blocked: g.blocked as string | null, view: null as PlanDryState | null };
      let resp: PlanDryResp | null, seq: string | null = null;
      if (action === "sequence") {
        const out = await runPlanDrySequence({
          runBatch: async () => {
            // Garde identité AVANT chaque lot : même coach, même athlète, même version de plan.
            const again = await pilotGuard();
            if (!ctx.isCurrent() || "blocked" in again || again.coachId !== g.coachId || again.athleteId !== g.athleteId || sourceIdRef.current !== `owned_version:${planVersionId}`) throw new StaleRun();
            return invokePlanDry(planVersionId, "run", ctx);
          },
          isCurrent: ctx.isCurrent, stopRequested: () => planStopRef.current, now: Date.now,
          sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
          onProgress: (r) => { if (ctx.isCurrent()) setPlanDry({ coachId: g.coachId, planVersionId, resp: r, confirm: null, message: null, seq: "en cours" }); },
        });
        if (out.stop === "stale") throw new StaleRun();
        resp = out.last; seq = stopFr(out.stop);
      } else resp = await invokePlanDry(planVersionId, action, ctx);
      if (!ctx.isCurrent()) throw new StaleRun();
      if (!resp) return { who: g, blocked: null, view: { coachId: g.coachId, planVersionId, resp: null, confirm: null, seq, message: "Résultat inconnu : réponse absente ou invalide. Rien n'est relancé automatiquement." } };
      const confirm = await readbackPlanDry(g, planVersionId, resp, plan, ctx);
      return { who: g, blocked: null, view: { coachId: g.coachId, planVersionId, resp, confirm, message: null, seq } };
    });
    setPlanSeqRunning(false);
    if (o.kind === "stale" || o.kind === "busy") return;
    if (o.kind !== "ok") { setPlanDry({ coachId: who?.coachId ?? "", planVersionId, resp: null, confirm: null, message: `Résultat inconnu : ${describeOutcome("simulation", o) ?? "délai dépassé"} Reprise seulement par un nouveau clic.` }); return; }
    if (o.data.blocked || !o.data.who || !o.data.view) { setBlocked(o.data.blocked); setWho(null); setPlanDry(null); return; }
    setBlocked(null); setWho(o.data.who); setPlanDry(o.data.view);
  };
  // Correspondances modifiées ⇒ la simulation affichée ne s'applique plus (reçus conservés côté serveur).
  const activeRefsSha = (v2 && "stages" in v2 ? (v2 as V2StatusView).activeRefs?.sha256 : null) ?? null;
  const prevRefsSha = useRef<string | null>(null);
  useEffect(() => {
    if (prevRefsSha.current && activeRefsSha && prevRefsSha.current !== activeRefsSha) { setPlanDry(null); setPlanSend(null); setPlanSendConsent(false); setRefsChangedNotice(true); }
    prevRefsSha.current = activeRefsSha;
  }, [activeRefsSha]);
  const onPlanSend = async (action: "precheck" | "send" | "verify") => {
    if (source?.kind !== "owned_version" || !planDry?.resp?.progress || !planDry.confirm?.confirmed) return;
    const planVersionId = source.id, r = planDry.resp;
    const expected = { planSha256: r.planSha256, refsSha256: r.refsSha256, opsSha256: r.opsSha256, jobId: r.progress!.jobId };
    const o = await v2Run(NOLIO_LOAD_REFS_CLIENT_MS, async (ctx) => {
      const g = await pilotGuard();
      if (!ctx.isCurrent()) throw new StaleRun();
      if ("blocked" in g) return { g: null, resp: null };
      const call = supabase.functions.invoke("nolio-v2-send-plan", { body: { planVersionId, action, expected, ...(action === "verify" ? {fromIndex:planSend?.resp?.verifyNextIndex??0}:{}), consent: planSendConsent === true } })
        .then(({ data, error }) => (error ? null : parseRealSendResp(data)));
      const t = new Promise<null>((res) => setTimeout(() => res(null), Math.min(PLAN_DRY_SEQ_CALL_MS, ctx.remainingMs())));
      const resp = await Promise.race([call, t]);
      if (!ctx.isCurrent()) throw new StaleRun();
      return { g, resp };
    });
    if (o.kind === "stale" || o.kind === "busy") return;
    if (o.kind !== "ok" || !o.data.g) { setPlanSend({ coachId: who?.coachId ?? "", planVersionId, resp: null, message: "Résultat inconnu : rien n'est relancé automatiquement. Vérifiez avant toute nouvelle action." }); return; }
    setPlanSend({ coachId: o.data.g.coachId, planVersionId, resp: o.data.resp, message: o.data.resp ? null : "Résultat inconnu : réponse absente ou invalide. Aucun renvoi automatique." });
  };
  const raceSource = useMemo(() => {
    const rs = source ? sessionsFromPlanJson(source.plan).sessions.map(raceIdentityOf).filter((x): x is NonNullable<typeof x> => !!x) : [];
    return rs.length === 1 ? { date: rs[0].date, name: rs[0].name, sport: rs[0].sport } : null;
  }, [source]);
  const v2Active = typeof v2?.activeConnections === "number" && (v2.activeConnections as number) >= 1;
  const v2Grant = (v2?.grant ?? null) as null | { status: string; appType: string; scopes: string[]; allowedAthletes: { id: string; name: string; has_api_access: boolean }[]; selectedAthleteRef: string | null; tokenExpiresAt: string; tokenExpired: boolean };

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-4 text-sm">
      <Card>
        <CardHeader><CardTitle>Revue pilote QA — plans DET SYNTHÉTIQUES NON PRESCRIPTIFS</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">{REVIEW_LABEL}</p>
          <div data-testid="pilot-session" className="rounded-md border p-3 space-y-1">
            {status.kind === "checking" && <p>Vérification de la session…</p>}
            {status.kind === "origin-blocked" && <p className="text-destructive font-semibold">BLOCKED — backend non QA.</p>}
            {status.kind === "signed-out" && <p className="font-semibold">Non connecté dans ce navigateur — boutons inactifs, aucune lecture ni écriture.</p>}
            {status.kind === "signed-in" && status.coach && <p>Session : Coach {status.coach} (revérifiée par le serveur à chaque action).</p>}
            {status.kind === "signed-in" && !status.coach && <p className="text-destructive">Compte hors Coach A/B — page bloquée.</p>}
            {status.kind === "blocked" && <p className="text-destructive">BLOCKED — {status.message}</p>}
            {!ready && status.kind !== "checking" && <Button asChild variant="outline" size="sm"><Link to="/auth">Se connecter</Link></Button>}
            <p className="text-xs text-muted-foreground">Moteur DET : {release.engineVersion?.slice(0, 12) ?? "indisponible"} · release {release.releaseId?.slice(0, 12) ?? "?"} · non attesté</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link className="underline" to="/__qa/det-lab">Labo DET</Link><Link className="underline" to="/__qa/coach-a-recipe">Recette Coach A</Link><Link className="underline" to="/__qa/rls-audit">Audit RLS</Link>
          </div>
          {blocked && <p data-testid="pilot-blocked" className="text-destructive font-semibold">BLOCKED — {blocked}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>1. Plan à revoir</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <select aria-label="Scénario" className="w-full rounded-md border bg-background p-2" value={scenarioId} onChange={(e) => { setScenarioId(e.target.value); setOutcome(null); setSource(null); }}>
            {DET_LAB_SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onGenerate} disabled={busy || !ready}>{busy ? "Calcul…" : "Générer ce scénario avec DET Engine"}</Button>
            <Button variant="outline" onClick={onLoadOwned} disabled={busy || !ready}>Mes versions DET / IA sauvegardées</Button>
          </div>
          {outcome && outcome.kind !== "accepted" && (
            <p data-testid="pilot-refusal" className="text-destructive">Refus/blocage DET (aucune bascule IA) : {outcome.reason}{outcome.kind === "refused" ? ` · codes ${outcome.blockingCodes.join(", ")}` : ""}</p>
          )}
          {owned && (owned.length === 0 ? <p>Aucune version DET structurée à vous.</p> : owned.map((v) => (
            <Button key={v.id} variant="ghost" size="sm" onClick={() => setSource({ kind: "owned_version", id: v.id, plan: v.plan })}>{v.created_at.slice(0, 16)} · {String(v.plan.title ?? "").slice(0, 70)} · {v.id.slice(0, 8)}</Button>
          )))}
        </CardContent>
      </Card>

      {source && (
        <>
          <Card>
            <CardHeader><CardTitle>{String(source.plan.title ?? "")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold text-destructive">QA — PLAN FICTIF / NON PRESCRIPTIF</p>
              <p className="text-xs">Empreinte canonique : {sha ?? "calcul…"}</p>
              {source.kind === "owned_version" && <><HumanCoachReview key={source.id} planVersionId={source.id} plan={source.plan}/><RealVerificationHistory planVersionId={source.id}/></>}
              <p data-testid="pilot-engine-binding" className="text-xs">{binding?.ok ? `Moteur ayant généré ce plan : ${binding.engineVersion.slice(0, 12)} · release ${binding.releaseId?.slice(0, 12) ?? "non renseignée"}` : `Moteur du plan : REFUSÉ — ${binding && binding.ok === false ? binding.reason : "?"} (avis impossible)`} · code chargé : {release.engineVersion?.slice(0, 12) ?? "indisponible"}</p>
              <p>{limiterEvidence(source.plan) ?? "Preuve limiteur/spécifique : non portée par ce plan (non affichée, jamais inventée)."}</p>
              <div className="overflow-auto"><table className="w-full text-xs"><thead><tr><th className="text-left">Sem.</th><th className="text-left">Phase</th><th>Séances</th><th>Min. prévues</th><th className="text-left">Récupération nommée</th><th className="text-left">Minutes par domaine (calculées depuis la structure)</th></tr></thead>
                <tbody>{weeks.map((w) => <tr key={String(w.weekNumber)} className="border-t"><td>{w.weekNumber}</td><td>{w.phase ?? "—"}</td><td className="text-center">{w.sessions}</td><td className="text-center">{w.plannedMin ?? "manquant"}</td><td>{w.recoveryLabel ?? "non nommée"}</td><td>{Object.entries(w.domainMin).map(([k, v]) => `${k} ${v}`).join(" · ")}{w.unstructured ? ` · ${w.unstructured} séance(s) sans structure` : ""}</td></tr>)}</tbody></table></div>
              <details><summary className="cursor-pointer font-medium">Séances (contenu exact)</summary>
                {(source.plan.weeks as unknown as { weekNumber: number; sessions: Record<string, unknown>[] }[]).map((w) => w.sessions.filter((s) => !s.isRest).map((s, i) => (
                  <div key={`${w.weekNumber}-${i}`} className="border-t py-1">
                    <p className="font-medium">S{w.weekNumber} · {String(s.dayName)} · {String(s.sport)} · {String(s.title)} · {typeof s.durationMin === "number" ? `${s.durationMin} min` : "durée manquante"} · source {String(s.catalogId ?? "manquante")}</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">{String(s.details ?? "")}</p>
                    {s.detStructuredWorkout ? <details><summary className="cursor-pointer text-xs">Structure sauvegardée (exacte)</summary><pre className="max-h-64 overflow-auto text-xs">{JSON.stringify(s.detStructuredWorkout, null, 2)}</pre></details> : <p className="text-xs">Structure : absente{s.detStructureRefusal ? ` (refus : ${String((s.detStructureRefusal as { reason?: unknown }).reason)})` : ""}</p>}
                    {s.coachStart ? <p className="text-xs">Créneau coach : {JSON.stringify(s.coachStart)}</p> : null}
                    {missingSessionFields(s).length > 0 && <p className="text-xs">Champs absents : {missingSessionFields(s).join(", ")}</p>}
                  </div>
                )))}
              </details>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>2. PDF — contrôle automatique par séance (HTML) puis revue visuelle humaine</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {pdfChecks.map((c) => <p key={c.mode} data-testid="pilot-pdf-check"><b className={c.ok ? "" : "text-destructive"}>{c.ok ? "CONFORME_HTML" : "INCOMPATIBLE"}</b> — {c.mode}{c.ok ? "" : ` (${c.n}) ${c.first.join(" ; ")}`}</p>)}
              <p className="text-muted-foreground">Contrôle HTML seulement : la mise en page imprimée doit être vérifiée visuellement.</p>
              <div className="flex flex-wrap gap-2">{MODES.map(([o, d]) => <Button key={`${o}${d}`} variant="outline" size="sm" onClick={() => exportAIPlanToPDF(source.plan, "QA_DET synthétique", new Date(start), undefined, o, d)}>Ouvrir PDF {o}/{d}</Button>)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>3. Avis QA humain (synthétique)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {REVIEW_CRITERIA.map((c) => (
                <div key={c.code} className="space-y-1">
                  <p className="font-medium">{c.label} — {draft[c.code].decision ? DECISION_LABELS[draft[c.code].decision!] : "non répondu"}</p>
                  <div className="flex flex-wrap gap-2">{DECISIONS.map((d) => <Button key={d} size="sm" variant={draft[c.code].decision === d ? "default" : "outline"} disabled={!ready} onClick={() => setDraft({ ...draft, [c.code]: { ...draft[c.code], decision: d } })}>{DECISION_LABELS[d]}</Button>)}</div>
                  <textarea aria-label={`Commentaire ${c.label}`} className="w-full rounded-md border bg-background p-2" rows={2} maxLength={4000} disabled={!ready} value={draft[c.code].comment} onChange={(e) => setDraft({ ...draft, [c.code]: { ...draft[c.code], comment: e.target.value } })} />
                </div>
              ))}
              <Button onClick={onSubmit} disabled={busy || !ready || !sha || !binding?.ok}>Enregistrer cet avis QA</Button>
              <p className="text-xs text-muted-foreground">N'accorde jamais : attestation sportive, prescription, qualification de source, release, envoi Nolio.</p>
              {submit && <p data-testid="pilot-submit" className={submit.status === "CONFIRMED" ? "font-semibold" : "text-destructive font-semibold"}>{submit.status} — {"id" in submit ? submit.id : submit.reason}</p>}
            </CardContent>
          </Card>

          {nolio && (
            <Card>
              <CardHeader><CardTitle>4. Nolio V2 — aperçu du mapper local (références synthétiques, indépendant de la connexion réelle)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p>{nolio.note} Requêtes envoyées : {nolio.requestsSent}.</p>
                {nolio.map === null ? <p data-testid="pilot-nolio-extraction" className="text-destructive">Extraction refusée (comme l'expéditeur réel) : {nolio.extractionProblems.slice(0, 10).join(" ; ")}</p> : <>
                <p>Opérations mappées localement : {nolio.map.operations.length} · refus : {nolio.map.refusals.length}</p>
                {nolio.map.refusals.slice(0, 10).map((r) => <p key={r.sessionKey} className="text-xs">{r.sessionKey} : {r.reason}</p>)}
                <details><summary className="cursor-pointer">Charge utile locale (1re opération)</summary><pre className="max-h-80 overflow-auto text-xs">{JSON.stringify(nolio.map.operations[0] ?? null, null, 2)}</pre></details></>}
                <p className="font-medium">Prérequis restants :</p>
                <ul className="list-disc pl-5">{NOLIO_PREREQUISITES.map((p) => <li key={p}>{p}</li>)}</ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Card>
        <CardHeader><CardTitle>Connexion Nolio V2 (QA) — jamais active automatiquement</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {v2Return && <p data-testid="nolio-v2-return">Retour Nolio : {v2Return}</p>}
          <p className="text-muted-foreground">Aucune action sans clic. L'autorisation crée seulement une demande EN ATTENTE ; pas de connexion active automatique ni d'envoi calendrier ; une simulation n'a lieu qu'au clic sur son bouton dédié.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onV2Status} disabled={busy || v2Busy !== null || !ready}>Vérifier l'état de connexion Nolio V2</Button>
            <Button variant="outline" onClick={onV2Start} disabled={busy || v2Busy !== null || !ready}>{v2AuthUrl ? "Préparer une nouvelle demande Nolio" : "1. Préparer la connexion Nolio V2 (QA)"}</Button>
          </div>
          {ready && <NolioConnectPanel link={v2AuthUrl} onExpired={clearV2AuthUrl} />}
          {v2Busy !== null && <p role="status" data-testid="nolio-v2-busy">Action Nolio en cours… (fin garantie en {Math.round(v2Busy / 1000)} s maximum)</p>}
          {v2Msg && <p role="status" data-testid="nolio-v2-msg">{v2Msg}</p>}
          {v2ReadbackMsg && <p className="text-muted-foreground" data-testid="nolio-v2-readback">{v2ReadbackMsg}</p>}
          {v2 && <div data-testid="nolio-v2-status" className="space-y-1">
            {"status" in v2 && v2.status === "BLOCKED" && <p className="text-destructive">BLOCKED — {String(v2.reason)}</p>}
            {"stages" in v2 && <NolioV2ProgressPanel status={v2 as V2StatusView} busy={busy || v2Busy !== null} ready={ready} identityKey={`${who?.coachId ?? "-"}|${who?.athleteId ?? "-"}`}
              planSports={planSports} exerciseLabels={exerciseLabels} raceSource={raceSource} act={v2Act}
              simulation={dry ? (dry.kind === "CONFIRMED_VALID" ? "CONFIRMED" : "UNCONFIRMED") : "NONE"} />}
            {v2Grant && <p>Autorisation : {v2Grant.status} · type {v2Grant.appType} · scopes {v2Grant.scopes.join(", ")} · expire {v2Grant.tokenExpiresAt}{v2Grant.tokenExpired ? " (EXPIRÉE)" : ""}{v2Grant.selectedAthleteRef ? ` · athlète ${v2Grant.selectedAthleteRef}` : ""}</p>}
            {Array.isArray(v2.remaining) && <ul className="list-disc pl-5">{(v2.remaining as string[]).filter((r) => !/dry_run/i.test(r)).map((r) => <li key={r}>{r}</li>)}</ul>}
            {v2Grant?.status === "pending_athlete_selection" && <div className="space-y-1">
              <select aria-label="Athlète Nolio" className="w-full rounded-md border bg-background p-2" value={v2Pick} onChange={(e) => setV2Pick(e.target.value)}>
                <option value="">— choisir un athlète géré (vérifié par le serveur) —</option>
                {v2Grant.allowedAthletes.map((a) => <option key={a.id} value={a.id} disabled={!a.has_api_access}>{a.name} · {a.id}{a.has_api_access ? "" : " (accès API refusé)"}</option>)}
              </select>
              <label className="flex items-center gap-2"><input type="checkbox" checked={v2Consent} onChange={(e) => setV2Consent(e.target.checked)} /> Je confirme le consentement de cet athlète pour la QA</label>
              <Button size="sm" onClick={onV2Select} disabled={busy || v2Busy !== null || !ready || !v2Pick || !v2Consent}>Associer cet athlète Nolio (reste en attente)</Button>
            </div>}
            {"selection" in v2 && <p>Association : {JSON.stringify(v2.selection)}</p>}
          </div>}
          {v2Active && <div data-testid="nolio-dry-run" className="rounded-md border p-3 space-y-1">
            <p className="font-medium">Tester une séance en simulation</p>
            <p>{DRY_RUN_PREVIEW.name} · course à pied · {DRY_RUN_PREVIEW.durationMin} min</p>
            <p className="text-xs text-muted-foreground">{DRY_RUN_PREVIEW.note}</p>
            <Button size="sm" onClick={onDryRun} disabled={busy || v2Busy !== null || !ready}>Tester la séance sans l'envoyer</Button>
            {dry && <p role="status" data-testid="nolio-dry-run-result" className={dry.kind === "CONFIRMED_VALID" ? "font-semibold" : "text-destructive"}>{dry.message}</p>}
            {dry?.kind === "CONFIRMED_REFUSED" && dry.team && <TeamScopeDetails context={dry.team.context} />}
            <p className="text-xs text-muted-foreground">Preuve de simulation seulement : aucun GO sportif, aucun envoi réel.</p>
          </div>}
          {v2Active && <div data-testid="nolio-trial" className="rounded-md border p-3 space-y-1">
            <p className="font-medium">Essai réel : une seule séance technique</p>
            <p>{TRIAL_PREVIEW.name} · course à pied · {TRIAL_PREVIEW.durationMin} min · sans cible</p>
            <p className="text-xs text-muted-foreground">{TRIAL_PREVIEW.note}</p>
            {trial && trial.coachId === who?.coachId && <p data-testid="nolio-trial-target">Destinataire Nolio : {trial.nolioName ?? "non confirmé (envoi bloqué)"}{trial.date ? ` · date : ${trial.date}` : ""}<span className="text-muted-foreground"> · fiche TFCLab : {trial.athleteName ?? "nom illisible"}</span></p>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onTrial("prepare")} disabled={busy || v2Busy !== null || !ready}>Préparer l'essai (rien n'est envoyé)</Button>
              {trial?.view.canSend && trial.nolioName && trial.coachId === who?.coachId && <Button size="sm" onClick={() => onTrial("send")} disabled={busy || v2Busy !== null || !ready}>Ajouter cette séance de test à Nolio</Button>}
              {trial?.view.canVerify && trial.coachId === who?.coachId && <Button size="sm" variant="outline" onClick={() => onTrial("verify")} disabled={busy || v2Busy !== null || !ready}>Vérifier dans Nolio (lecture seule)</Button>}
            </div>
            {trial && trial.coachId === who?.coachId && <p role="status" data-testid="nolio-trial-result" className={trial.view.kind === "VERIFIED_UNIQUE" ? "font-semibold" : trial.view.kind === "PREPARED" ? "" : "text-destructive"}>{trial.view.message}</p>}
            <p className="text-xs text-muted-foreground">Essai technique unique : aucun GO sportif ; jamais de deuxième envoi.</p>
          </div>}
          {v2Active && <div data-testid="nolio-plan-dry" className="rounded-md border p-3 space-y-1">
            <p className="font-medium">Plan complet : simulation Nolio (rien n'est ajouté au calendrier)</p>
            {source?.kind !== "owned_version"
              ? <p className="text-sm">Choisissez d'abord une version DET sauvegardée (section 1). Un scénario non sauvegardé ne peut pas être simulé.</p>
              : <p className="text-sm">Version sauvegardée {source.id.slice(0, 8)} · {String(source.plan.title ?? "")} · plan synthétique NON PRESCRIPTIF</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onPlanDry("precheck")} disabled={busy || v2Busy !== null || !ready || source?.kind !== "owned_version"}>Contrôler la couverture (aucune requête Nolio)</Button>
              {planDry?.coachId === who?.coachId && planDry?.planVersionId === source?.id && planDry?.resp?.precheck?.complete && !planDry.confirm?.confirmed && <>
                <Button size="sm" onClick={() => onPlanDry("sequence")} disabled={busy || v2Busy !== null || !ready}>{planDry.resp.progress ? "Reprendre la simulation complète (même job)" : "Lancer la simulation complète"} (≤ {Math.round(PLAN_DRY_SEQ_TOTAL_MS / 60000)} min)</Button>
                <Button size="sm" variant="outline" onClick={() => onPlanDry("run")} disabled={busy || v2Busy !== null || !ready}>Un seul lot</Button>
              </>}
              {planSeqRunning && <Button size="sm" variant="destructive" onClick={() => { planStopRef.current = true; }}>Arrêter après le lot en cours</Button>}
            </div>
            <p className="text-xs text-muted-foreground">Séquence : lots de 8 au plus côté serveur, pause entre lots, arrêt sur 429/401/403/inconnu/refus/quota bas ; aucune relance automatique ; une séance déjà validée n'est jamais refaite. Tout est en simulation (dry_run) : rien n'est ajouté au calendrier.</p>
            {planDry && planDry.coachId === who?.coachId && planDry.planVersionId === source?.id && <div data-testid="nolio-plan-dry-result" className="space-y-1 text-sm">
              {planDry.message && <p className="text-destructive">{planDry.message}</p>}
              {planDry.resp && <p>Statut : {planDry.resp.status} ({planDry.resp.code}){planDry.seq ? ` · séquence : ${planDry.seq}` : ""}</p>}
              {planDry.resp?.precheck && (() => { const p = planDry.resp.precheck; return <>
                <p>{p.weeks} semaines · {p.firstDate} → {p.lastDate} · {p.totalSessions} séances source · sports : {p.sports.join(", ")} · compétition : {p.competition}{p.opsByKind ? ` · opérations : ${p.opsByKind.training} séances + ${p.opsByKind.competition} compétition` : ""}</p>
                {p.raceSource && p.competition !== "operation" && <p className="text-destructive">Course objectif de la source : {p.raceSource.name} · {p.raceSource.date} · {p.raceSource.sport} · priorité : non portée par la source. À confirmer explicitement dans la section Nolio V2 (correspondances de la connexion active).</p>}
                <p className={p.complete ? "font-semibold" : "text-destructive"}>Couverture : {p.operations} à simuler + {p.excludedRest} repos exclus + {p.refused} refusées = {p.totalSessions}. {p.complete ? "Couverture intégrale." : "Verdict global BLOQUÉ."}</p>
                {p.missingExercises.length > 0 && <p className="text-destructive">Exercices Nolio manquants sur la connexion active ({p.missingExercises.length}) : {p.missingExercises.join(" · ")}. À confirmer par le coach depuis la bibliothèque officielle chargée (section Nolio V2 ci-dessus) ; rien n'est deviné.</p>}
                {p.missingSports.length > 0 && <p className="text-destructive">Sports à confirmer : {p.missingSports.join(", ")}</p>}
                {p.planProblems.length > 0 && <p className="text-destructive">Problèmes du plan : {p.planProblems.join(", ")}</p>}
                <details><summary>Détail par séance ({p.rows.length})</summary><ul className="max-h-64 overflow-auto text-xs">
                  {p.rows.map((r) => <li key={r.sessionKey}>{r.sessionKey} · {r.date} · {r.sport} · {r.title.slice(0, 60)} — <b>{r.status === "operation" ? "à simuler" : r.status === "excluded_rest" ? "exclue" : "REFUSÉE"}</b> {reasonFr(r.reason)}</li>)}
                </ul></details>
              </>; })()}
              {planDry.resp?.progress && <p>Progression relue : {planDry.confirm?.validRead ?? 0}/{planDry.resp.progress.totalOps} validées · refus {planDry.resp.progress.refused} · inconnues {planDry.resp.progress.unknown} · restantes {planDry.resp.progress.pending}{planDry.resp.progress.stoppedOn ? ` · arrêt : ${planDry.resp.progress.stoppedOn}` : ""}</p>}
              {planDry.resp?.progress && planDry.resp.progress.unknown > 0 && <p className="text-destructive">Une simulation au résultat inconnu n'est jamais relancée : décision humaine requise.</p>}
              <p role="status" className={planDry.confirm?.confirmed ? "font-semibold" : ""}>{planDry.confirm?.confirmed ? "Plan entièrement validé par Nolio en simulation (aucun envoi réel)." : "Plan non validé en simulation."}</p>
            </div>}
            {refsChangedNotice && <p data-testid="refs-changed-notice" className="text-xs text-destructive">Correspondances modifiées : la simulation précédente ne s'applique plus à ces références. Ses reçus restent conservés, inchangés. Relancez une simulation intégrale avant tout envoi.</p>}
            <div data-testid="nolio-plan-send" className="space-y-1 rounded-md border p-2">
              <p className="font-medium">Envoi réel du plan complet au calendrier Nolio</p>
              <p className="text-xs text-muted-foreground">Exige : simulation intégrale relue du corps exact, mêmes empreintes, revue coach enregistrée, plan prescriptible, release attestée et consentement séparé. Une revue ordinaire ne vaut pas attestation scientifique. Une simulation validée n'est ni un GO sportif ni une autorisation d'envoi.</p>
              {planDry?.confirm?.confirmed && planDry.planVersionId === source?.id ? <>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={planSendConsent} onChange={(e) => setPlanSendConsent(e.target.checked)} /> Je consens à l'ajout de ce plan au calendrier Nolio de l'athlète de test</label>
                <Button size="sm" variant="outline" onClick={() => onPlanSend("precheck")} disabled={busy || v2Busy !== null || !ready}>Vérifier les conditions d'envoi (rien n'est envoyé)</Button>
                <Button size="sm" variant="outline" onClick={()=>onPlanSend("verify")} disabled={busy || v2Busy !== null || !ready}>Vérifier le prochain lot déjà envoyé (lecture seule)</Button>
                {planSend?.resp?.status === "READY" && planSend.coachId === who?.coachId && planSendConsent && <Button size="sm" onClick={() => onPlanSend("send")} disabled={busy || v2Busy !== null || !ready}>Envoyer le prochain lot (8 séances max)</Button>}
              </> : <p className="text-xs">Disponible après une simulation intégrale confirmée par relecture.</p>}
              {planSend && planSend.coachId === who?.coachId && planSend.planVersionId === source?.id && <div data-testid="nolio-plan-send-result" className="text-xs">
                {planSend.message && <p className="text-destructive">{planSend.message}</p>}
                {planSend.resp && <p>Statut : {planSend.resp.status === "BLOCKED" ? "BLOQUÉ — aucun envoi" : planSend.resp.status}{planSend.resp.preview ? ` · ${planSend.resp.preview.operations} opérations (${planSend.resp.preview.opsByKind.training} séances + ${planSend.resp.preview.opsByKind.competition} compétition) + ${planSend.resp.preview.excludedRest} repos = ${planSend.resp.preview.totalSessions}` : ""}</p>}
                {planSend.resp?.gate.length ? <ul className="list-disc pl-4 text-destructive">{planSend.resp.gate.map((g) => <li key={g}>{gateFr(g)}</li>)}</ul> : null}
              </div>}
            </div>
          </div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>5. Check-list GO pilote (pilote reste désactivé)</CardTitle></CardHeader>
        <CardContent><ul className="space-y-1">{PILOT_CHECKLIST.map((c) => <li key={c.item}><b>{c.status}</b> — {c.item}</li>)}</ul></CardContent>
      </Card>
    </div>
  );
}
