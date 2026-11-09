import {expandCoachBricks} from './coachMultisport.ts';
import {PACE_TARGET_FORMAT} from './paceTarget.ts';
/**
 * Nolio V2 — simulation (dry_run) d'un PLAN COMPLET sauvegardé (QA). DRY-RUN ONLY.
 *
 * - Précontrôle : CHAQUE séance source du plan_json sauvegardé reçoit un statut
 *   (opération / exclusion justifiée = repos / refus). Le dénominateur est le
 *   nombre total de séances source, jamais le sous-ensemble mappé.
 * - Les corps viennent uniquement de `mapPlanToNolioV2` (même mapper que le sender)
 *   sur le plan relu sous RLS ; le client ne fournit que planVersionId + action.
 * - Job figé : empreintes plan + refs + opérations (index, séance, date, kind, path, corps) ;
 *   toute divergence ⇒ BLOCKED (obsolète).
 * - Envoi : seulement via `postDryRun` (origine + routes FERMÉES trainings/competitions,
 *   dry_run:true forcé en dernier, redirect error, budget fetch+corps, aucun retry, aucun
 *   repli vers une création). Les compétitions passent par planned_competitions_create
 *   dont la description OpenAPI documente `dry_run` (pas de batch).
 * - Lot borné, cadence prudente, arrêt au premier 401/403/429/inconnu ou quota bas ; une
 *   opération déjà validée n'est ni refaite ni sautée ; une opération UNKNOWN n'est jamais relancée.
 */
import { mapPlanToNolioV2, type NolioV2Refs, type V2Operation, requiredExerciseLabels, raceIdentityOf } from "./plannedMapper.ts";
import { sessionsFromPlanJson } from "./planSessions.ts";
import {selectExportScope} from './exportScope.ts';
import { expandReviewedMultisport } from "./multisportSplit.ts";
import { bodyToSend, operationKey } from "./marker.ts";
import { canonical, forceDryRun, sha256Hex, DRY_RUN_PATHS, type DryRunCode, type DryRunKind, type DryRunOutcome } from "./dryRun.ts";

export const PLAN_DRY_RUN_ACTIONS = ["precheck", "run"] as const;
export type PlanDryRunAction = typeof PLAN_DRY_RUN_ACTIONS[number];
export const PLAN_DRY_RUN_BATCH = 8;
export const PLAN_DRY_RUN_BATCH_BUDGET_MS = 30_000;
export const PLAN_DRY_RUN_OP_BUDGET_MS = 12_000;
export const PLAN_DRY_RUN_MAX_OPS = 400;
/** Pause serveur entre deux simulations d'un même lot (cadence prudente). */
export const PLAN_DRY_RUN_OP_PAUSE_MS = 300;
/** Sous ce reste horaire annoncé par Nolio (X-RateLimit-Remaining-Hour), le lot s'arrête. */
export const PLAN_DRY_RUN_MIN_QUOTA_LEFT = 50;

export type CoverageRow = {
  sessionKey: string; date: string | null; sport: string; title: string;
  status: "operation" | "excluded_rest" | "refused"; reason: string | null; opIndex: number | null;
};
export type Precheck = {
  totalSessions: number; operations: number; excludedRest: number; refused: number;
  planProblems: string[]; rows: CoverageRow[]; missingExercises: string[]; missingSports: string[];
  competition: "absent_in_plan" | "refused" | "operation";
  /** Identité SOURCE de la course objectif (proposée au coach, jamais confirmée automatiquement). */
  raceSource: { date: string; name: string; sport: string; goalType: null } | null;
  complete: boolean; weeks: number; firstDate: string | null; lastDate: string | null; sports: string[];
  opsByKind: { training: number; competition: number };
};
export type ManifestEntry = { opIndex: number; sessionKey: string; date: string; kind: DryRunKind; path: string; bodySha256: string };
/** body = corps MARQUÉ réellement destiné à la création (même empreinte que le journal d'envoi) ; source = opération nue du mapper. */
export type FrozenOp = ManifestEntry & { body: Record<string, unknown>; source: V2Operation };
export type Prepared = { precheck: Precheck; ops: FrozenOp[]; planSha256: string; refsSha256: string; opsSha256: string };

/** Empreinte des refs SANS jeton : athlète, sports, exercices, compétition, fuseau. */
export function refsDigest(r: NolioV2Refs): Promise<string> {
  return sha256Hex(canonical({ a: r.athleteId, s: r.sportIds, e: r.exerciseIds, c: r.competition, tz: r.calendarTimeZone ?? null }));
}

