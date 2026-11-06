import { DetPlanningDraft } from "./DetPlanningDraft";
import { appRecordReferenceProblems } from "@/lib/det/appRecordReference";
import { planningDraftKey, planningDraftStorage, readPlanningDraft, writePlanningDraft, type DraftStatus } from "@/lib/plan/planningFormDraft";
import { detInputDraft, detDraftSignature, restoreDetInputDraft } from "@/lib/det/detInputDraft";
import {isTimeTrial} from '../../../experimental/det-engine/v410-time-trial-contract';
import {dedicatedProgrammeProblems} from '@/lib/plan/dedicatedSportGoal';
import {canonicalJson} from '@/lib/plan/appendOnlyPlanVersionSave';
import {AthleteSourceReview} from './AthleteSourceReview';
import {TrailEvidenceForm} from './TrailEvidenceForm';
/**
 * Parcours coach simple (QA) : fiche athlète réelle → DET ou IA.
 * Reprend ce que l'app connaît déjà, ne demande que l'essentiel manquant,
 * deux listes de vérification dédupliquées au lieu d'une grille par séance.
 * Aucune approbation de prescription, aucune bascule DET → IA.
 */
import { sharedPlanningDetContext } from "@/lib/det/sharedPlanningDetContext";
import { LibrarySourceReview } from "./LibrarySourceReview";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { withTimeout } from "@/pages/__qa/ReadOnlyRlsAuditPage";
import { ATHLETE_LEVEL_LABELS, LIMITER_LABELS, SWIM_DOMAIN_LABELS, hashCoachInputs, type SwimDomain } from "@/lib/det/coachDetContext";
import type { CoachDetOutcome } from "@/lib/det/coachDetRun";
import { runAppPlanningDetPlan } from "@/lib/det/appPlanningDetRun";
import {
  CONDITIONAL_CONFIRMATIONS, GENERAL_CONFIRMATIONS, athleteChecklist, explainEngineRefusal, buildAthleteDetInputs, clockSportsFor, prefillFromRecord, requiredAnchorKeys,
  type AthleteRecordView, type CoachAnswers, type FieldKey, type PlanFormView, type GenuineSourceReviews,
} from "@/lib/det/athleteDetBridge";
import type { FrozenAppPlanningInput } from "@/lib/det/appPlanningInput";
import { familySourcePool, poolLibraryProblems } from "@/lib/det/familySourcePools";
import { coachFamilyFor } from "../../../experimental/det-engine/v401-coach-inputs-core";
import { traceLimiterSemantics } from "../../../experimental/det-engine/v403-limiter-semantics";

type Verified = { userId: string; athleteId: string };
const SPORT: Record<string, string> = { run: "Course", bike: "Vélo", swim: "Natation", strength: "Force", brick: "Enchaînement vélo-course" };
type MissingPoint = { key: string; label: string; why: string };
function readinessGroup(key: string): "data" | "current" | "clock" | "review" {
  if (["recentLoad", "fatigue", "injuryScreen"].includes(key)) return "current";
  if (key.startsWith("clock:") || ["tz", "bricks"].includes(key)) return "clock";
  if (key.startsWith("gen:") || ["strengthRpe", "prereq", "contra"].includes(key)) return "review";
  return "data";
}
function DetReadinessSummary({ missing }: { missing: MissingPoint[] }) {
  const groups = [
    { key: "data", label: "Données à compléter" },
    { key: "current", label: "Situation actuelle" },
    { key: "clock", label: "Disponibilités" },
    { key: "review", label: "Revue du coach" },
  ];
  const openSection = (key: string) => {
    const element = document.getElementById(`det-step-${key}`);
    if (element?.tagName === "DETAILS") (element as HTMLDetailsElement).open = true;
    element?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    element?.focus({ preventScroll: true });
  };
  return <section aria-label="Avancement de la préparation DET" className="space-y-2 rounded border p-3">
    <p className="text-sm font-medium">Préparer le plan en 4 étapes</p>
    <p className="text-xs text-muted-foreground">Les données du profil sont déjà reprises. Complétez les manques, puis effectuez votre revue. Les vérifications ne sont jamais cochées automatiquement.</p>
    {groups.map((group, index) => {
      const points = missing.filter(point => readinessGroup(point.key) === group.key);
      return <div key={group.key} className="rounded border p-2 text-sm" data-testid={`det-readiness-${group.key}`}>
        <button type="button" className="text-left underline w-full" onClick={() => openSection(group.key)}>{index + 1}. {group.label} — {points.length ? `${points.length} point(s) à traiter` : "complété"}</button>
        {points.length > 0 && <details><summary className="cursor-pointer text-xs mt-1">Voir le détail</summary><ul className="list-disc pl-5 space-y-1">{points.map(point => <li key={point.key}>{point.label} — {point.why}</li>)}</ul></details>}
      </div>;
    })}
  </section>;
}
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const emptyAnswers = (tz: string): CoachAnswers => ({
  provenance: {}, entered: {}, swimPaces: {}, athleteLevel: "", recentLoad: "", fatigue: "", injuryScreen: "", general: {},
  prerequisitesAllMet: false, unmetPrerequisites: [], contraindicationsAllAbsent: false, presentContraindications: [],
  strengthLoadAndRpeConfirmed: false, clock: { timeZone: tz, bySport: {} }, bricksConfirmed: false, coachLimiterOrder: null,
});

