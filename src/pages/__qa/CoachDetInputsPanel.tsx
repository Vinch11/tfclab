/**
 * DEV/QA — DET avec les ENTRÉES COACH. Rien n'est prérempli depuis une fixture :
 * seul l'objectif lu dans la fiche athlète est proposé (et signalé comme tel).
 * Aucune source n'est approuvée par défaut. Chaque enregistrement crée une
 * nouvelle ligne de revue (append-only) liée au coach, à l'athlète, à
 * l'empreinte des entrées et à la version des sources DET.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { withTimeout } from "@/pages/__qa/ReadOnlyRlsAuditPage";
import { AMBITION_DEFINITIONS } from "@/types/ambitionLevel";
import {
  ANCHOR_LABELS, ATHLETE_LEVEL_LABELS, COACH_INPUTS_SCHEMA, FATIGUE_LABELS, INJURY_LABELS, INTENT_LABELS, LIMITER_LABELS, PHYSIO_LABELS,
  RECENT_LOAD_LABELS, SESSION_COUNT_LABELS, SPORT_LABELS, describeSourceBlocks, findSource, hashCoachInputs, searchSources, sourceReviewSheet,
  SWIM_DOMAINS, SWIM_DOMAIN_LABELS, type SwimDomain,
  type AnchorEntry, type AnchorKey, type CoachDetInputSnapshot, type CoachReviewContext, type PhysioKey, type SourceQualification,
} from "@/lib/det/coachDetContext";
import { COACH_FAMILIES, COACH_BLOCKED_OBJECTIVES, coachBrickIdsFor, coachFamilyFor, type CoachBrickApproval } from "../../../experimental/det-engine/v401-coach-inputs-core";
import { IM_TAPER_BRICK } from "../../../experimental/det-engine/v404-im-taper-brick";
import { buildCoachPlanInputs, eligibleLimiterMetrics, runCoachDetPlan, type CoachDetOutcome } from "@/lib/det/coachDetRun";

type Verified = { userId: string; athleteId: string };
type EntryDraft = { value: string; kind: "" | AnchorEntry["kind"]; method: string; measuredOn: string; uncertainty: string };
const emptyEntry = (): EntryDraft => ({ value: "", kind: "", method: "", measuredOn: "", uncertainty: "" });
const RANGE_KEYS = new Set<AnchorKey>(["runSprintSpeedRangeMps", "bikeSprintPowerRangeWatts"]);
const REQUIRED_EVIDENCE = ["coachReviewedSource", "stopRuleExplained", "environmentAndEquipmentConfirmed", "limiterAndSportingGoalReviewed", "trainingLoadCompatible", "recoveryContextReviewed"] as const;
const OPTIONAL_EVIDENCE = ["highIntensityHistoryConfirmed", "runningImpactToleranceConfirmed", "swimmingSafetyConfirmed", "racePaceGoalConfirmed", "testProtocolConfirmed", "cssPairedTestConfirmed"] as const;
const EVIDENCE_LABEL: Record<string, string> = {
  coachReviewedSource: "Source relue par le coach", stopRuleExplained: "Règle d'arrêt expliquée", environmentAndEquipmentConfirmed: "Environnement/matériel confirmés",
  limiterAndSportingGoalReviewed: "Limiteur et objectif revus", trainingLoadCompatible: "Charge compatible", recoveryContextReviewed: "Récupération revue",
  highIntensityHistoryConfirmed: "Historique haute intensité", runningImpactToleranceConfirmed: "Tolérance impacts course", swimmingSafetyConfirmed: "Sécurité natation",
  racePaceGoalConfirmed: "Allure objectif confirmée", testProtocolConfirmed: "Protocole de test confirmé", cssPairedTestConfirmed: "Test CSS appairé",
};
type SourceDraft = {
  id: string; phase: string; recentLoad: string; fatigue: string; injuryScreen: string;
  pre: Record<string, boolean>; contra: Record<string, boolean>; flags: Record<string, boolean>;
  targetDurationMin: string; allowWorksetChange: boolean; prefer: boolean;
};

function parseEntry(d: EntryDraft, range: boolean): AnchorEntry | null | "invalid" {
  if (!d.value.trim() && !d.kind) return null;
  if (!d.kind) return "invalid";
  const nums = d.value.split(/[–-]/).map((x) => Number(x.trim().replace(",", ".")));
  const value = range ? (nums.length === 2 ? [nums[0], nums[1]] as [number, number] : NaN) : nums.length === 1 ? nums[0] : NaN;
  return { value: value as AnchorEntry["value"], kind: d.kind, method: d.method, measuredOn: d.measuredOn || null, uncertainty: d.uncertainty || null };
}
const hhmmToMin = (s: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim()); if (!m) return null;
  const v = Number(m[1]) * 60 + Number(m[2]); return v >= 0 && v < 1440 ? v : null;
};
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function CoachDetInputsPanel(props: {
  guard: () => Promise<Verified | null>;
  sourcesVersion: string | null; engineVersion: string | null; releaseId: string | null;
  onOutcome: (o: CoachDetOutcome | null) => void;
  shared?: Partial<CoachDetInputSnapshot>;
  engine?: "ai" | "det";
  onAI?: (inputs:ReturnType<typeof buildCoachPlanInputs>, snapshot:CoachDetInputSnapshot)=>Promise<void>;
}) {
  const [goalFromRecord, setGoalFromRecord] = useState<string | null>(null);
  const [f, setF] = useState(() => Object.fromEntries(["objective","planStartDate","raceDate","weeksAvailable","weeklyHours","sessionsPerWeek","strengthSessionsPerWeek","maxSessionsPerDay","ambition","athleteLevel","age","sex"].map(k=>[k,String((props.shared as Record<string,unknown>|undefined)?.[k]??"")])) as Record<"objective"|"planStartDate"|"raceDate"|"weeksAvailable"|"weeklyHours"|"sessionsPerWeek"|"strengthSessionsPerWeek"|"maxSessionsPerDay"|"ambition"|"athleteLevel"|"age"|"sex",string>);
  const [anchors, setAnchors] = useState<Record<AnchorKey, EntryDraft>>(() => Object.fromEntries(Object.keys(ANCHOR_LABELS).map((k) => [k, emptyEntry()])) as Record<AnchorKey, EntryDraft>);
  const [physio, setPhysio] = useState<Record<PhysioKey, EntryDraft>>(() => Object.fromEntries(Object.keys(PHYSIO_LABELS).map((k) => [k, emptyEntry()])) as Record<PhysioKey, EntryDraft>);
  const [strengthOk, setStrengthOk] = useState(false);
  const [swim, setSwim] = useState<Record<SwimDomain, EntryDraft>>(() => Object.fromEntries(SWIM_DOMAINS.map((k) => [k, emptyEntry()])) as Record<SwimDomain, EntryDraft>);
  const [cssProxy, setCssProxy] = useState(false);
  const [bricks, setBricks] = useState<Record<string, string>>({});
  const [sources, setSources] = useState<SourceDraft[]>([]);
  const [query, setQuery] = useState("");
  const [showTechnical, setShowTechnical] = useState(false);
  /** null = classement automatique ; sinon ordre confirmé par le coach. */
  const [limiterMode, setLimiterMode] = useState<"automatic" | "coach">("automatic");
  const [detected, setDetected] = useState<string[] | null>(null);
  const [coachOrder, setCoachOrder] = useState<string[]>(props.shared?.coachLimiterOrder??[]);
  const [tz, setTz] = useState("");
  const [clock, setClock] = useState<Record<string, string[]>>({});
  const [msg, setMsg] = useState<string[]>([]);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const v = await props.guard(); if (!v) return;
    const { data, error } = await withTimeout(supabase.from("athletes").select("id,goal").eq("id", v.athleteId).maybeSingle(), "SELECT athlete");
    if (error || !data) { setMsg(["Lecture de l'athlète QA impossible."]); return; }
    setGoalFromRecord(data.goal ?? null);
    if (props.shared?.objective === undefined && data.goal && !f.objective) setF((x) => ({ ...x, objective: data.goal! }));
    setMsg([`Fiche athlète lue : objectif ${data.goal ?? "non renseigné"}. Les mesures ne sont pas chargées dans ce formulaire : saisissez ou confirmez leur provenance, sans défaut inventé.`]);
  };

  const buildSnapshot = (v: Verified): { snap: CoachDetInputSnapshot | null; errors: string[] } => {
    const errors: string[] = [];
    const a: CoachDetInputSnapshot["anchors"] = {};
    for (const k of Object.keys(anchors) as AnchorKey[]) {
      const e = parseEntry(anchors[k], RANGE_KEYS.has(k));
      if (e === "invalid") errors.push(`${ANCHOR_LABELS[k]} : provenance (mesure/estimation) à choisir`); else if (e) a[k] = e;
    }
    const p: NonNullable<CoachDetInputSnapshot["physiology"]> = {};
    for (const k of Object.keys(physio) as PhysioKey[]) {
      const e = parseEntry(physio[k], false);
      if (e === "invalid") errors.push(`${PHYSIO_LABELS[k]} : provenance à choisir`); else if (e) p[k] = e;
    }
    const sw: NonNullable<CoachDetInputSnapshot["swimDomainPaces"]> = {};
    for (const k of SWIM_DOMAINS) {
      const e = parseEntry(swim[k], false);
      if (e === "invalid") errors.push(`Allure natation ${SWIM_DOMAIN_LABELS[k]} : provenance à choisir`); else if (e) sw[k] = e;
    }
    const n = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")));
    return { errors, snap: {
      schema: COACH_INPUTS_SCHEMA, athleteId: v.athleteId, coachId: v.userId, objective: f.objective.trim(),
      planStartDate: f.planStartDate, raceDate: f.raceDate, weeksAvailable: n(f.weeksAvailable), weeklyHours: n(f.weeklyHours),
      sessionsPerWeek: n(f.sessionsPerWeek), strengthSessionsPerWeek: n(f.strengthSessionsPerWeek), maxSessionsPerDay: n(f.maxSessionsPerDay),
      ambition: f.ambition, athleteLevel: f.athleteLevel as CoachDetInputSnapshot["athleteLevel"], age: f.age ? n(f.age) : null,
      sex: f.sex === "M" || f.sex === "F" ? f.sex : null, anchors: a, physiology: p, coachValidatedStrengthLoadAndRpe: strengthOk,
      ...(Object.keys(sw).length ? { swimDomainPaces: sw } : {}), ...(cssProxy ? { coachConfirmsCssAsMlssProxy: true } : {}),
      ...(props.shared?.planningInputFingerprint ? { planningInputFingerprint: props.shared.planningInputFingerprint } : {}),
      coachLimiterOrder: props.shared?.coachLimiterOrder ? [...props.shared.coachLimiterOrder] : limiterMode === "coach" ? [...coachOrder] : null,
    } };
  };

  /** Lit les limiteurs détectés par le diagnostic commun ; l'ordre coach part de l'ordre automatique, jamais d'un scénario. */
  const onDetectLimiters = async () => {
    const v = await props.guard(); if (!v) return;
    const { snap, errors } = buildSnapshot(v);
    if (errors.length || !snap) { setMsg(errors); return; }
    const list = eligibleLimiterMetrics(snap);
    setDetected(list);
    setCoachOrder((prev) => (prev.length === list.length && prev.every((m) => list.includes(m)) ? prev : [...list]));
    setMsg([list.length ? `Limiteurs détectés (ordre automatique) : ${list.map((m) => LIMITER_LABELS[m] ?? m).join(" > ")}` : "Aucun limiteur éligible détecté avec ces entrées."]);
  };
  const moveLimiter = (i: number, d: -1 | 1) => setCoachOrder((xs) => {
    const j = i + d; if (j < 0 || j >= xs.length) return xs;
    const c = [...xs]; [c[i], c[j]] = [c[j], c[i]]; return c;
  });

  const buildQualifications = (): { quals: SourceQualification[]; errors: string[] } => {
    const errors: string[] = []; const quals: SourceQualification[] = [];
    for (const s of sources) {
      const w = findSource(s.id); if (!w) { errors.push(`${s.id} inconnue`); continue; }
      const missing = REQUIRED_EVIDENCE.filter((k) => !s.flags[k]);
      if (missing.length || !s.phase || !s.recentLoad || !s.fatigue || !s.injuryScreen) {
        errors.push(`${s.id} non qualifiée : ${[...missing.map((k) => EVIDENCE_LABEL[k]), ...(!s.phase ? ["phase"] : []), ...(!s.recentLoad ? ["charge récente"] : []), ...(!s.fatigue ? ["fatigue"] : []), ...(!s.injuryScreen ? ["dépistage blessure"] : [])].join(", ")}`);
        continue;
      }
      const sheet = sourceReviewSheet(w);
      const optional = Object.fromEntries(OPTIONAL_EVIDENCE.filter((k) => s.flags[k]).map((k) => [k, true]));
      quals.push({
        id: s.id, sourceFingerprint: sheet.fingerprint,
        evidence: {
          coachReviewedSource: true, stopRuleExplained: true, environmentAndEquipmentConfirmed: true, limiterAndSportingGoalReviewed: true,
          trainingLoadCompatible: true, recoveryContextReviewed: true, ...optional,
          currentPhase: s.phase, recentLoad: s.recentLoad as never, fatigue: s.fatigue as never, injuryScreen: s.injuryScreen as never,
          checkedPrerequisites: sheet.prerequisites.filter((x) => s.pre[x]), checkedContraindications: sheet.contraindications.filter((x) => s.contra[x]),
        },
        ...(s.prefer ? { preferReviewedV3: true as const } : {}),
        ...(s.targetDurationMin.trim() ? { targetDurationMin: Number(s.targetDurationMin) } : {}),
        ...(s.allowWorksetChange ? { allowWorksetChange: true as const } : {}),
      });
    }
    return { quals, errors };
  };

  const buildClock = (): CoachReviewContext["clock"] => {
    if (!tz.trim()) return null;
    const minutesBySport = Object.fromEntries(Object.entries(clock).map(([sp, row]) => [sp, row.map((x) => (x.trim() ? hhmmToMin(x) : null))]));
    return Object.keys(minutesBySport).length ? { timeZone: tz.trim(), minutesBySport } : null;
  };

  const buildBricks = (): CoachBrickApproval[] => Object.entries(bricks).filter(([, v]) => v.trim()).map(([id, v]) => ({ id, transitionSeconds: Math.round(Number(v.replace(",", ".")) * 60) }));
  const family = coachFamilyFor(f.objective);

  const onSaveReview = async () => {
    setBusy(true); setSaved(null);
    try {
      const v = await props.guard(); if (!v) return;
      if (!props.sourcesVersion) { setMsg(["Version des sources DET indisponible : enregistrement refusé."]); return; }
      const { snap, errors } = buildSnapshot(v); const q = buildQualifications();
      if (errors.length || q.errors.length || !snap) { setMsg([...errors, ...q.errors]); return; }
      const row = {
        coach_id: v.userId, athlete_id: v.athleteId, inputs_snapshot: snap as never, inputs_hash: await hashCoachInputs(snap),
        sources_version: props.sourcesVersion, source_qualifications: q.quals as never, session_clock: buildClock() as never,
        brick_approvals: buildBricks() as never,
      };
      const { data, error } = await withTimeout(supabase.from("det_coach_review_contexts").insert(row).select("id").single(), "INSERT revue");
      if (error || !data) { setMsg([`Revue non enregistrée : ${error?.message?.slice(0, 160) ?? "inconnu"}`]); return; }
      setSaved(data.id); setMsg([`Revue enregistrée (nouvelle ligne). ${q.quals.length} source(s) qualifiée(s) pour cet athlète — ce n'est pas une approbation du plan.`]);
    } finally { setBusy(false); }
  };

  const onGenerate = async () => {
    setBusy(true); props.onOutcome(null);
    try {
      const v = await props.guard(); if (!v) return;
      if(props.engine === "ai") {
        const {snap,errors}=buildSnapshot(v);
        if(!snap || errors.length){setMsg(errors);return;}
        if(!props.onAI){setMsg(["Chemin IA indisponible"]);return;}
        await props.onAI(buildCoachPlanInputs(snap),snap);return;
      }
      const { data, error } = await withTimeout(supabase.from("det_coach_review_contexts")
        .select("id,coach_id,athlete_id,inputs_hash,sources_version,source_qualifications,session_clock,brick_approvals")
        .eq("athlete_id", v.athleteId).eq("coach_id", v.userId).order("created_at", { ascending: false }).limit(1).maybeSingle(), "SELECT revue");
      if (error) { setMsg([`Lecture de la revue impossible : ${error.message.slice(0, 160)}`]); return; }
      const { snap, errors } = buildSnapshot(v);
      if (errors.length || !snap) { setMsg(errors); return; }
      const ctx: CoachReviewContext | null = data ? {
        coachId: data.coach_id, athleteId: data.athlete_id, inputsHash: data.inputs_hash, sourcesVersion: data.sources_version,
        qualifications: (data.source_qualifications as unknown as SourceQualification[]) ?? [], clock: data.session_clock as never,
        brickApprovals: (data.brick_approvals as unknown as CoachBrickApproval[]) ?? [],
      } : null;
      await new Promise((r) => setTimeout(r, 30));
      const out = runCoachDetPlan({ reviewContextId: data?.id ?? null, ctx, coachId: v.userId, athleteId: v.athleteId, snapshot: snap,
        inputsHash: await hashCoachInputs(snap), sourcesVersion: props.sourcesVersion, engineVersion: props.engineVersion, releaseId: props.releaseId });
      props.onOutcome(out);
      const orderLine = (o: { mode: string; applied: string[] }) => `${o.mode === "coach" ? "Priorité coach" : "Ordre automatique"} : ${o.applied.map((m) => LIMITER_LABELS[m] ?? m).join(" > ") || "aucun limiteur"}`;
      setMsg(out.kind === "refused" ? out.refusals : out.kind === "engine_refused"
        ? [`DET a refusé ce plan (aucune bascule vers l'IA) : ${out.reason}`, ...out.blockingCodes.map((c) => `Contrôle non satisfait : ${c}`), ...out.contextProblems, orderLine(out.limiterOrder)]
        : [`Plan DET généré depuis les entrées coach (${out.sessions} séances), NON PRESCRIPTIF.`, orderLine(out.limiterOrder)]);
    } finally { setBusy(false); }
  };

  const addSource = (id: string) => {
    const w = findSource(id);
    if (!w) { setMsg([`Source ${id || "(vide)"} introuvable dans le catalogue V3.`]); return; }
    if (sources.some((s) => s.id === id)) return;
    setSources((xs) => [...xs, { id, phase: "", recentLoad: "", fatigue: "", injuryScreen: "", pre: {}, contra: {}, flags: {}, targetDurationMin: "", allowWorksetChange: false, prefer: false }]);
    setClock((c) => (c[w.sport] ? c : { ...c, [w.sport]: Array(7).fill("") }));
  };
  const upd = (i: number, patch: Partial<SourceDraft>) => setSources((xs) => xs.map((s, k) => (k === i ? { ...s, ...patch } : s)));

  const entryRow = (label: string, d: EntryDraft, set: (d: EntryDraft) => void, placeholder: string) => (
    <div className="grid grid-cols-6 gap-1 items-center" key={label}>
      <span className="col-span-1 text-xs">{label}</span>
      <Input aria-label={`${label} valeur`} placeholder={placeholder} value={d.value} onChange={(e) => set({ ...d, value: e.target.value })} />
      <select aria-label={`${label} provenance`} className="rounded-md border bg-background p-1 text-xs" value={d.kind} onChange={(e) => set({ ...d, kind: e.target.value as EntryDraft["kind"] })}>
        <option value="">provenance…</option><option value="field_measurement">mesure terrain</option><option value="explicit_estimate">estimation</option>
      </select>
      <Input aria-label={`${label} méthode`} placeholder="méthode/protocole" value={d.method} onChange={(e) => set({ ...d, method: e.target.value })} />
      <Input aria-label={`${label} date`} placeholder="AAAA-MM-JJ" value={d.measuredOn} onChange={(e) => set({ ...d, measuredOn: e.target.value })} />
      <Input aria-label={`${label} incertitude`} placeholder="incertitude" value={d.uncertainty} onChange={(e) => set({ ...d, uncertainty: e.target.value })} />
    </div>
  );

  return (
    <div className="rounded-md border p-3 space-y-3" data-testid="coach-inputs-panel">
      <p className="font-semibold">Entrées partagées du coach — {props.engine === "ai" ? "IA" : "DET Engine"}</p>
      <p className="text-xs text-muted-foreground">Rien n'est prérempli depuis une fixture. Une estimation reste une estimation (méthode et incertitude obligatoires). Aucune source n'est qualifiée par défaut ; une qualification de source n'approuve jamais le plan.</p>
      <Button size="sm" variant="outline" onClick={load} disabled={busy}>Lire la fiche athlète</Button>
      {goalFromRecord !== null && <p className="text-xs">Objectif lu dans la fiche : {goalFromRecord || "non renseigné"}</p>}
      <label className="text-xs space-y-1 block"><span>Objectif DET (famille canonique, distincte du nom de l'épreuve)</span>
        <select aria-label="Objectif" className="w-full rounded-md border bg-background p-2" value={f.objective} disabled={props.shared?.objective !== undefined}
          onChange={(e) => { const v = e.target.value; setF((x) => ({ ...x, objective: v }));
            const fam = coachFamilyFor(v); if (fam) setClock((c) => Object.fromEntries([...new Set([...Object.keys(c), ...fam.requiredClockSports])].map((sp) => [sp, c[sp] ?? Array(7).fill("")]))); }}>
          <option value="">choisir…</option>
          {Object.values(COACH_FAMILIES).map((fam) => <option key={fam.key} value={fam.label}>{fam.label}</option>)}
          {f.objective && !Object.values(COACH_FAMILIES).some((x) => x.label === f.objective) && <option value={f.objective}>{f.objective}{coachFamilyFor(f.objective) ? ` → ${coachFamilyFor(f.objective)!.label}` : " (non pris en charge)"}</option>}
        </select></label>
      {family ? <p className="text-xs" data-testid="family-boundary">Périmètre testé du moteur pour {family.label} : {family.testedEnvelope.weeks[0] === family.testedEnvelope.weeks[1] ? family.testedEnvelope.weeks[0] : family.testedEnvelope.weeks.join("–")} semaines, {family.testedEnvelope.weeklyHours[0] === family.testedEnvelope.weeklyHours[1] ? family.testedEnvelope.weeklyHours[0] : family.testedEnvelope.weeklyHours.join("–")} h/sem. Données requises : {family.requiredAnchors.map((k) => ANCHOR_LABELS[k as AnchorKey]).join(", ")} ; créneaux {family.requiredClockSports.map((x) => SPORT_LABELS[x] ?? x).join(", ")}. Hors périmètre ⇒ refus, jamais l'IA à la place.</p>
        : <p className="text-xs text-muted-foreground">Non raccordés pour l'instant : {Object.values(COACH_BLOCKED_OBJECTIVES).join(" · ")}</p>}
      <div className="grid grid-cols-3 gap-2">
        {([["planStartDate", "Début (AAAA-MM-JJ)"], ["raceDate", "Course (AAAA-MM-JJ)"], ["weeksAvailable", "Semaines"], ["weeklyHours", "Heures/sem. (toutes séances)"],
          ["sessionsPerWeek", SESSION_COUNT_LABELS.sessionsPerWeek], ["strengthSessionsPerWeek", SESSION_COUNT_LABELS.strengthSessionsPerWeek], ["maxSessionsPerDay", SESSION_COUNT_LABELS.maxSessionsPerDay],
          ["age", "Âge"]] as const).map(([k, l]) => (
          <label key={k} className="text-xs space-y-1"><span>{l}</span><Input aria-label={l} value={f[k]} readOnly={props.shared?.[k] !== undefined} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} /></label>
        ))}
        <label className="text-xs space-y-1"><span>Ambition</span>
          <select aria-label="Ambition" className="w-full rounded-md border bg-background p-2" value={f.ambition} onChange={(e) => setF((x) => ({ ...x, ambition: e.target.value }))}>
            <option value="">choisir…</option>{Object.values(AMBITION_DEFINITIONS).map((a) => <option key={a.id} value={a.id}>{a.label} — {a.description}</option>)}
          </select></label>
        <label className="text-xs space-y-1"><span>Niveau d'entraînement</span>
          <select aria-label="Niveau d'entraînement" className="w-full rounded-md border bg-background p-2" value={f.athleteLevel} onChange={(e) => setF((x) => ({ ...x, athleteLevel: e.target.value }))}>
            <option value="">choisir…</option>{Object.entries(ATHLETE_LEVEL_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></label>
        <label className="text-xs space-y-1"><span>Sexe</span>
          <select aria-label="Sexe" className="w-full rounded-md border bg-background p-2" value={f.sex} onChange={(e) => setF((x) => ({ ...x, sex: e.target.value }))}>
            <option value="">non renseigné</option><option value="F">femme</option><option value="M">homme</option>
          </select></label>
      </div>
      <p className="text-sm font-medium">Ancres d'intensité (seulement celles réellement disponibles)</p>
      {(Object.keys(ANCHOR_LABELS) as AnchorKey[]).map((k) => entryRow(ANCHOR_LABELS[k], anchors[k], (d) => setAnchors((x) => ({ ...x, [k]: d })), RANGE_KEYS.has(k) ? "min-max" : "valeur"))}
      {family?.sportFocus === "tri" && <div className="space-y-1" data-testid="swim-domain-paces">
        <p className="text-sm font-medium">Allures natation par domaine (s/100 m) — seulement celles réellement connues</p>
        {SWIM_DOMAINS.map((k) => entryRow(`Natation ${SWIM_DOMAIN_LABELS[k]}`, swim[k], (d) => setSwim((x) => ({ ...x, [k]: d })), "s/100 m"))}
        <label className="flex gap-2 text-xs items-center"><input type="checkbox" checked={cssProxy} onChange={(e) => setCssProxy(e.target.checked)} />J'accepte d'utiliser la CSS comme approximation du seuil natation (sans mesure de seuil dédiée)</label>
      </div>}
      {family && coachBrickIdsFor(family.key).length > 0 && <div className="space-y-1 text-xs" data-testid="brick-approvals">
        <p className="text-sm font-medium">Enchaînements vélo-course validés un par un (transition en minutes, vide = non validé)</p>
        {family.key === "triathlon_ironman" && <p>Composition candidate d’affûtage : {IM_TAPER_BRICK.bikeId} (57 min) puis {IM_TAPER_BRICK.runId} (34 min), transition exacte 5 min ; total 96 min. Les deux sources doivent être revues séparément. Cette confirmation ne constitue ni validation scientifique ni autorisation de prescription.</p>}
        {coachBrickIdsFor(family.key).map((id) => <label key={id} className="flex gap-2 items-center"><span className="w-56">{id}</span>
          <Input aria-label={`transition ${id}`} placeholder="minutes (3–10)" value={bricks[id] ?? ""} onChange={(e) => setBricks((b) => ({ ...b, [id]: e.target.value }))} /></label>)}
      </div>}
      <p className="text-sm font-medium">Physiologie du diagnostic</p>
      {(Object.keys(PHYSIO_LABELS) as PhysioKey[]).map((k) => entryRow(PHYSIO_LABELS[k], physio[k], (d) => setPhysio((x) => ({ ...x, [k]: d })), "valeur"))}
      <label className="flex gap-2 text-xs items-center"><input type="checkbox" checked={strengthOk} onChange={(e) => setStrengthOk(e.target.checked)} />Charges et RPE de force individuellement validés par le coach</label>

      <div className="rounded border p-2 space-y-2 text-xs" data-testid="coach-limiter-order">
        <p className="text-sm font-medium">Priorité des limiteurs</p>
        <p className="text-muted-foreground">Le coach peut réordonner les limiteurs détectés ; il ne peut ni en ajouter ni en retirer. Changer l'ordre rend la revue périmée.</p>
        <Button size="sm" variant="outline" onClick={onDetectLimiters} disabled={busy}>Lire les limiteurs détectés</Button>
        <div className="flex gap-4">
          <label className="flex gap-1 items-center"><input type="radio" name="limiter-mode" checked={limiterMode === "automatic"} onChange={() => setLimiterMode("automatic")} />Ordre automatique (diagnostic)</label>
          <label className="flex gap-1 items-center"><input type="radio" name="limiter-mode" disabled={!detected?.length} checked={limiterMode === "coach"} onChange={() => setLimiterMode("coach")} />Priorité choisie par le coach</label>
        </div>
        {detected && limiterMode === "automatic" && <p>Automatique : {detected.map((m) => LIMITER_LABELS[m] ?? m).join(" > ") || "aucun"}</p>}
        {limiterMode === "coach" && <ol className="space-y-1">{coachOrder.map((m, i) => (
          <li key={m} className="flex items-center gap-2"><span className="w-5">{i + 1}.</span><span className="flex-1">{LIMITER_LABELS[m] ?? m} <span className="text-muted-foreground">({m})</span></span>
            <Button size="sm" variant="ghost" aria-label={`Monter ${m}`} onClick={() => moveLimiter(i, -1)} disabled={i === 0}>↑</Button>
            <Button size="sm" variant="ghost" aria-label={`Descendre ${m}`} onClick={() => moveLimiter(i, 1)} disabled={i === coachOrder.length - 1}>↓</Button></li>))}</ol>}
      </div>

      <p className="text-sm font-medium">Séances du catalogue à qualifier une par une</p>
      <Input aria-label="Rechercher une séance" placeholder="Rechercher par titre, sport ou intention (ex. marathon allure, seuil, force)" value={query} onChange={(e) => setQuery(e.target.value)} />
      {query.trim() && <ul className="text-xs space-y-1" data-testid="source-search-results">{searchSources(query).map((r) => (
        <li key={r.id} className="flex items-center gap-2"><span className="flex-1"><span className="font-medium">{r.title}</span> · {r.sport} · {r.intent} · phases {r.phases.join(", ")} <span className="text-muted-foreground">({r.id})</span></span>
          <Button size="sm" variant="outline" disabled={sources.some((s) => s.id === r.id)} onClick={() => addSource(r.id)}>{sources.some((s) => s.id === r.id) ? "Ajoutée" : "Ajouter"}</Button></li>))}</ul>}
      <label className="flex gap-2 text-xs items-center"><input type="checkbox" checked={showTechnical} onChange={(e) => setShowTechnical(e.target.checked)} />Afficher le volet technique QA (JSON des blocs)</label>
      {sources.map((s, i) => { const sheet = sourceReviewSheet(findSource(s.id)!); return (
        <div key={s.id} className="rounded border p-2 space-y-1 text-xs">
          <p className="font-semibold">{sheet.title} · {SPORT_LABELS[sheet.sport] ?? sheet.sport} · {INTENT_LABELS[findSource(s.id)!.primaryIntent] ?? ""} · phases {sheet.phases.join(", ")} <span className="font-normal text-muted-foreground">({s.id})</span></p>
          <ul className="pl-2">{describeSourceBlocks(sheet.blocks).map((l, k) => <li key={k} className="whitespace-pre">{l}</li>)}</ul>
          {showTechnical && <details><summary>Volet technique QA (JSON)</summary><pre className="whitespace-pre-wrap">{JSON.stringify(sheet.blocks, null, 1)}</pre></details>}
          {sheet.prerequisites.map((p) => <label key={p} className="flex gap-2"><input type="checkbox" checked={!!s.pre[p]} onChange={(e) => upd(i, { pre: { ...s.pre, [p]: e.target.checked } })} />Prérequis : {p}</label>)}
          {sheet.contraindications.map((c) => <label key={c} className="flex gap-2"><input type="checkbox" checked={!!s.contra[c]} onChange={(e) => upd(i, { contra: { ...s.contra, [c]: e.target.checked } })} />Contre-indication écartée : {c}</label>)}
          {[...REQUIRED_EVIDENCE, ...OPTIONAL_EVIDENCE].map((k) => <label key={k} className="flex gap-2"><input type="checkbox" checked={!!s.flags[k]} onChange={(e) => upd(i, { flags: { ...s.flags, [k]: e.target.checked } })} />{EVIDENCE_LABEL[k]}{(REQUIRED_EVIDENCE as readonly string[]).includes(k) ? " (requis)" : ""}</label>)}
          <div className="grid grid-cols-4 gap-1">
            <select aria-label="phase" className="rounded border bg-background p-1" value={s.phase} onChange={(e) => upd(i, { phase: e.target.value })}><option value="">phase…</option>{sheet.phases.map((p) => <option key={p}>{p}</option>)}</select>
            <select aria-label="charge" className="rounded border bg-background p-1" value={s.recentLoad} onChange={(e) => upd(i, { recentLoad: e.target.value })}><option value="">charge récente…</option>{Object.entries(RECENT_LOAD_LABELS).map(([x, l]) => <option key={x} value={x}>{l}</option>)}</select>
            <select aria-label="fatigue" className="rounded border bg-background p-1" value={s.fatigue} onChange={(e) => upd(i, { fatigue: e.target.value })}><option value="">fatigue…</option>{Object.entries(FATIGUE_LABELS).map(([x, l]) => <option key={x} value={x}>{l}</option>)}</select>
            <select aria-label="blessure" className="rounded border bg-background p-1" value={s.injuryScreen} onChange={(e) => upd(i, { injuryScreen: e.target.value })}><option value="">dépistage blessure…</option>{Object.entries(INJURY_LABELS).map(([x, l]) => <option key={x} value={x}>{l}</option>)}</select>
          </div>
          <div className="flex gap-2 items-center">
            <Input aria-label="durée cible approuvée" placeholder="durée cible approuvée (min, optionnel)" value={s.targetDurationMin} onChange={(e) => upd(i, { targetDurationMin: e.target.value })} />
            <label className="flex gap-1"><input type="checkbox" checked={s.allowWorksetChange} onChange={(e) => upd(i, { allowWorksetChange: e.target.checked })} />Changement de séries approuvé</label>
            <label className="flex gap-1"><input type="checkbox" checked={s.prefer} onChange={(e) => upd(i, { prefer: e.target.checked })} />Préférer cette source</label>
            <Button size="sm" variant="ghost" onClick={() => setSources((xs) => xs.filter((_, k) => k !== i))}>Retirer</Button>
          </div>
        </div>); })}

      <p className="text-sm font-medium">Créneaux confirmés (HH:MM, vide = pas de créneau)</p>
      <Input aria-label="Fuseau horaire" placeholder="Fuseau IANA, ex. Europe/Brussels" value={tz} onChange={(e) => setTz(e.target.value)} />
      {Object.entries(clock).map(([sp, row]) => (
        <div key={sp} className="grid grid-cols-8 gap-1 items-center text-xs"><span>{SPORT_LABELS[sp] ?? sp}</span>
          {row.map((x, d) => <Input key={d} aria-label={`${sp} ${DAYS[d]}`} placeholder={DAYS[d]} value={x} onChange={(e) => setClock((c) => ({ ...c, [sp]: c[sp].map((y, k) => (k === d ? e.target.value : y)) }))} />)}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onSaveReview} disabled={busy || props.engine === "ai"}>Enregistrer la revue (nouvelle ligne)</Button>
        <Button variant="secondary" onClick={onGenerate} disabled={busy}>{busy ? "Calcul…" : props.engine === "ai" ? "Générer avec l’IA (entrées partagées)" : "Générer avec DET Engine (entrées coach)"}</Button>
      </div>
      {saved && <p className="text-xs">Revue enregistrée.</p>}
      {msg.length > 0 && <ul className="text-xs list-disc pl-4" data-testid="coach-inputs-messages">{msg.map((m, k) => <li key={k}>{m}</li>)}</ul>}
    </div>
  );
}