/** Empreinte des opérations figées — même formule côté serveur et côté client (relecture). */
export function opsDigestLine(o: ManifestEntry): string {
  return `${o.opIndex}|${o.sessionKey}|${o.date}|${o.kind}|${o.path}|${o.bodySha256}`;
}
export function opsDigest(m: ManifestEntry[]): Promise<string> {
  return sha256Hex(m.map(opsDigestLine).join("\n"));
}
export const manifestOf = (ops: FrozenOp[]): ManifestEntry[] =>
  ops.map(({ opIndex, sessionKey, date, kind, path, bodySha256 }) => ({ opIndex, sessionKey, date, kind, path, bodySha256 }));

/**
 * planVersionId lie le marqueur d'origine au corps figé : la simulation valide le corps
 * marqué exact (bodySha256 = payloadSha256 du journal d'envoi), jamais un corps voisin.
 */
export async function preparePlan(planJson: unknown, refs: NolioV2Refs, planVersionId: string,scope?:unknown): Promise<Prepared> {
  const raw = sessionsFromPlanJson(planJson);
  const selected=selectExportScope(raw.sessions,scope);
  const choices=(planJson as Record<string, unknown> | null)?._nolioV2MultisportSplits;
  const fullKeys=new Set(raw.sessions.map(s=>s.sessionKey)),selectedKeys=new Set(selected.sessions.map(s=>s.sessionKey));
  // A selected parent keeps BOTH linked activities. Choices on other real
  // parents do not become unknown-parent errors; genuinely invalid keys do.
  const scopedChoices=scope!==undefined&&choices&&typeof choices==='object'&&!Array.isArray(choices)?Object.fromEntries(Object.entries(choices).filter(([key])=>selectedKeys.has(key)||!fullKeys.has(key))):choices;
  const expanded = await expandReviewedMultisport(selected.sessions, scopedChoices);
  const provenance=(planJson as {_provenance?:{engine?:string;mode?:string;syntheticFixture?:boolean}})?._provenance;
  const auto=provenance?.engine==='det'&&provenance.mode==='app-profile'&&provenance.syntheticFixture===false?await expandCoachBricks(expanded.sessions):{sessions:expanded.sessions,problems:[]};
  const targetFormat = (planJson as Record<string, unknown> | null)?._nolioV2TargetFormat;
  const formatProblems = targetFormat !== undefined && targetFormat !== PACE_TARGET_FORMAT ? ['nolio_target_format_unknown'] : [];
  const ex = { sessions: auto.sessions, problems: [...formatProblems,...auto.problems,...raw.problems,...selected.problems, ...expanded.problems] };
  const options={timedCoachStrength:provenance?.engine==='det'&&provenance.mode==='app-profile'&&provenance.syntheticFixture===false};
  const mappingOptions={...options,declaredCompetitions:options.timedCoachStrength,paceTargets:targetFormat===PACE_TARGET_FORMAT};
  const m = ex.problems.length ? { operations: [], refusals: [] } : mapPlanToNolioV2(ex.sessions, refs,mappingOptions);
  const refusedBy = new Map<string, string>();
  for (const r of m.refusals) refusedBy.set(r.sessionKey, r.reason);
  const opIdx = new Map<string, number>();
  m.operations.forEach((o, i) => opIdx.set(o.sessionKey, i));
  const planProblems = [...ex.problems, ...(refusedBy.has("*") ? [`global:${refusedBy.get("*")}`] : [])];
  const rows: CoverageRow[] = ex.sessions.map((s) => {
    const base = { sessionKey: s.sessionKey, date: s.date ?? null, sport: s.sport, title: s.title };
    if (s.isRest) return { ...base, status: "excluded_rest", reason: "repos_sans_contenu", opIndex: null };
    const i = opIdx.get(s.sessionKey);
    const op = i === undefined ? null : m.operations[i];
    if (op) return { ...base, status: "operation", reason: null, opIndex: i! };
    return { ...base, status: "refused", reason: refusedBy.get(s.sessionKey) ?? refusedBy.get("*") ?? "not_mapped", opIndex: null };
  });
  const ops: FrozenOp[] = [];
  for (const r of rows) {
    if (r.status !== "operation") continue;
    const op = m.operations[r.opIndex!];
    const kind: DryRunKind = op.kind;
    if (DRY_RUN_PATHS[kind] !== op.path) { r.status = "refused"; r.reason = "operation_path_not_allowed"; r.opIndex = null; continue; }
    const marked = await bodyToSend(planVersionId, op);
    ops.push({ opIndex: ops.length, sessionKey: r.sessionKey, date: String(op.body.date_start), kind, path: op.path, bodySha256: (await operationKey(planVersionId, op)).payloadSha256, body: marked, source: op });
    r.opIndex = ops.length - 1;
  }
  const missingExercises = requiredExerciseLabels(ex.sessions,options).filter((l) => !refs.exerciseIds[l]);
  const missingSports = [...new Set(ex.sessions.filter((s) => !s.isRest && (s.catalogId || raceIdentityOf(s)) && !refs.sportIds[s.sport]).map((s) => s.sport))];
  const races = ex.sessions.map(raceIdentityOf).filter((x): x is NonNullable<typeof x> => !!x);
  const raceKeys = new Set(races.map((r) => r.sessionKey));
  const race = rows.filter((r) => raceKeys.has(r.sessionKey));
  const refused = rows.filter((r) => r.status === "refused").length;
  const excludedRest = rows.filter((r) => r.status === "excluded_rest").length;
  const dates = rows.map((r) => r.date).filter((d): d is string => !!d).sort();
  const weeks = new Set(selected.sessions.map(s=>/^S(\d+)-/.exec(s.sessionKey)?.[1]).filter(Boolean)).size;
  const precheck: Precheck = {
    totalSessions: rows.length, operations: ops.length, excludedRest, refused,
    planProblems, rows, missingExercises, missingSports,
    competition: race.length === 0 ? "absent_in_plan" : race.every((r) => r.status === "operation") ? "operation" : "refused",
    raceSource: races.length === 1 ? { date: races[0].date, name: races[0].name, sport: races[0].sport, goalType: null } : null,
    complete: rows.length > 0 && refused === 0 && planProblems.length === 0 && ops.length > 0 && ops.length <= PLAN_DRY_RUN_MAX_OPS
      && ops.length + excludedRest === rows.length,
    weeks, firstDate: dates[0] ?? null, lastDate: dates.at(-1) ?? null, sports: [...new Set(rows.map((r) => r.sport))].sort(),
    opsByKind: { training: ops.filter((o) => o.kind === "training").length, competition: ops.filter((o) => o.kind === "competition").length },
  };
  return {
    precheck, ops,
    planSha256: await sha256Hex(canonical(planJson)), refsSha256: await refsDigest(refs),
    opsSha256: await opsDigest(manifestOf(ops)),
  };
}