export function AthleteDetSimplePanel(props: {
  record: AthleteRecordView; form: PlanFormView; engine: "ai" | "det";
  guard: () => Promise<Verified | null>;
  sourcesVersion: string | null; engineVersion: string | null; releaseId: string | null;
  /** Sortie DET + empreinte du profil sur lequel elle a été calculée. */
  generationAction?: { current: (()=>Promise<void>) | null };
  onBusyChange?: (busy:boolean)=>void;
  onOutcome: (o: CoachDetOutcome | null, planningFingerprint: string | null) => void | Promise<void>;
  /** Profil de planification figé de la page (même entrée que l'IA). OBLIGATOIRE : aucun recalcul ici. */
  appInput: FrozenAppPlanningInput | null;
  appInputStatus: "ready" | "pending" | "missing";
  /** IA sur le profil partagé. */
  onAIShared: (f: FrozenAppPlanningInput) => Promise<void>;
}) {
  // Fuseau du navigateur proposé, signalé comme tel, modifiable.
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  const [draft, setA] = useState<CoachAnswers>(() => emptyAnswers(browserTz));
  const inherited = useMemo(() => sharedPlanningDetContext(props.record, props.form, props.appInputStatus === "ready" ? props.appInput : null, draft), [props.record, props.form, props.appInput, props.appInputStatus, draft]);
  const a = inherited.answers;
  const planningForm = inherited.form;
  const [msg, setMsg] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [libraryProblems, setLibraryProblems] = useState<string[]>([]);
  const epoch = useRef(0);
  // Tout changement d'athlète / objectif / budget annule les actions en cours et efface la sortie.
  // … et aussi tout changement du profil de planification (physiologie, ordre, dates) ou du moteur.
  const fp = props.appInputStatus === "ready" ? props.appInput?.fingerprint ?? null : null;
  const profileKey = `${props.record.athleteId}|${JSON.stringify(props.form)}|${fp ?? props.appInputStatus}|${props.engine}`;
  const ctxKey = `${profileKey}|${canonicalJson(a)}|${props.sourcesVersion}|${props.engineVersion}`;
  const onOutcomeRef=useRef(props.onOutcome);onOutcomeRef.current=props.onOutcome;
  const live = useRef({ fp, engine: props.engine, ctxKey });
  live.current = { fp, engine: props.engine, ctxKey };
  useEffect(() => { epoch.current++; setBusy(false); onOutcomeRef.current(null, null); setMsg([]); }, [ctxKey]);
  // Revue RÉELLE par séance déjà enregistrée (grille « Avancé ») pour ce coach + athlète : seule autorité de revue des séances.
  const [genuine, setGenuine] = useState<GenuineSourceReviews | null>(null);
  const [libraryGenuine, setLibraryGenuine] = useState<GenuineSourceReviews | null>(null);
  // Confirmations belong to this athlete/profile, never to the previously selected athlete.
  const inputDraftKey = planningDraftKey(props.record.coachId, props.record.athleteId, "det");
  const inputDraftSignature = detDraftSignature(props.record, props.form.objective);
  const inputDraftScope = fp ? `${inputDraftKey}|${inputDraftSignature}|${fp}` : null;
  const [inputDraftReady, setInputDraftReady] = useState<string | null>(null);
  const [inputDraftStatus, setInputDraftStatus] = useState<DraftStatus>("pending");
  const inputDraftRevision = useRef(0);
  useEffect(() => {
    setLibraryGenuine(null);
    const empty = emptyAnswers(browserTz);
    if (!inputDraftScope) { setA(empty); setInputDraftReady(null); return; }
    const read = readPlanningDraft(planningDraftStorage, inputDraftKey, inputDraftSignature, value => restoreDetInputDraft(value, empty));
    setA(read.data ?? empty); inputDraftRevision.current = read.revision;
    setInputDraftStatus(read.status); setInputDraftReady(inputDraftScope);
  // Exact owner/profile scope; descriptive typing may return, human checks never do.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputDraftScope, browserTz]);
  const inputDraftJSON = canonicalJson(detInputDraft(draft));
  useEffect(() => {
    if (!inputDraftScope || inputDraftReady !== inputDraftScope || ["invalid", "unavailable"].includes(inputDraftStatus)) return;
    const result = writePlanningDraft(planningDraftStorage, inputDraftKey, inputDraftSignature, JSON.parse(inputDraftJSON), inputDraftRevision.current);
    inputDraftRevision.current = result.revision; setInputDraftStatus(result.status);
  }, [inputDraftJSON, inputDraftScope, inputDraftReady, inputDraftKey, inputDraftSignature]); // eslint-disable-line react-hooks/exhaustive-deps
  const effectiveGenuine = genuine ?? libraryGenuine;
  useEffect(() => { let live = true; setGenuine(null);
    void (async () => {
      if (!fp) return;
      // Revue humaine liée à CE profil de planification ; les lignes recopiées par ce panneau
      // (sourceReviewProvenance) ne sont jamais relues comme revue.
      const { data } = await supabase.from("det_coach_review_contexts").select("id,coach_id,athlete_id,created_at,source_qualifications,brick_approvals,inputs_snapshot")
        .eq("coach_id", props.record.coachId).eq("athlete_id", props.record.athleteId)
        .eq("inputs_snapshot->>planningInputFingerprint", fp).is("inputs_snapshot->sourceReviewProvenance", null)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!live || !data) return;
      setGenuine({ origin: "det_coach_review_contexts", reviewContextId: data.id, coachId: data.coach_id, athleteId: data.athlete_id, reviewedAt: data.created_at,
        qualifications: (data.source_qualifications ?? []) as never, brickApprovals: (data.brick_approvals ?? []) as never, planningInputFingerprint: fp, ...((data.inputs_snapshot as unknown as {sourceContentReview?:{athleteChecksKey:string}})?.sourceContentReview?.athleteChecksKey?{athleteChecksKey:(data.inputs_snapshot as unknown as {sourceContentReview:{athleteChecksKey:string}}).sourceContentReview.athleteChecksKey}:{}) });
    })();
    return () => { live = false; }; }, [props.record.coachId, props.record.athleteId, fp]);

  const family = coachFamilyFor(planningForm.objective);
  const pool = useMemo(() => family ? familySourcePool(family.key) : null, [family]);
  useEffect(() => { let live = true; if (pool) void poolLibraryProblems(pool).then((p) => { if (live) setLibraryProblems(p); }); return () => { live = false; }; }, [pool?.family]); // eslint-disable-line react-hooks/exhaustive-deps
  const prefill = useMemo(() => prefillFromRecord(props.record), [props.record]);
  const req = family && pool ? requiredAnchorKeys(family, pool) : null;
  const list = pool ? athleteChecklist(pool) : null;
  const sports = family && pool ? clockSportsFor(family, pool) : [];
  // Ordre des limiteurs : uniquement celui du profil partagé (aucun diagnostic relancé ici).
  const initial = { order: [...(props.appInput?.limiters.applied ?? [])], appendedEligible: [] as string[], notGuiding: [] as string[] };
  const order = initial.order;
  const bridge = useMemo(() => buildAthleteDetInputs(props.record, planningForm, { ...a,timeTrial:props.appInput?.config.timeTrialContext, coachLimiterOrder: null }, effectiveGenuine, fp), [props.record, planningForm, a, effectiveGenuine, fp,props.appInput]);
  const set = (patch: Partial<CoachAnswers>) => setA((x) => ({ ...x, ...patch }));

  const generate = async () => {
    if(busy)return;
    const my = ++epoch.current; setBusy(true); props.onOutcome(null, null);
    const app = props.appInput, fpAt = fp, engineAt = props.engine, keyAt = ctxKey;
    // Toute réponse tardive (autre athlète, profil, ordre, dates ou moteur) est ignorée.
    const current = () => my === epoch.current && live.current.fp === fpAt && live.current.engine === engineAt && live.current.ctxKey === keyAt;
    try {
      if (!app || !fpAt) { setMsg([props.appInputStatus === "pending" ? "Profil de planification en cours de préparation : patientez." : "Profil de planification de l'athlète indisponible (diagnostic ou formulaire incomplet) : rien n'est reconstruit ici."]); return; }
      const programmeProblems=dedicatedProgrammeProblems(app.config,app.athlete);
      if(programmeProblems.length){setMsg(programmeProblems);return;}
      const v = await props.guard(); if (!v || !current()) return;
      if (v.athleteId !== props.record.athleteId || v.userId !== props.record.coachId || app.athleteId !== v.athleteId) { setMsg(["Session ou athlète différent : action annulée."]); return; }
      if(engineAt==='ai'&&isTimeTrial(String(app.config.objective))){setMsg(['Le CLM utilise actuellement le contrat de sources et de position de DET. Aucun appel IA n’est lancé pour ce format.']);return;}
      if (engineAt === "ai") { await props.onAIShared(app); return; }
      const b = buildAthleteDetInputs(props.record, planningForm, { ...a,timeTrial:props.appInput?.config.timeTrialContext, coachLimiterOrder: null }, effectiveGenuine, fpAt);
      if (!b.snapshot || !b.ctx) { setMsg(b.sourceReview.status === "blocked_missing_source_review" ? [b.sourceReview.reason] : b.missing.map((m) => `${m.label} : ${m.why}`)); return; }
      const referenceProblems=appRecordReferenceProblems(b.snapshot,app);
      if(referenceProblems.length){setMsg(referenceProblems);return;}
      if (libraryProblems.length) { setMsg(libraryProblems); return; }
      if (!props.sourcesVersion) { setMsg(["Version des séances DET indisponible."]); return; }
      const inputsHash = await hashCoachInputs(b.snapshot);
      if (!current()) return;
      // Trace durable (append-only) des vérifications de CET athlète, liée au coach, aux entrées et au profil complet (empreinte).
      // Blocage nommé AVANT toute écriture : limiteur principal sans définition moteur pour la famille.
      const sem = traceLimiterSemantics([...app.limiters.applied], coachFamilyFor(String(app.config.objective))?.key ?? "unsupported");
      if (sem.blocking) { setMsg([`Limiteur principal « ${sem.blocking.raw} » sans définition DET pour cette famille : ${sem.blocking.reason}. Rien n'est remplacé ; aucune vérification enregistrée.`, ...sem.blocking.missingItems.map((m) => `Manquant : ${m}`)]); return; }
      const { data, error } = await withTimeout(supabase.from("det_coach_review_contexts").insert({
        coach_id: v.userId, athlete_id: v.athleteId, inputs_snapshot: b.snapshot as never, inputs_hash: inputsHash,
        sources_version: props.sourcesVersion, source_qualifications: b.ctx.qualifications as never, session_clock: b.ctx.clock as never,
        brick_approvals: (b.ctx.brickApprovals ?? []) as never,
      }).select("id").single(), "INSERT vérifications");
      if (!current()) return;
      if (error || !data) { setMsg([`Vérifications non enregistrées : ${error?.message?.slice(0, 160) ?? "inconnu"}`]); return; }
      await new Promise((r) => setTimeout(r, 30));
      if (!current()) return;
      const out = runAppPlanningDetPlan({ reviewContextId: data.id, ctx: { ...b.ctx, inputsHash, sourcesVersion: props.sourcesVersion }, coachId: v.userId, athleteId: v.athleteId,
        snapshot: b.snapshot, inputsHash, sourcesVersion: props.sourcesVersion, engineVersion: props.engineVersion, releaseId: props.releaseId, appInput: app });
      if (!current()) return;
      await props.onOutcome(out, fpAt);
      setMsg(out.kind === "accepted" ? [`Plan DET généré (${out.sessions} séances) depuis le profil de l'athlète — non prescriptif, à relire.`]
        : out.kind === "refused" ? out.refusals : [`DET n'a pas trouvé de plan conforme (l'IA n'est pas lancée à sa place).`,
            ...(out.limiterOrder.unrecognizedByDet?.length ? [`Limiteur(s) de l'app transmis mais sans définition DET : ${out.limiterOrder.unrecognizedByDet.join(", ")} — conservés tels quels, rien n'est substitué.`] : []), ...explainEngineRefusal(out.blockingIssues ?? []), `Détail technique : ${out.reason} · ${out.blockingCodes.join(", ")}`]);
    } catch(error) { if(current())setMsg([error instanceof Error?error.message:"Génération DET interrompue : aucun résultat installé."]);
    } finally { if (my === epoch.current) setBusy(false); }
  };

  const {generationAction,onBusyChange}=props;
  if(generationAction)generationAction.current=generate;
  useEffect(()=>{onBusyChange?.(busy);},[busy,onBusyChange]);
  useEffect(()=>()=>{if(generationAction)generationAction.current=null;onBusyChange?.(false);},[generationAction,onBusyChange]);

  const provRow = (k: FieldKey) => {
    const p = prefill.find((x) => x.key === k); if (!p) return null;
    const pv = a.provenance[k];
    if (p.typedKind === "field_measurement" && !pv) return <div key={k} className="text-sm">{p.label} : <b>{Array.isArray(p.value) ? p.value.join("–") : p.value}</b> <span className="text-xs text-muted-foreground">— mesure selon la fiche ({p.recordedOn ?? "date ?"})</span></div>;
    return <div key={k} className="grid grid-cols-1 gap-2 items-center text-sm">
      <span>{p.label} : <b>{Array.isArray(p.value) ? p.value.join("–") : p.value}</b></span>
      <span className="text-xs text-muted-foreground">{p.origin === "snapshot" ? `profil du ${p.recordedOn ?? "?"}` : "référence du profil"}</span>
      <select aria-label={`${p.label} nature`} className="rounded-md border bg-background p-1 text-xs" value={pv?.kind ?? ""} onChange={(e) => set({ provenance: { ...a.provenance, [k]: e.target.value ? { kind: e.target.value as "field_measurement", uncertainty: pv?.uncertainty } : undefined } })}>
        <option value="">mesure ou estimation ?</option><option value="field_measurement">mesure terrain</option><option value="explicit_estimate">estimation</option>
      </select>
      {pv?.kind === "explicit_estimate" ? <Input aria-label={`${p.label} incertitude`} placeholder="incertitude (ex. ±5 s/km)" value={pv.uncertainty ?? ""} onChange={(e) => set({ provenance: { ...a.provenance, [k]: { kind: "explicit_estimate", uncertainty: e.target.value } } })} /> : <span />}
    </div>;
  };
  const missingAnchors = (req?.anchors ?? []).filter((k) => !prefill.some((p) => p.key === k));
  const enterRow = (k: FieldKey, label: string, range: boolean) => {
    const e = a.entered[k];
    const upd = (patch: Partial<NonNullable<CoachAnswers["entered"][FieldKey]>>) => set({ entered: { ...a.entered, [k]: { value: e?.value ?? 0, kind: e?.kind ?? "explicit_estimate", method: e?.method ?? "", ...patch } } });
    return <div key={k} className="grid grid-cols-1 gap-2 items-center text-sm">
      <span>{label}</span>
      <Input aria-label={`${label} valeur`} placeholder={range ? "min–max" : "valeur"} onChange={(ev) => { const n = ev.target.value.split(/[–-]/).map((x) => Number(x.trim().replace(",", "."))); upd({ value: range ? [n[0], n[1]] as [number, number] : n[0] }); }} />
      <Input aria-label={`${label} méthode`} placeholder="comment obtenue ?" onChange={(ev) => upd({ method: ev.target.value })} />
      <select aria-label={`${label} nature`} className="rounded-md border bg-background p-1 text-xs" value={e?.kind ?? "explicit_estimate"} onChange={(ev) => upd({ kind: ev.target.value as "field_measurement" })}>
        <option value="explicit_estimate">estimation</option><option value="field_measurement">mesure terrain</option>
      </select>
      {e?.kind !== "field_measurement" && <Input aria-label={`${label} incertitude`} placeholder="incertitude" onChange={(ev) => upd({ uncertainty: ev.target.value })} />}
    </div>;
  };
  const confKeys = list ? [...Object.keys(GENERAL_CONFIRMATIONS), ...Object.keys(CONDITIONAL_CONFIRMATIONS).filter((k) => CONDITIONAL_CONFIRMATIONS[k as keyof typeof CONDITIONAL_CONFIRMATIONS].when(list))] : [];

  const provenanceFields = prefill.filter(p => bridge.missing.some(item => item.key === `prov:${p.key}` || item.key === `unc:${p.key}`));

  return <div className="space-y-4 rounded-md border p-3" data-testid="athlete-det-simple">
    <h3 className="font-semibold">Plan à partir de la fiche de l'athlète</h3>
    <p role="status" className="text-xs text-muted-foreground">{inputDraftStatus === "saved" || inputDraftStatus === "restored" ? "Saisies DET conservées dans ce navigateur. Les vérifications du coach sont à reconfirmer après réouverture." : inputDraftStatus === "conflict" ? "Saisies modifiées dans un autre onglet : rechargez avant de continuer." : ["invalid", "unavailable"].includes(inputDraftStatus) ? "Saisies DET non conservées : stockage indisponible ou illisible. Gardez cette page ouverte." : "Préparation du brouillon DET…"}</p>
    {!family && <p className="text-sm">« {props.form.objective || "objectif non renseigné"} » : pas encore pris en charge par DET. {props.engine === "ai" ? "L'IA peut être utilisée." : "Choisir l’IA ou un objectif raccordé (marathon 16 sem., semi-marathon 8 ou 30 sem., Ironman 70.3 12 sem., Ironman 16 sem. avec composition vélo-course revue)."}</p>}
    {family && <>
      <section className="space-y-1">
        <p className="text-sm font-medium">Configuration déjà reprise</p>
        <p className="text-sm" data-testid="det-shared-config">{planningForm.objective || "Objectif à choisir dans la configuration"} · {planningForm.weeksAvailable || "—"} semaines · {planningForm.weeklyHours || "—"} h/semaine · {planningForm.sessionsPerWeek || "—"} séances · {planningForm.strengthSessionsPerWeek} renforcement · {planningForm.maxSessionsPerDay} maximum/jour</p>
        <p className="text-xs text-muted-foreground">Dates, ambition, volume, fréquence et contraintes viennent de la configuration commune. Pour les modifier, utilisez cette configuration en haut de page.</p>
        {inherited.inheritedLevel && <p className="text-sm" data-testid="det-shared-level">Niveau repris : {ATHLETE_LEVEL_LABELS[a.athleteLevel as keyof typeof ATHLETE_LEVEL_LABELS]} ({props.appInput?.config.ambitionMeta?.trainingLevelSource === "manual" ? "choisi dans la configuration" : "résolu par l’app à partir de la charge"}).</p>}
        <p className="text-xs text-muted-foreground">Les références numériques existantes sont reprises sans ressaisie. Une nature mesure/estimation ou une marge d’erreur non documentée reste indiquée comme telle dans l’audit ; elle ne devient pas une mesure vérifiée.</p>
        <details><summary className="text-sm cursor-pointer">Voir les {prefill.length} valeurs du profil et leurs origines</summary>
          <ul className="text-sm space-y-2">{prefill.map(p => <li key={p.key}>{p.label} : <b>{Array.isArray(p.value) ? p.value.join("–") : p.value}</b><br /><span className="text-xs text-muted-foreground">{p.method} · {p.typedKind === "field_measurement" ? "mesure selon la fiche" : p.typedKind === "explicit_estimate" ? "estimation selon la fiche" : "nature mesure/estimation non renseignée"}</span></li>)}</ul>
        </details>
      </section>
      <section className="space-y-1">
        <p className="text-sm font-medium">Limiteurs qui guident le plan</p>
        {order.length === 0 && <p className="text-xs text-muted-foreground">Compléter les valeurs pour voir les limiteurs utilisables.</p>}
        {props.appInputStatus === "pending" && <p className="text-xs text-muted-foreground">Profil de planification en préparation…</p>}
        {props.appInput && <p className="text-xs text-muted-foreground">Ordre repris tel quel du profil de l'app (même que pour l'IA) — {props.appInput.config.planningGoalContext ? "priorité de programme issue de la cible explicite du coach (profil physiologique conservé)" : props.appInput.limiters.origin === "coach_override" ? "ordre choisi par le coach dans la page" : "ordre automatique du diagnostic de l'app"}. Pour le changer, utilisez le réglage des limiteurs de la page.</p>}
        <p className="text-sm">Cet ordre de priorités guide la sélection des séances. L’objectif précise la préparation ; les horaires, la charge et la récupération encadrent le calendrier.</p>
        <ol className="space-y-1">{order.map((m, i) => <li key={m} className="flex items-center gap-2 text-sm">{i + 1}. {LIMITER_LABELS[m] ?? m}</li>)}</ol>
      </section>

      <details><summary className="cursor-pointer text-sm">Examiner les autres pistes V3</summary><DetPlanningDraft app={props.appInputStatus === "ready" ? props.appInput : null} athleteId={props.record.athleteId} coachId={props.record.coachId} guard={props.guard} restrictions={{ presentContraindications: a.presentContraindications, unmetPrerequisites: a.unmetPrerequisites, injuryScreen: a.injuryScreen }} /></details>
      <details className="space-y-4" data-testid="det-final-review"><summary className="cursor-pointer text-sm font-medium">Finaliser après revue — paramètres détaillés</summary>
      <DetReadinessSummary missing={bridge.missing} />
      <section id="det-step-data" tabIndex={-1} className="space-y-2 scroll-mt-4">
        <p className="text-sm font-medium">1. Données à compléter</p>
        {provenanceFields.length > 0 && <details>
          <summary className="text-sm cursor-pointer">Préciser l’origine des valeurs nécessaires</summary>
          <p className="text-xs text-muted-foreground">Les nombres sont déjà repris. La fiche ne précise pas toujours s’ils proviennent d’un test ou d’une estimation. Confirmez uniquement cette information manquante ; aucune mesure n’est supposée.</p>
          {provenanceFields.map(p => provRow(p.key))}
        </details>}
        {missingAnchors.map((k) => enterRow(k, ({ runSprintSpeedRangeMps: "Plage vitesse sprint course (m/s)", bikeSprintPowerRangeWatts: "Plage puissance sprint vélo (W)", bikePmaWatts: "PMA vélo (W)", runThresholdPaceSecPerKm: "Allure seuil (s/km)", runVvo2SpeedMps: "Vitesse VO₂max (m/s)", bikeFtpWatts: "FTP (W)", cssSecPer100m: "CSS (s/100 m)" } as Record<string, string>)[k] ?? k, k.endsWith("RangeMps") || k.endsWith("RangeWatts")))}
        {(req?.swimDomains ?? []).length > 0 && <details className="space-y-2">
          <summary className="text-sm cursor-pointer">Allures de natation absentes du profil</summary>
          <p className="text-xs text-muted-foreground">La CSS est déjà reprise. Ces allures par domaine ne sont pas enregistrées dans la fiche ; elles demandent une valeur et une provenance distinctes.</p>
          {req!.swimDomains.map((d: SwimDomain) => {
            const pace = a.swimPaces[d];
            const update = (patch: Partial<NonNullable<typeof pace>>) => set({ swimPaces: { ...a.swimPaces, [d]: { value: pace?.value ?? 0, kind: pace?.kind ?? "explicit_estimate", method: pace?.method ?? "", ...patch } } });
            return <fieldset key={d} className="space-y-2 border rounded p-2"><legend className="text-sm">{SWIM_DOMAIN_LABELS[d]} (s/100 m)</legend>
              <Input aria-label={`natation ${d}`} placeholder="Allure en s/100 m" value={pace?.value || ""} onChange={e => update({ value: Number(e.target.value.replace(",", ".")) })} />
              <select aria-label={`natation ${d} nature`} className="w-full rounded border p-2 bg-background text-sm" value={pace?.kind ?? "explicit_estimate"} onChange={e => update({ kind: e.target.value as "field_measurement" | "explicit_estimate" })}><option value="explicit_estimate">Estimation</option><option value="field_measurement">Mesure terrain</option></select>
              <Input aria-label={`natation ${d} méthode`} placeholder="Origine ou méthode" value={pace?.method ?? ""} onChange={e => update({ method: e.target.value })} />
              {pace?.kind !== "field_measurement" && <Input aria-label={`natation ${d} incertitude`} placeholder="Incertitude" value={pace?.uncertainty ?? ""} onChange={e => update({ uncertainty: e.target.value })} />}
            </fieldset>;
          })}
        </details>}
        <div className="grid grid-cols-1 gap-2 text-sm">
          {!inherited.inheritedLevel && <p className="text-sm">Le niveau n’est pas encore renseigné : <a href="#plan-training-level" className="underline">choisissez-le dans la configuration commune</a>. Le réglage automatique prudent ne constitue pas un niveau connu.</p>}
        </div>
      </section>
      <section id="det-step-current" tabIndex={-1} className="space-y-2 scroll-mt-4">
        <p className="text-sm font-medium">2. Situation actuelle</p>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <select aria-label="charge" className="rounded-md border bg-background p-1" value={a.recentLoad} onChange={(e) => set({ recentLoad: e.target.value as CoachAnswers["recentLoad"] })}><option value="">Charge des 4 dernières semaines…</option><option value="low">faible</option><option value="moderate">modérée</option><option value="high">élevée</option></select>
          <select aria-label="forme" className="rounded-md border bg-background p-1" value={a.fatigue} onChange={(e) => set({ fatigue: e.target.value as CoachAnswers["fatigue"] })}><option value="">Forme actuelle{props.record.snapshot?.fatigue_state ? ` (fiche : ${props.record.snapshot.fatigue_state})` : ""}…</option><option value="ready">en forme</option><option value="fatigued">fatigué</option></select>
          <select aria-label="blessure" className="rounded-md border bg-background p-1" value={a.injuryScreen} onChange={(e) => set({ injuryScreen: e.target.value as CoachAnswers["injuryScreen"] })}><option value="">Blessure / douleur (à demander)…</option><option value="cleared_by_coach">aucune, vérifié avec l'athlète</option><option value="contraindication">oui, présente</option></select>
        </div>

      </section>
      <details id="det-step-clock" tabIndex={-1} className="space-y-2 scroll-mt-4">
        <summary className="text-sm font-medium cursor-pointer">3. Disponibilités horaires par sport — {sports.length} sport(s)</summary>
        <p className="text-xs text-muted-foreground">Le nombre de séances vient déjà de la configuration. Les heures exactes servent à vérifier les récupérations ; un volume hebdomadaire ne fournit pas ces horaires.</p>
        <Input aria-label="fuseau" value={a.clock.timeZone} onChange={(e) => set({ clock: { ...a.clock, timeZone: e.target.value } })} />
        <p className="text-xs text-muted-foreground">Fuseau proposé : celui de votre navigateur — à corriger si l'athlète vit ailleurs.</p>
        {sports.map((sp) => { const c: { time: string; days: boolean[]; perDay?: string[] } = a.clock.bySport[sp] ?? { time: "", days: Array(7).fill(false) };
          const upd = (patch: Partial<typeof c>) => set({ clock: { ...a.clock, bySport: { ...a.clock.bySport, [sp]: { ...c, ...patch } } } });
          return <div key={sp} className="flex flex-wrap items-center gap-2 text-sm"><span className="w-40">{SPORT[sp] ?? sp}</span>
            <Input aria-label={`heure ${sp}`} className="w-24" placeholder="HH:MM" value={c.time} onChange={(e) => upd({ time: e.target.value })} />
            {DAYS.map((d, i) => <label key={d} className="flex items-center gap-1"><Checkbox checked={c.days[i]} onCheckedChange={(v) => upd({ days: c.days.map((x, j) => (j === i ? v === true : x)) })} />{d}</label>)}
            <details><summary className="text-xs cursor-pointer">heure différente selon le jour</summary><div className="flex gap-1">{DAYS.map((d, i) => <Input key={d} aria-label={`${sp} ${d}`} className="w-20" placeholder={d} value={c.perDay?.[i] ?? ""} onChange={(e) => { const p = [...(c.perDay ?? Array(7).fill(""))]; p[i] = e.target.value; upd({ perDay: p }); }} />)}</div></details>
          </div>; })}
        {sports.includes("brick") && <label className="flex items-center gap-2 text-sm"><Checkbox checked={a.bricksConfirmed} onCheckedChange={(v) => set({ bricksConfirmed: v === true })} />Horaires des enchaînements vélo-course possibles pour l'athlète (ne vaut pas revue des enchaînements)</label>}
      </details>
      <details id="det-step-review" tabIndex={-1} className="space-y-2 scroll-mt-4">
        <summary className="text-sm font-medium cursor-pointer">4. Revue du coach pour cet athlète</summary>
        {req?.strengthRpe && <label className="flex items-center gap-2 text-sm"><Checkbox checked={a.strengthLoadAndRpeConfirmed} onCheckedChange={(v) => set({ strengthLoadAndRpeConfirmed: v === true })} />Charges et RPE de force maîtrisés par l'athlète</label>}
        {confKeys.map((k) => <label key={k} className="flex items-center gap-2 text-sm"><Checkbox checked={a.general[k as keyof CoachAnswers["general"]] === true} onCheckedChange={(v) => set({ general: { ...a.general, [k]: v === true } })} />
          {(GENERAL_CONFIRMATIONS as Record<string, string>)[k] ?? CONDITIONAL_CONFIRMATIONS[k as keyof typeof CONDITIONAL_CONFIRMATIONS].label}</label>)}
        {list && <details><summary className="text-sm cursor-pointer">Prérequis des séances ({list.prerequisites.length}) — décocher ceux non remplis</summary>
          <ul className="text-xs">{list.prerequisites.map((p) => <li key={p}><label className="flex items-center gap-2"><Checkbox checked={!a.unmetPrerequisites.includes(p)} onCheckedChange={(v) => set({ unmetPrerequisites: v === true ? a.unmetPrerequisites.filter((x) => x !== p) : [...a.unmetPrerequisites, p] })} />{p}</label></li>)}</ul></details>}
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={a.prerequisitesAllMet} onCheckedChange={(v) => set({ prerequisitesAllMet: v === true })} />J'ai relu la liste des prérequis (ceux décochés écartent les séances concernées)</label>
        {list && <details><summary className="text-sm cursor-pointer">Contre-indications ({list.contraindications.length}) — cocher celles présentes</summary>
          <ul className="text-xs">{list.contraindications.map((c) => <li key={c}><label className="flex items-center gap-2"><Checkbox checked={a.presentContraindications.includes(c)} onCheckedChange={(v) => set({ presentContraindications: v === true ? [...a.presentContraindications, c] : a.presentContraindications.filter((x) => x !== c) })} />{c}</label></li>)}</ul></details>}
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={a.contraindicationsAllAbsent} onCheckedChange={(v) => set({ contraindicationsAllAbsent: v === true })} />J'ai relu les contre-indications avec l'athlète (celles cochées écartent les séances concernées)</label>
      </details>
      {pool && family.sportFocus === "trail" && <TrailEvidenceForm key={profileKey} pool={pool} app={props.appInput} value={a.trail} onChange={trail=>set({trail})} />}
      {pool && (family.sportFocus === "trail" || family.key === "10k" || family.sportFocus === "bike" || family.sportFocus === "swim" || ["triathlon_sprint","triathlon_olympic"].includes(family.key)) && <AthleteSourceReview pool={pool} snapshot={bridge.snapshot} answers={a} sourcesVersion={props.sourcesVersion} fingerprint={fp} coachId={props.record.coachId} athleteId={props.record.athleteId} clock={bridge.reviewClock??bridge.ctx?.clock??null} guard={props.guard} onResolved={setGenuine} />}
      {pool && <LibrarySourceReview pool={pool} coachId={props.record.coachId} athleteId={props.record.athleteId} fingerprint={fp} answers={a} guard={props.guard} onResolved={setLibraryGenuine} />}
      {libraryProblems.map((p) => <p key={p} className="text-sm text-destructive">{p}</p>)}
      {bridge.sourceReview.status === "blocked_missing_source_review" && <p className="text-sm text-destructive" data-testid="source-review-blocked">{bridge.sourceReview.reason}</p>}
      {bridge.sourceReview.status === "reviewed" && <p className="text-xs text-muted-foreground">Revue des séances reprise : votre revue du {bridge.sourceReview.reviewedAt.slice(0, 10)} ({bridge.sourceReview.reviewedIds} séances).</p>}

    {!props.generationAction && <Button disabled={busy || !fp || (props.engine === "det" && (!family || bridge.missing.length > 0 || libraryProblems.length > 0 || !bridge.ctx))} onClick={() => { void generate(); }}>
      {props.engine === "det" ? "Générer avec DET Engine" : "Générer avec l'IA"}
    </Button>}
      </details>
      <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Détails techniques</summary>
        <p>Liste de séances : {pool!.ids.length} séances V3 du scénario {pool!.ciScenario} ; revue scientifique indépendante : non. {bridge.excludedSources.length} séance(s) écartée(s) par vos réponses.</p>
        <p>Moteur {props.engineVersion?.slice(0, 12) ?? "?"} · séances {props.sourcesVersion?.slice(0, 12) ?? "?"}</p></details>
    </>}

    {msg.map((m) => <p key={m} className="text-sm">{m}</p>)}
  </div>;
}