export type JobRow = { id: string; plan_sha256: string; refs_sha256: string; ops_sha256: string; total_ops: number };
export type OpReceipt = { op_index: number; body_sha256: string; outcome: DryRunOutcome; code: string };
export interface PlanDryRunStore {
  /** INSERT … ON CONFLICT (coach, plan_version, refs, ops) DO NOTHING + relecture. */
  freezeJob(p: { planSha256: string; refsSha256: string; opsSha256: string; totalSessions: number; totalOps: number }): Promise<JobRow>;
  /** Bail SQL exclusif (lock_id, lease). false ⇒ un autre lot tourne : aucun appel. */
  lease(jobId: string, lockId: string, seconds: number): Promise<boolean>;
  release(jobId: string, lockId: string): Promise<void>;
  receipts(jobId: string): Promise<OpReceipt[]>;
  insertReceipt(r: { job_id: string; op_index: number; session_key: string; session_date: string; body_sha256: string; outcome: DryRunOutcome; code: string; http_status: number | null }): Promise<boolean>;
}
export type PostDry = (kind: DryRunKind, body: Record<string, unknown>, budgetMs: number) =>
  Promise<{ outcome: DryRunOutcome; code: DryRunCode; httpStatus: number | null; quotaRemainingHour?: number | null }>;

export type JobProgress = {
  jobId: string; totalOps: number; valid: number; refused: number; unknown: number; pending: number;
  stoppedOn: string | null; processedThisBatch: number; fullyValidated: boolean;
};

/** Progression dérivée des seuls reçus concordants (même op_index ET même empreinte de corps). */
export function progressOf(job: JobRow, ops: FrozenOp[], rec: OpReceipt[]): Omit<JobProgress, "stoppedOn" | "processedThisBatch"> {
  let valid = 0, refused = 0, unknown = 0;
  for (const o of ops) {
    const mine = rec.filter((r) => r.op_index === o.opIndex && r.body_sha256 === o.bodySha256);
    if (mine.some((r) => r.outcome === "DRY_RUN_VALID" && r.code === "dry_run_valid")) valid++;
    else if (mine.some((r) => r.outcome === "UNKNOWN")) unknown++;
    else if (mine.some((r) => r.outcome === "REFUSED" && r.code !== "rate_limited_429")) refused++;
  }
  const pending = ops.length - valid - refused - unknown;
  return { jobId: job.id, totalOps: ops.length, valid, refused, unknown, pending, fullyValidated: ops.length > 0 && valid === ops.length && ops.length === job.total_ops };
}

export async function runPlanDryRunBatch(a: {
  prepared: Prepared; store: PlanDryRunStore; post: PostDry; lockId: string; now: () => number;
  batch?: number; batchBudgetMs?: number; opBudgetMs?: number; pauseMs?: number; sleep?: (ms: number) => Promise<void>;
}): Promise<{ status: "BLOCKED" | "BUSY" | "PROGRESS"; code: string; progress: JobProgress | null }> {
  const p = a.prepared;
  if (!p.precheck.complete) return { status: "BLOCKED", code: "precheck_incomplete", progress: null };
  const job = await a.store.freezeJob({ planSha256: p.planSha256, refsSha256: p.refsSha256, opsSha256: p.opsSha256, totalSessions: p.precheck.totalSessions, totalOps: p.ops.length });
  if (job.plan_sha256 !== p.planSha256 || job.refs_sha256 !== p.refsSha256 || job.ops_sha256 !== p.opsSha256 || job.total_ops !== p.ops.length)
    return { status: "BLOCKED", code: "job_stale", progress: null };
  const budget = a.batchBudgetMs ?? PLAN_DRY_RUN_BATCH_BUDGET_MS;
  const sleep = a.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  if (!(await a.store.lease(job.id, a.lockId, Math.ceil(budget / 1000) + 20))) return { status: "BUSY", code: "batch_in_progress", progress: null };
  const t0 = a.now();
  let processed = 0, stoppedOn: string | null = null;
  try {
    const rec = await a.store.receipts(job.id);
    const before = progressOf(job, p.ops, rec);
    if (before.unknown > 0) stoppedOn = "unknown_present_no_retry";
    else if (before.refused > 0) stoppedOn = "refused_present";
    else for (const o of p.ops) {
      const mine = rec.filter((r) => r.op_index === o.opIndex && r.body_sha256 === o.bodySha256);
      if (mine.some((r) => r.outcome === "DRY_RUN_VALID")) continue; // jamais refaite
      if (processed >= (a.batch ?? PLAN_DRY_RUN_BATCH)) { stoppedOn = "batch_limit"; break; }
      const opBudget = a.opBudgetMs ?? PLAN_DRY_RUN_OP_BUDGET_MS;
      const pause = processed > 0 ? (a.pauseMs ?? PLAN_DRY_RUN_OP_PAUSE_MS) : 0;
      if (budget - (a.now() - t0) < opBudget + pause) { stoppedOn = "batch_budget"; break; }
      if (pause) await sleep(pause);
      const r = await a.post(o.kind, forceDryRun(o.body), opBudget);
      processed++;
      const ok = await a.store.insertReceipt({ job_id: job.id, op_index: o.opIndex, session_key: o.sessionKey, session_date: o.date, body_sha256: o.bodySha256, outcome: r.outcome, code: r.code, http_status: r.httpStatus });
      if (!ok) { stoppedOn = "receipt_write_failed"; break; }
      rec.push({ op_index: o.opIndex, body_sha256: o.bodySha256, outcome: r.outcome, code: r.code });
      if (r.outcome !== "DRY_RUN_VALID") { stoppedOn = r.code; break; }
      if (typeof r.quotaRemainingHour === "number" && r.quotaRemainingHour < PLAN_DRY_RUN_MIN_QUOTA_LEFT) { stoppedOn = "quota_low_stop"; break; }
    }
    const pr = progressOf(job, p.ops, await a.store.receipts(job.id));
    return { status: "PROGRESS", code: stoppedOn ?? (pr.fullyValidated ? "complete" : "partial"), progress: { ...pr, stoppedOn, processedThisBatch: processed } };
  } finally { await a.store.release(job.id, a.lockId).catch(() => undefined); }
}
